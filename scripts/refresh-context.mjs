#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import config from './context/config.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ISO_NOW = new Date().toISOString();

const EXCLUDED_DIR_SEGMENTS = new Set([
  '.git',
  '.idea',
  '.vscode',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.cache',
  '.vite',
  'coverage',
  'docs/chunks'
]);

const EXCLUDED_FILE_PATTERNS = [
  /\.lock$/i,
  /\.log$/i,
  /\.sqlite$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.gif$/i,
  /\.ico$/i,
  /\.zip$/i,
  /\.tar$/i,
  /\.tgz$/i,
  /\.woff2?$/i
];

const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB

function loadTypeScript() {
  try {
    return require('typescript');
  } catch {
    const backendTsPath = path.join(ROOT, 'backend', 'node_modules', 'typescript');
    return require(backendTsPath);
  }
}

const ts = loadTypeScript();
const canHaveModifiers =
  typeof ts.canHaveModifiers === 'function'
    ? ts.canHaveModifiers
    : (node) => Object.prototype.hasOwnProperty.call(node, 'modifiers');
const getModifiers =
  typeof ts.getModifiers === 'function' ? ts.getModifiers : (node) => node.modifiers ?? [];
const canHaveDecorators =
  typeof ts.canHaveDecorators === 'function'
    ? ts.canHaveDecorators
    : (node) => Object.prototype.hasOwnProperty.call(node, 'decorators');
const getDecorators =
  typeof ts.getDecorators === 'function'
    ? (node) => ts.getDecorators(node) ?? []
    : (node) => node.decorators ?? [];

async function pathExists(targetPath) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function shouldSkipDir(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return normalized
    .split('/')
    .some((segment, index, arr) => EXCLUDED_DIR_SEGMENTS.has(segment) || EXCLUDED_DIR_SEGMENTS.has(arr.slice(0, index + 1).join('/')));
}

function shouldSkipFile(relPath) {
  if (relPath.startsWith('docs/chunks')) {
    return true;
  }
  if (/\.env/i.test(relPath) && !relPath.endsWith('.env.example')) {
    return true;
  }
  return EXCLUDED_FILE_PATTERNS.some((regex) => regex.test(relPath));
}

async function walkFiles(startDir) {
  const pending = [startDir];
  const files = [];

  while (pending.length > 0) {
    const dir = pending.pop();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (!shouldSkipDir(rel)) {
          pending.push(abs);
        }
        continue;
      }
      if (shouldSkipFile(rel)) {
        continue;
      }
      files.push({ rel, abs });
    }
  }

  return files.sort((a, b) => a.rel.localeCompare(b.rel));
}

function detectLanguage(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  switch (ext) {
    case '.ts':
    case '.cts':
    case '.mts':
      return 'ts';
    case '.tsx':
      return 'tsx';
    case '.js':
    case '.cjs':
    case '.mjs':
      return 'js';
    case '.jsx':
      return 'jsx';
    case '.json':
      return 'json';
    case '.md':
      return 'md';
    case '.yml':
    case '.yaml':
      return 'yaml';
    case '.sh':
      return 'sh';
    case '.toml':
      return 'toml';
    case '.css':
      return 'css';
    default:
      return 'text';
  }
}

function inferModule(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.startsWith('backend/src/modules/')) {
    const [, , , moduleName] = normalized.split('/');
    return `backend:${moduleName}`;
  }
  if (normalized.startsWith('backend/src/')) {
    const [, , segment] = normalized.split('/');
    return `backend:${segment ?? 'root'}`;
  }
  if (normalized.startsWith('frontend/src/')) {
    const [, , segment] = normalized.split('/');
    return `frontend:${segment ?? 'root'}`;
  }
  if (normalized.startsWith('scripts/')) {
    return 'scripts';
  }
  if (normalized.startsWith('docs/')) {
    return 'docs';
  }
  return 'root';
}

function inferTags(relPath, language) {
  const tags = new Set();
  const normalized = relPath.replace(/\\/g, '/');
  if (normalized.includes('/modules/')) {
    tags.add('api');
  }
  if (normalized.includes('/prisma') || normalized.includes('schema.prisma')) {
    tags.add('db');
  }
  if (normalized.includes('/components/') || normalized.endsWith('.tsx')) {
    tags.add('ui');
  }
  if (normalized.includes('/utils/') || normalized.includes('/common/')) {
    tags.add('util');
  }
  if (normalized.includes('/config/') || normalized.includes('.env')) {
    tags.add('config');
  }
  if (normalized.startsWith('scripts/')) {
    tags.add('script');
  }
  if (language === 'md') {
    tags.add('doc');
  }
  return Array.from(tags).sort();
}

function inferPurpose(relPath) {
  const basename = path.basename(relPath);
  if (basename.endsWith('.controller.ts')) {
    return 'NestJS controller exposing HTTP routes.';
  }
  if (basename.endsWith('.service.ts')) {
    return 'Business logic service consumed by controllers.';
  }
  if (basename.endsWith('.module.ts')) {
    return 'NestJS module wiring providers/controllers.';
  }
  if (basename.includes('.dto.')) {
    return 'DTO or schema definition for request/response validation.';
  }
  if (relPath.includes('frontend/src/components')) {
    return 'React component used in the UI.';
  }
  if (relPath.includes('frontend/src/pages')) {
    return 'Page-level React component tied to routing.';
  }
  if (relPath.includes('/api/')) {
    return 'API client or hook implementation.';
  }
  if (relPath.includes('/prisma/')) {
    return 'Prisma schema/service for DB access.';
  }
  if (relPath.startsWith('docs/')) {
    return 'Documentation artifact.';
  }
  if (relPath.startsWith('scripts/')) {
    return 'Repository helper script.';
  }
  return 'Source file.';
}

function extractImports(content) {
  const matches = content.matchAll(/import\s+[^'"]*['"]([^'"]+)['"]/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1]))).sort();
}

function extractExports(content) {
  const exports = new Set();
  const regex = /export\s+(?:class|function|interface|type|enum|const|let|var)\s+([A-Za-z0-9_]+)/g;
  for (const match of content.matchAll(regex)) {
    exports.add(match[1]);
  }
  const namedRegex = /export\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(namedRegex)) {
    match[1]
      .split(',')
      .map((token) => token.trim().split(/\s+as\s+/)[0])
      .filter(Boolean)
      .forEach((token) => exports.add(token));
  }
  return Array.from(exports).sort();
}

async function readFileInfo(file) {
  const stat = await fs.stat(file.abs);
  const language = detectLanguage(file.rel);
  const module = inferModule(file.rel);
  const tags = inferTags(file.rel, language);
  const purpose = inferPurpose(file.rel);
  if (stat.size > LARGE_FILE_THRESHOLD) {
    return {
      path: file.rel,
      language,
      lines: 0,
      bytes: stat.size,
      module,
      exports: [],
      imports: [],
      purpose: 'Large asset placeholder (excluded from context)',
      tags
    };
  }
  let content = '';
  let lines = 0;
  let exports = [];
  let imports = [];
  if (language !== 'text' && language !== 'sh') {
    content = await fs.readFile(file.abs, 'utf8');
    lines = content.split(/\r?\n/).length;
    if (content.length <= LARGE_FILE_THRESHOLD) {
      exports = extractExports(content);
      imports = extractImports(content);
    }
  } else {
    const buffer = await fs.readFile(file.abs);
    lines = buffer.toString('utf8').split(/\r?\n/).length;
  }

  return {
    path: file.rel,
    language,
    lines,
    bytes: stat.size,
    module,
    exports,
    imports,
    purpose,
    tags
  };
}

async function generateFileManifest() {
  const files = await walkFiles(ROOT);
  const entries = [];
  for (const file of files) {
    entries.push(await readFileInfo(file));
  }
  return {
    generated_at: ISO_NOW,
    files: entries
  };
}

function collectModuleFiles(manifest, basePath) {
  return manifest.files.filter((entry) => entry.path.startsWith(basePath));
}

function buildKeyFileLines(files) {
  const important = files.filter((file) =>
    /\.(controller|service|module|dto|page|component)\.tsx?$/.test(file.path)
  );
  const fallback = important.length > 0 ? important : files.slice(0, 5);
  const top = fallback.slice(0, 5);
  return top.map((entry) => `- \`${entry.path}\` — ${entry.purpose}`);
}

function buildImportantTypes(files) {
  const types = new Set();
  files.forEach((file) => {
    file.exports.forEach((exp) => types.add(exp));
  });
  return Array.from(types).slice(0, 10).map((name) => `- \`${name}\``);
}

async function writeModuleSummary(manifest) {
  const lines = [
    '# Module Summary',
    '',
    `Generated: ${ISO_NOW}`,
    '',
    'Each section summarizes responsibilities, key artifacts, and guardrails for extending the module.'
  ];

  for (const section of config.moduleSections) {
    lines.push('', `## ${section.group}`);
    for (const module of section.modules) {
      const moduleFiles = collectModuleFiles(manifest, module.path);
      lines.push('', `### ${module.title}`);
      lines.push('', `**Path**: \`${module.path}\``, '');
      lines.push('**What it does**');
      (module.what ?? ['No description provided.']).forEach((line) => lines.push(`- ${line}`));
      const keyFileLines = buildKeyFileLines(moduleFiles);
      lines.push('', '**Key files**');
      (keyFileLines.length > 0 ? keyFileLines : ['- (no tracked files matched filter)']).forEach((line) =>
        lines.push(line)
      );
      const importantTypes = buildImportantTypes(moduleFiles);
      lines.push('', '**Important types/functions**');
      (importantTypes.length > 0 ? importantTypes : ['- (no exports detected)']).forEach((line) =>
        lines.push(line)
      );
      lines.push('', '**Invariants & contracts**');
      (module.invariants ?? ['- Keep DTO + Zod schemas authoritative.']).forEach((line) =>
        lines.push(line.startsWith('-') ? line : `- ${line}`)
      );
      lines.push('', '**Failure modes**');
      (module.failureModes ?? ['- Not documented']).forEach((line) =>
        lines.push(line.startsWith('-') ? line : `- ${line}`)
      );
      lines.push('', '**How to extend / pitfalls**');
      (module.extend ?? ['- Update tests + DTOs when changing API contracts.']).forEach((line) =>
        lines.push(line.startsWith('-') ? line : `- ${line}`)
      );
    }
  }

  await fs.mkdir(path.join(ROOT, 'docs'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'docs', 'MODULE_SUMMARY.md'), lines.join('\n') + '\n', 'utf8');
}

function getDecoratorName(expression) {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)) {
    return expression.expression.text;
  }
  return undefined;
}

function getDecoratorArguments(expression) {
  if (ts.isCallExpression(expression)) {
    return expression.arguments;
  }
  return [];
}

function readStringLiteral(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const pathProp = node.properties.find(
      (prop) => ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'path'
    );
    if (pathProp && ts.isPropertyAssignment(pathProp) && ts.isStringLiteral(pathProp.initializer)) {
      return pathProp.initializer.text;
    }
  }
  return '';
}

function formatRoutePath(base, sub) {
  const parts = [];
  if (base) {
    parts.push(base);
  }
  if (sub) {
    parts.push(sub);
  }
  const normalized = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `/${normalized}`;
}

function extractControllerRoutes(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const routes = [];

  function visit(node) {
    if (ts.isClassDeclaration(node) && canHaveDecorators(node)) {
      const decorators = getDecorators(node) ?? [];
      const controllerDecorator = decorators.find((decorator) => {
        const name = getDecoratorName(decorator.expression);
        return name === 'Controller';
      });
      if (controllerDecorator) {
        const args = getDecoratorArguments(controllerDecorator.expression);
        const basePath = args.length > 0 ? readStringLiteral(args[0]) : '';
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) && canHaveDecorators(member)) {
            const methodDecorators = getDecorators(member) ?? [];
            methodDecorators.forEach((decorator) => {
              const decoName = getDecoratorName(decorator.expression);
              if (!decoName) {
                return;
              }
              const httpMethod = ['Get', 'Post', 'Put', 'Patch', 'Delete'].find(
                (method) => method === decoName
              );
              if (!httpMethod) {
                return;
              }
              const args = getDecoratorArguments(decorator.expression);
              const subPath = args.length > 0 ? readStringLiteral(args[0]) : '';
              const routePath = formatRoutePath(basePath, subPath);
              const params = member.parameters.map((param) => {
                const paramDecorator = param.decorators?.[0];
                const paramDecoratorName = paramDecorator
                  ? getDecoratorName(paramDecorator.expression)
                  : undefined;
                const typeText = param.type ? param.type.getText(sourceFile) : 'unknown';
                const paramName = ts.isIdentifier(param.name) ? param.name.text : param.name.getText(sourceFile);
                if (paramDecoratorName) {
                  return `${paramDecoratorName}: ${typeText}`;
                }
                return `${paramName}: ${typeText}`;
              });
              const returnType = member.type ? member.type.getText(sourceFile) : 'unknown';
              routes.push({
                method: httpMethod.toUpperCase(),
                path: routePath,
                handler: member.name.getText(sourceFile),
                request: params.length > 0 ? params.join(', ') : '—',
                response: returnType,
                file: filePath
              });
            });
          }
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

function isPublicMethod(member) {
  const modifiers = member.modifiers ?? [];
  return !modifiers.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword || modifier.kind === ts.SyntaxKind.ProtectedKeyword
  );
}

function extractServiceSignatures(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const services = [];

  function visit(node) {
    if (ts.isClassDeclaration(node)) {
      const isService = node.name?.text.endsWith('Service');
      if (isService) {
        const methods = [];
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) && isPublicMethod(member) && member.name) {
            const start = member.getStart(sourceFile);
            const end = member.body ? member.body.getStart() : member.getEnd();
            const raw = sourceText.slice(start, end);
            const signature = raw.replace(/\s+/g, ' ').trim();
            methods.push(signature);
          }
        });
        services.push({
          name: node.name?.text ?? 'UnknownService',
          methods,
          file: filePath
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return services;
}

async function generateApiSurface(manifest) {
  const controllerEntries = manifest.files.filter((file) => file.path.endsWith('.controller.ts'));
  const routes = [];
  for (const entry of controllerEntries) {
    const abs = path.join(ROOT, entry.path);
    const sourceText = await fs.readFile(abs, 'utf8');
    routes.push(...extractControllerRoutes(sourceText, entry.path));
  }

  routes.sort((a, b) => {
    if (a.path === b.path) {
      return a.method.localeCompare(b.method);
    }
    return a.path.localeCompare(b.path);
  });

  const serviceEntries = manifest.files.filter(
    (file) => file.path.endsWith('.service.ts') && !file.path.includes('.spec.')
  );
  const services = [];
  for (const entry of serviceEntries) {
    const abs = path.join(ROOT, entry.path);
    const sourceText = await fs.readFile(abs, 'utf8');
    services.push(...extractServiceSignatures(sourceText, entry.path));
  }

  services.sort((a, b) => a.name.localeCompare(b.name));

  const prismaSchemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
  const prismaSchema = await fs.readFile(prismaSchemaPath, 'utf8');
  const models = parsePrismaModels(prismaSchema);
  const enums = parsePrismaEnums(prismaSchema);

  const lines = ['# API Surface', '', `Generated: ${ISO_NOW}`, ''];
  lines.push('## HTTP Routes', '');
  lines.push('| Method | Path | Handler | Request | Response |');
  lines.push('| --- | --- | --- | --- | --- |');
  routes.forEach((route) => {
    lines.push(
      `| ${route.method} | \`${route.path}\` | \`${route.handler}\` (${route.file}) | ${route.request} | ${route.response} |`
    );
  });

  lines.push('', '## Services', '');
  services.forEach((service) => {
    lines.push(`### ${service.name}`, '', `Source: \`${service.file}\``, '', '```ts');
    service.methods.forEach((method) => lines.push(method));
    lines.push('```', '');
  });

  lines.push('## Prisma Models', '');
  models.forEach((model) => {
    lines.push(`### ${model.name}`, '');
    lines.push('Fields:');
    model.fields.forEach((field) => lines.push(`- \`${field}\``));
    if (model.relations.length > 0) {
      lines.push('', 'Relations:');
      model.relations.forEach((rel) => lines.push(`- ${rel}`));
    }
    lines.push('');
  });

  if (enums.length > 0) {
    lines.push('## Prisma Enums', '');
    enums.forEach((enumDef) => {
      lines.push(`### ${enumDef.name}`, '');
      lines.push(enumDef.values.map((val) => `- \`${val}\``).join('\n'));
      lines.push('');
    });
  }

  await fs.writeFile(path.join(ROOT, 'docs', 'API_SURFACE.md'), lines.join('\n'), 'utf8');
}

function parsePrismaModels(schema) {
  const lines = schema.split(/\r?\n/);
  const models = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('model ')) {
      const name = line.split(/\s+/)[1];
      i++;
      const fields = [];
      const relations = [];
      let depth = 1;
      for (; i < lines.length && depth > 0; i++) {
        const current = lines[i];
        if (current.includes('{')) {
          depth += (current.match(/{/g) || []).length;
        }
        if (current.includes('}')) {
          depth -= (current.match(/}/g) || []).length;
          if (depth === 0) {
            break;
          }
        }
        if (depth === 1 && current.trim().length > 0) {
          const trimmed = current.trim();
          fields.push(trimmed);
          if (trimmed.includes('@relation')) {
            relations.push(trimmed);
          }
        }
      }
      models.push({ name, fields, relations });
    }
  }
  return models;
}

function parsePrismaEnums(schema) {
  const lines = schema.split(/\r?\n/);
  const enums = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('enum ')) {
      const name = line.split(/\s+/)[1];
      i++;
      const values = [];
      let depth = 1;
      for (; i < lines.length && depth > 0; i++) {
        const current = lines[i];
        if (current.includes('{')) {
          depth += (current.match(/{/g) || []).length;
        }
        if (current.includes('}')) {
          depth -= (current.match(/}/g) || []).length;
          if (depth === 0) {
            break;
          }
        }
        if (depth === 1 && current.trim().length > 0) {
          values.push(current.trim());
        }
      }
      enums.push({ name, values });
    }
  }
  return enums;
}

function collectExportNodes(sourceFile) {
  const nodes = [];
  function visit(node) {
    if (canHaveModifiers(node)) {
      const modifiers = getModifiers(node) ?? [];
      const isExported = modifiers.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
      if (isExported && (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node))) {
        nodes.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return nodes;
}

const CLASS_SNIPPET_BUDGET = 10000;
const NON_CLASS_SNIPPET_LIMIT = 5000;

function truncateSnippet(text, limit) {
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit)}\n  /* ... truncated ... */`;
}

function summarizeNode(node, sourceFile) {
  if (ts.isClassDeclaration(node)) {
    const className = node.name?.text ?? 'AnonymousClass';
    const methodNodes = node.members.filter((member) => ts.isMethodDeclaration(member) && isPublicMethod(member));
    const perMethodLimit = Math.max(
      600,
      Math.floor(CLASS_SNIPPET_BUDGET / Math.max(1, methodNodes.length))
    );
    const methods = methodNodes.map((member) => {
      const snippet = truncateSnippet(member.getText(sourceFile).trim(), perMethodLimit);
      return snippet;
    });
    return `export class ${className} {\n${methods.map((method) => `  ${method.replace(/\n/g, '\n  ')}`).join('\n\n')}\n}`;
  }
  return truncateSnippet(node.getText(sourceFile).trim(), NON_CLASS_SNIPPET_LIMIT);
}

function estimateTokens(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(50, Math.round(words * 1.1));
}

async function generateChunks() {
  const chunkDir = path.join(ROOT, 'docs', 'chunks');
  await fs.rm(chunkDir, { recursive: true, force: true });
  await fs.mkdir(chunkDir, { recursive: true });
  const indexEntries = [];
  for (const chunk of config.chunkDefinitions) {
    const chunkPath = path.join(chunkDir, `${chunk.id}.md`);
    const { content, exports, imports, tokensEst } = await buildChunkContent(chunk);
    await fs.writeFile(chunkPath, content, 'utf8');
    indexEntries.push({
      id: chunk.id,
      path: path.relative(ROOT, chunkPath).replace(/\\/g, '/'),
      source_path: chunk.sourcePaths,
      module: chunk.module,
      exports,
      imports,
      tokens_est: tokensEst,
      tags: chunk.tags ?? []
    });
  }
  const indexPayload = {
    version: 1,
    generated_at: ISO_NOW,
    chunks: indexEntries
  };
  await fs.writeFile(path.join(chunkDir, 'index.json'), JSON.stringify(indexPayload, null, 2) + '\n', 'utf8');
}

const moduleInfoById = new Map();
for (const section of config.moduleSections) {
  for (const module of section.modules) {
    moduleInfoById.set(module.id, module);
  }
}

async function buildChunkContent(chunk) {
  const sections = [];
  const combinedExports = new Set();
  const combinedImports = new Set();
  for (const relPath of chunk.sourcePaths) {
    const abs = path.join(ROOT, relPath);
    const exists = await pathExists(abs);
    if (!exists) {
      continue;
    }
    const sourceText = await fs.readFile(abs, 'utf8');
    const sourceFile = ts.createSourceFile(relPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const exportNodes = collectExportNodes(sourceFile);
    const snippets = exportNodes.map((node) => summarizeNode(node, sourceFile)).filter(Boolean);
    const truncated = snippets.join('\n\n').slice(0, 4000);
    sections.push({
      path: relPath,
      snippet: truncated
    });
    extractExports(sourceText).forEach((exp) => combinedExports.add(exp));
    extractImports(sourceText).forEach((imp) => combinedImports.add(imp));
  }

  const summaryLines = chunk.summary?.map((line) => `- ${line}`) ?? [];
  const relatedLines =
    chunk.related?.map((id) => {
      const relative = `./${id}.md`;
      return `- [${id}](${relative})`;
    }) ?? [];
  const bodyLines = [
    '### Summary',
    ...summaryLines,
    '',
    '### Key API / Logic',
    ''
  ];

  const moduleInfo = moduleInfoById.get(chunk.module);
  if (moduleInfo) {
    bodyLines.push('### Operational Notes', '');
    if (moduleInfo.invariants && moduleInfo.invariants.length > 0) {
      bodyLines.push('**Invariants**');
      moduleInfo.invariants.forEach((line) => {
        bodyLines.push(line.startsWith('-') ? line : `- ${line}`);
      });
      bodyLines.push('');
    }
    if (moduleInfo.failureModes && moduleInfo.failureModes.length > 0) {
      bodyLines.push('**Failure modes**');
      moduleInfo.failureModes.forEach((line) => {
        bodyLines.push(line.startsWith('-') ? line : `- ${line}`);
      });
      bodyLines.push('');
    }
    if (moduleInfo.extend && moduleInfo.extend.length > 0) {
      bodyLines.push('**Extension tips**');
      moduleInfo.extend.forEach((line) => {
        bodyLines.push(line.startsWith('-') ? line : `- ${line}`);
      });
      bodyLines.push('');
    }
  }

  sections.forEach((section) => {
    bodyLines.push(`#### ${section.path}`, '', '```ts', section.snippet, '```', '');
  });

  if (relatedLines.length > 0) {
    bodyLines.push('### Related', ...relatedLines, '');
  }

  const body = bodyLines.join('\n');
  const exportsArr = Array.from(combinedExports).sort();
  const importsArr = Array.from(combinedImports).sort();
  const tokensEst = estimateTokens(body);
  const metadataLines = [
    '---',
    `id: ${chunk.id}`,
    `title: ${chunk.title}`,
    `module: ${chunk.module}`,
    `generated_at: ${ISO_NOW}`,
    `tags: ${JSON.stringify(chunk.tags ?? [])}`,
    `source_paths: ${JSON.stringify(chunk.sourcePaths)}`,
    `exports: ${JSON.stringify(exportsArr)}`,
    `imports: ${JSON.stringify(importsArr)}`,
    `tokens_est: ${tokensEst}`,
    '---',
    '',
    body
  ];

  return {
    content: metadataLines.join('\n'),
    exports: exportsArr,
    imports: importsArr,
    tokensEst
  };
}

async function writeFileManifest(manifest) {
  await fs.mkdir(path.join(ROOT, 'docs'), { recursive: true });
  await fs.writeFile(path.join(ROOT, 'docs', 'FILE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

async function main() {
  const manifest = await generateFileManifest();
  await writeModuleSummary(manifest);
  await generateApiSurface(manifest);
  await generateChunks();
  const finalManifest = await generateFileManifest();
  await writeFileManifest(finalManifest);
  console.log('Context artifacts refreshed.');
}

main().catch((error) => {
  console.error('Context refresh failed:', error);
  process.exitCode = 1;
});
