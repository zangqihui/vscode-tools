const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/** Cache: filePath -> Map<className, line> */
const cssClassCache = new Map();
/** Cache: ftl file path -> list of <#include> target paths */
const includeCache = new Map();

function activate(context) {
  const selector = [
    { scheme: 'file', language: 'freemarker' },
    { scheme: 'file', language: 'html' },
    { scheme: 'file', pattern: '**/*.ftl' }
  ];

  // --- DocumentLinkProvider: static/ paths and <#include> ---
  context.subscriptions.push(vscode.languages.registerDocumentLinkProvider(selector, {
    provideDocumentLinks(document) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return [];

      const links = [];
      const text = document.getText();
      const docDir = vscode.Uri.joinPath(document.uri, '..');

      // href="static/..." / src="static/..."
      const staticRegex = /(?:href|src)\s*=\s*["']([^"'${}]*?static\/[^"'${}]+)["']/gi;
      let match;
      while ((match = staticRegex.exec(text)) !== null) {
        const ref = match[1];
        const targetUri = vscode.Uri.joinPath(workspaceFolder.uri, ref.replace(/^\//, ''));
        const startOffset = match.index + match[0].indexOf(ref);
        links.push(makeLink(document, startOffset, ref.length, targetUri));
      }

      // <#include "path/to/file.ftl" />
      const includeRegex = /<#include\s+["']([^"'${}]+)["']/gi;
      while ((match = includeRegex.exec(text)) !== null) {
        const ref = match[1];
        const targetUri = vscode.Uri.joinPath(docDir, ref);
        const startOffset = match.index + match[0].indexOf(ref);
        links.push(makeLink(document, startOffset, ref.length, targetUri));
      }

      return links;
    }
  }));

  // --- DefinitionProvider: CSS class name -> definition ---
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, {
    provideDefinition(document, position) {
      const className = getClassNameAtPosition(document, position);
      if (!className) return null;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return null;

      // 1. Current file inline <style>
      const inlineResult = findInInlineStyles(document, className);
      if (inlineResult) return inlineResult;

      // 2. Current file <link> CSS
      const cssResult = findInLinkedCss(document, workspaceFolder, className);
      if (cssResult) return cssResult;

      // 3. Walk up include chain to find entry file, search there
      const entryResult = findInEntryFile(document, workspaceFolder, className);
      if (entryResult) return entryResult;

      return null;
    }
  }));

  // --- HoverProvider: show CSS preview on class name hover ---
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, {
    provideHover(document, position) {
      const className = getClassNameAtPosition(document, position);
      if (!className) return null;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return null;

      // 1. Inline <style>
      const inlineHover = getInlineStyleHover(document, className);
      if (inlineHover) return inlineHover;

      // 2. External CSS
      const cssHover = getLinkedCssHover(document, workspaceFolder, className);
      if (cssHover) return cssHover;

      // 3. Entry file
      const entryHover = getEntryFileHover(document, workspaceFolder, className);
      if (entryHover) return entryHover;

      return null;
    }
  }));

  // Clear caches on file changes
  const cssWatcher = vscode.workspace.createFileSystemWatcher('**/*.css');
  cssWatcher.onDidChange(uri => cssClassCache.delete(uri.fsPath));
  cssWatcher.onDidDelete(uri => cssClassCache.delete(uri.fsPath));
  context.subscriptions.push(cssWatcher);

  const ftlWatcher = vscode.workspace.createFileSystemWatcher('**/*.ftl');
  ftlWatcher.onDidChange(() => { cssClassCache.clear(); includeCache.clear(); });
  ftlWatcher.onDidDelete(() => { cssClassCache.clear(); includeCache.clear(); });
  context.subscriptions.push(ftlWatcher);
}

function deactivate() {}

// ============ Core: Find CSS in entry file chain ============

function findInEntryFile(document, workspaceFolder, className) {
  const entries = findEntryFiles(document, workspaceFolder);
  for (const entryUri of entries) {
    const entryDoc = getDocumentFromUri(entryUri);
    if (entryDoc) {
      const inlineResult = findInInlineStyles(entryDoc, className);
      if (inlineResult) return inlineResult;
      const cssResult = findInLinkedCss(entryDoc, workspaceFolder, className);
      if (cssResult) return cssResult;
    }
  }
  return null;
}

function getEntryFileHover(document, workspaceFolder, className) {
  const entries = findEntryFiles(document, workspaceFolder);
  for (const entryUri of entries) {
    const entryDoc = getDocumentFromUri(entryUri);
    if (entryDoc) {
      const inlineHover = getInlineStyleHover(entryDoc, className);
      if (inlineHover) return inlineHover;
      const cssHover = getLinkedCssHover(entryDoc, workspaceFolder, className);
      if (cssHover) return cssHover;
    }
  }
  return null;
}

function findEntryFiles(document, workspaceFolder) {
  const currentPath = document.uri.fsPath;
  const templatesRoot = path.join(workspaceFolder.uri.fsPath, 'templates');
  const allFtlFiles = findAllFtlFiles(templatesRoot);
  if (!allFtlFiles.length) return [];

  const directParents = [];
  for (const ftlPath of allFtlFiles) {
    if (ftlPath === currentPath) continue;
    const includes = getIncludedPaths(ftlPath);
    for (const incPath of includes) {
      if (path.resolve(path.dirname(ftlPath), incPath) === currentPath) {
        directParents.push(ftlPath);
        break;
      }
    }
  }

  if (directParents.length === 0) return [];

  const entries = [];
  for (const parentPath of directParents) {
    const parentIsIncluded = allFtlFiles.some(other => {
      if (other === parentPath) return false;
      const incs = getIncludedPaths(other);
      return incs.some(inc => path.resolve(path.dirname(other), inc) === parentPath);
    });

    if (!parentIsIncluded) {
      entries.push(vscode.Uri.file(parentPath));
    } else {
      const parentDoc = getDocumentFromUri(vscode.Uri.file(parentPath));
      if (parentDoc) {
        entries.push(...findEntryFiles(parentDoc, workspaceFolder));
      }
    }
  }

  return entries;
}

function findAllFtlFiles(dir) {
  const results = [];
  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.ftl')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

function getIncludedPaths(ftlPath) {
  if (includeCache.has(ftlPath)) return includeCache.get(ftlPath);

  const lines = readLines(ftlPath);
  const targets = [];
  if (lines) {
    for (const line of lines) {
      const m = line.match(/<#include\s+["']([^"'${}]+)["']/);
      if (m) targets.push(m[1]);
    }
  }
  includeCache.set(ftlPath, targets);
  return targets;
}

function getDocumentFromUri(uri) {
  for (const doc of vscode.workspace.textDocuments) {
    if (doc.uri.fsPath === uri.fsPath) return doc;
  }
  const lines = readLines(uri.fsPath);
  if (!lines) return null;
  return {
    uri,
    getText: () => lines.join('\n'),
    lineAt: (line) => ({ text: lines[line] || '' }),
    positionAt: (offset) => {
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        if (pos + lines[i].length >= offset) return { line: i, character: offset - pos };
        pos += lines[i].length + 1;
      }
      return { line: lines.length - 1, character: 0 };
    }
  };
}

// ============ CSS Search Helpers ============

function findInInlineStyles(document, className) {
  const text = document.getText();
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(text)) !== null) {
    const styleContent = match[1];
    const styleStartOffset = match.index + match[0].indexOf(styleContent);
    const styleStartLine = document.positionAt(styleStartOffset).line;
    const cssLines = styleContent.split('\n');
    for (let i = 0; i < cssLines.length; i++) {
      if (matchClassSelector(cssLines[i], className)) {
        return new vscode.Location(document.uri, new vscode.Position(styleStartLine + i, 0));
      }
    }
  }
  return null;
}

function getInlineStyleHover(document, className) {
  const text = document.getText();
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleRegex.exec(text)) !== null) {
    const cssLines = match[1].split('\n');
    for (let i = 0; i < cssLines.length; i++) {
      if (matchClassSelector(cssLines[i], className)) {
        const preview = cssLines.slice(i, Math.min(i + 8, cssLines.length)).join('\n');
        const shortPath = vscode.workspace.asRelativePath(document.uri);
        return new vscode.MarkdownString(`**.${className}** \`${shortPath}\` (inline)\n\`\`\`css\n${preview}\n\`\`\``);
      }
    }
  }
  return null;
}

function findInLinkedCss(document, workspaceFolder, className) {
  const cssPaths = extractLinkedCssPaths(document, workspaceFolder);
  for (const cssPath of cssPaths) {
    const classMap = parseCssClasses(cssPath);
    if (classMap && classMap.has(className)) {
      return new vscode.Location(vscode.Uri.file(cssPath), new vscode.Position(classMap.get(className), 0));
    }
  }
  return null;
}

function getLinkedCssHover(document, workspaceFolder, className) {
  const cssPaths = extractLinkedCssPaths(document, workspaceFolder);
  for (const cssPath of cssPaths) {
    const classMap = parseCssClasses(cssPath);
    if (classMap && classMap.has(className)) {
      const line = classMap.get(className);
      const lines = readLines(cssPath);
      if (!lines) continue;
      const preview = lines.slice(line, Math.min(line + 8, lines.length)).join('\n');
      const shortPath = vscode.workspace.asRelativePath(cssPath);
      return new vscode.MarkdownString(`**.${className}** \`${shortPath}:${line + 1}\`\n\`\`\`css\n${preview}\n\`\`\``);
    }
  }
  return null;
}

// ============ Shared Helpers ============

function makeLink(document, startOffset, length, targetUri) {
  const startPos = document.positionAt(startOffset);
  const endPos = document.positionAt(startOffset + length);
  const link = new vscode.DocumentLink(new vscode.Range(startPos, endPos), targetUri);
  link.tooltip = targetUri.fsPath;
  return link;
}

function getClassNameAtPosition(document, position) {
  const lineText = document.lineAt(position.line).text;
  const offset = position.character;
  const attrRegex = /(?:class|className)\s*=\s*["']([^"']*)["']/gi;
  let match;
  while ((match = attrRegex.exec(lineText)) !== null) {
    const valueStart = match.index + match[0].indexOf(match[1]);
    const valueEnd = valueStart + match[1].length;
    if (offset >= valueStart && offset <= valueEnd) {
      const relativeOffset = offset - valueStart;
      let pos = 0;
      for (const cls of match[1].split(/\s+/)) {
        if (relativeOffset >= pos && relativeOffset <= pos + cls.length && cls.length > 0) return cls;
        pos += cls.length + 1;
      }
    }
  }
  return null;
}

function matchClassSelector(line, className) {
  const classRegex = new RegExp(`\\.${className}(?=[{,:>\\s+~\\[.#]|$)`);
  if (!classRegex.test(line)) return false;
  const dotIndex = line.indexOf(`.${className}`);
  const before = line.substring(0, dotIndex).trim();
  return before === '' || before.endsWith(',') || before.endsWith('{') || /[>~+\s]/.test(before) || before.endsWith('::');
}

function extractLinkedCssPaths(document, workspaceFolder) {
  const text = document.getText();
  const docDir = vscode.Uri.joinPath(document.uri, '..').fsPath;
  const paths = [];
  const linkRegex = /<link[^>]+href\s*=\s*["']([^"'${}]+\.css)["']/gi;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const href = match[1];
    if (href.startsWith('static/') || href.startsWith('/static/')) {
      paths.push(vscode.Uri.joinPath(workspaceFolder.uri, href.replace(/^\//, '')).fsPath);
    } else {
      paths.push(path.resolve(docDir, href));
    }
  }
  return paths;
}

function parseCssClasses(cssPath) {
  if (cssClassCache.has(cssPath)) return cssClassCache.get(cssPath);
  const lines = readLines(cssPath);
  if (!lines) return null;
  const classMap = new Map();
  for (let i = 0; i < lines.length; i++) {
    const classRegex = /\.([a-zA-Z_][\w-]*)/g;
    let m;
    while ((m = classRegex.exec(lines[i])) !== null) {
      if (matchClassSelector(lines[i], m[1]) && !classMap.has(m[1])) {
        classMap.set(m[1], i);
      }
    }
  }
  cssClassCache.set(cssPath, classMap);
  return classMap;
}

function readLines(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8').split('\n'); } catch (e) { return null; }
}

module.exports = { activate, deactivate };
