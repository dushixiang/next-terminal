import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(projectRoot, 'src');
const localesDir = path.join(srcRoot, 'react-i18next', 'locales');
const locales = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP'];
const backendOperationModules = [
  'access',
  'assets',
  'authorised',
  'backup',
  'dbproxy',
  'entrance',
  'identity',
  'sysconf',
  'sysops',
];

const fileExts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const chinesePattern = /[\u4e00-\u9fff]/;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const flatten = (obj, prefix = '', out = {}) => {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    Object.entries(obj).forEach(([key, value]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      flatten(value, next, out);
    });
    return out;
  }
  out[prefix] = obj;
  return out;
};

const walkFiles = (dir) => {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (fileExts.has(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }
  return results;
};

const stripComments = (code) => {
  const withoutBlock = code.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\r\n]/g, '')
  );
  return withoutBlock.replace(/\/\/.*$/gm, '');
};

const getLineNumber = (content, index) =>
  content.slice(0, index).split(/\r?\n/).length;

const skipQuoted = (code, index, quote) => {
  let i = index + 1;
  while (i < code.length) {
    if (code[i] === '\\') {
      i += 2;
      continue;
    }
    if (code[i] === quote) {
      return i + 1;
    }
    i += 1;
  }
  return i;
};

const skipTemplate = (code, index) => {
  let i = index + 1;
  while (i < code.length) {
    if (code[i] === '\\') {
      i += 2;
      continue;
    }
    if (code[i] === '`') {
      return i + 1;
    }
    if (code[i] === '$' && code[i + 1] === '{') {
      i += 2;
      let depth = 1;
      while (i < code.length && depth > 0) {
        if (code[i] === '\\') {
          i += 2;
          continue;
        }
        if (code[i] === '\'' || code[i] === '"') {
          i = skipQuoted(code, i, code[i]);
          continue;
        }
        if (code[i] === '`') {
          i = skipTemplate(code, i);
          continue;
        }
        if (code[i] === '{') depth += 1;
        if (code[i] === '}') depth -= 1;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return i;
};

const parseFirstArgument = (code, openParenIndex) => {
  let start = openParenIndex + 1;
  while (/\s/.test(code[start] || '')) start += 1;

  let depth = 0;
  let i = start;
  while (i < code.length) {
    const char = code[i];
    if (char === '\'' || char === '"') {
      i = skipQuoted(code, i, char);
      continue;
    }
    if (char === '`') {
      i = skipTemplate(code, i);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      if (depth === 0 && char === ')') {
        break;
      }
      depth -= 1;
      i += 1;
      continue;
    }
    if (char === ',' && depth === 0) {
      break;
    }
    i += 1;
  }

  return code.slice(start, i).trim();
};

const parseCallArguments = (code, openParenIndex) => {
  const start = openParenIndex + 1;
  let depth = 0;
  let i = start;
  while (i < code.length) {
    const char = code[i];
    if (char === '\'' || char === '"') {
      i = skipQuoted(code, i, char);
      continue;
    }
    if (char === '`') {
      i = skipTemplate(code, i);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      if (depth === 0 && char === ')') {
        break;
      }
      depth -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }

  return code.slice(start, i).trim();
};

const splitTopLevelComma = (expr) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (char === '\'' || char === '"') {
      i = skipQuoted(expr, i, char);
      continue;
    }
    if (char === '`') {
      i = skipTemplate(expr, i);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      i += 1;
      continue;
    }
    if (char === ',' && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
    i += 1;
  }
  parts.push(expr.slice(start).trim());
  return parts;
};

const decodeLiteral = (value) =>
  value.replace(/\\(['"`\\])/g, '$1');

const parseLiteral = (expr) => {
  const text = expr.trim();
  if (text.length < 2) return null;
  const quote = text[0];
  if (!['\'', '"', '`'].includes(quote) || text[text.length - 1] !== quote) {
    return null;
  }
  const body = text.slice(1, -1);
  if ((quote === '`' ? skipTemplate(text, 0) : skipQuoted(text, 0, quote)) !== text.length) {
    return null;
  }
  if (quote === '`' && body.includes('${')) {
    return null;
  }
  return decodeLiteral(body);
};

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitTopLevelPlus = (expr) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < expr.length) {
    const char = expr[i];
    if (char === '\'' || char === '"') {
      i = skipQuoted(expr, i, char);
      continue;
    }
    if (char === '`') {
      i = skipTemplate(expr, i);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      i += 1;
      continue;
    }
    if (char === '+' && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
    i += 1;
  }
  parts.push(expr.slice(start).trim());
  return parts;
};

const templateToMatcher = (expr) => {
  const text = expr.trim();
  if (!text.startsWith('`') || !text.endsWith('`') || !text.includes('${')) {
    return null;
  }
  const body = text.slice(1, -1);
  const pattern = body.split(/\$\{[^}]+}/g).map(escapeRegex).join('.+');
  return new RegExp(`^${pattern}$`);
};

const concatToMatcher = (expr) => {
  const parts = splitTopLevelPlus(expr);
  if (parts.length < 2) return null;

  let hasLiteral = false;
  let hasDynamic = false;
  const pattern = parts.map((part) => {
    const literal = parseLiteral(part);
    if (literal !== null) {
      hasLiteral = true;
      return escapeRegex(literal);
    }
    hasDynamic = true;
    return '.+';
  }).join('');

  if (!hasLiteral || !hasDynamic) return null;
  return new RegExp(`^${pattern}$`);
};

const markEquivalentMenuModules = (used, allKeys) => {
  allKeys.forEach((key) => {
    const match = key.match(/^menus\.([^.]+)\.label$/);
    if (match && used.has(key) && allKeys.has(`audit.operation.modules.${match[1]}`)) {
      used.add(`audit.operation.modules.${match[1]}`);
    }
  });
  backendOperationModules.forEach((key) => {
    used.add(`audit.operation.modules.${key}`);
  });
};

const markEmbeddedLiteralKeys = (expr, used, allKeys) => {
  let i = 0;
  while (i < expr.length) {
    const quote = expr[i];
    if (!['\'', '"', '`'].includes(quote)) {
      i += 1;
      continue;
    }

    const end = quote === '`' ? skipTemplate(expr, i) : skipQuoted(expr, i, quote);
    const literal = parseLiteral(expr.slice(i, end));
    if (literal !== null && allKeys.has(literal)) {
      used.add(literal);
    }
    i = end;
  }
};

const addUsageFromExpression = (expr, used, dynamicMatchers, allKeys) => {
  const literal = parseLiteral(expr);
  if (literal !== null) {
    used.add(literal);
    return;
  }

  const matcher = templateToMatcher(expr) || concatToMatcher(expr);
  if (matcher) {
    dynamicMatchers.push(matcher);
    return;
  }

  markEmbeddedLiteralKeys(expr, used, allKeys);
};

const collectUsedKeys = (files, allKeys) => {
  const used = new Set();
  const dynamicMatchers = [];
  const tPattern = /\b(?:t|i18n\.t)\s*\(/g;
  const fallbackPattern = /\btranslateWithFallback\s*\(/g;
  const transKeyPattern = /\bi18nKey\s*=\s*(?:\{\s*)?(['"])([^'"]+)\1/g;
  for (const file of files) {
    const content = stripComments(fs.readFileSync(file, 'utf8'));
    let match;
    while ((match = transKeyPattern.exec(content)) !== null) {
      used.add(match[2]);
    }
    while ((match = tPattern.exec(content)) !== null) {
      addUsageFromExpression(
        parseFirstArgument(content, tPattern.lastIndex - 1),
        used,
        dynamicMatchers,
        allKeys
      );
    }

    while ((match = fallbackPattern.exec(content)) !== null) {
      const args = splitTopLevelComma(
        parseCallArguments(content, fallbackPattern.lastIndex - 1)
      );
      if (args[1]) {
        addUsageFromExpression(args[1], used, dynamicMatchers, allKeys);
      }
    }
  }

  allKeys.forEach((key) => {
    if (dynamicMatchers.some((matcher) => matcher.test(key))) {
      used.add(key);
    }
  });
  markEquivalentMenuModules(used, allKeys);

  return used;
};

const collectFallbackUsages = (files) => {
  const findings = [];
  const patterns = [
    {
      type: 'string fallback',
      pattern: /\b(?:t|i18n\.t)\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])([^'"`]*)\3/g,
    },
    {
      type: 'defaultValue fallback',
      pattern: /\b(?:t|i18n\.t)\(\s*(['"`])([^'"`]+)\1\s*,\s*\{[\s\S]*?\bdefaultValue\s*:/g,
    },
  ];

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const content = stripComments(raw);
    patterns.forEach(({type, pattern}) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineEnd = content.indexOf('\n', match.index);
        const text = content.slice(match.index, lineEnd === -1 ? undefined : lineEnd).trim();
        findings.push({
          file,
          line: getLineNumber(content, match.index),
          key: match[2],
          type,
          text,
        });
      }
    });
  }

  return findings;
};

const collectRawChinese = (files) => {
  const findings = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const content = stripComments(raw);
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!chinesePattern.test(line)) return;
      if (line.includes('t(') || line.includes('i18n.t')) return;
      const trimmed = line.trim();
      if (!trimmed) return;
      findings.push({
        file,
        line: index + 1,
        text: trimmed,
      });
    });
  }
  return findings;
};

const auditBackendTranslations = (flatLocales) => {
  const repositoryRoot = path.resolve(projectRoot, '..');
  const readSource = (file) => fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
  const codes = [...readSource('internal/xerrors/errors.go').matchAll(/orz\.NewError\((\d+),/g)].map(match => match[1]);
  const events = [...readSource('internal/apps/sysconf/exp.go').matchAll(/Event\w+\s*=\s*"([^"]+)"/g)].map(match => match[1]);
  const actions = [...readSource('internal/apps/access/models/filesystem_log.go').matchAll(/FileSystemAction = "([^"]+)"/g)].map(match => match[1]);
  const issues = [];
  const backendLocales = Object.fromEntries(locales.map(locale => {
    const entries = readJson(path.join(localesDir, 'system-events', `${locale}.json`));
    const messages = new Map();
    for (const item of entries) {
      if (messages.has(item.id)) issues.push(`${locale}: duplicate notification template ${item.id}`);
      if (typeof item.other !== 'string' || !item.other.trim()) issues.push(`${locale}: invalid notification template ${item.id}`);
      if (/\.(title|summary)$/.test(item.id)) {
        const literal = String(item.other).replace(/{{\s*\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g, '');
        if (literal.includes('{{') || literal.includes('}}')) issues.push(`${locale}: unsupported event template syntax ${item.id}`);
      }
      messages.set(item.id, item.other);
    }
    return [locale, messages];
  }));
  const reference = backendLocales['zh-CN'];
  const parameters = text => [...String(text).matchAll(/{{\s*\.([A-Za-z][A-Za-z0-9_]*)\s*}}/g)].map(match => match[1]).sort().join(',');
  for (const locale of locales) {
    const required = [
      ...codes.map(code => `errors.${code}`),
      ...events.map(event => `settings.notification.event_types.${event}`),
      ...actions.map(action => `audit.filesystem_actions.${action}`),
    ];
    for (const key of required) {
      if (!flatLocales[locale][key]) issues.push(`${locale}: missing backend key ${key}`);
    }
    for (const [key, source] of reference) {
      const text = backendLocales[locale].get(key);
      if (!text) issues.push(`${locale}: missing notification template ${key}`);
      else if (parameters(text) !== parameters(source)) issues.push(`${locale}: notification parameters differ ${key}`);
    }
    for (const key of backendLocales[locale].keys()) {
      if (!reference.has(key)) issues.push(`${locale}: extra notification template ${key}`);
    }
  }
  return issues;
};

const main = () => {
  const localeData = {};
  const flatLocales = {};
  locales.forEach((locale) => {
    const jsonPath = path.join(localesDir, `${locale}.json`);
    localeData[locale] = readJson(jsonPath);
    flatLocales[locale] = flatten(localeData[locale]);
  });

  const allKeys = new Set();
  locales.forEach((locale) => {
    Object.keys(flatLocales[locale]).forEach((key) => allKeys.add(key));
  });

  const missingByLocale = {};
  locales.forEach((locale) => {
    missingByLocale[locale] = Array.from(allKeys).filter(
      (key) => !(key in flatLocales[locale])
    );
  });

  const invalidValues = [];
  const placeholderMismatches = [];
  const placeholders = (value) => typeof value === 'string'
    ? Array.from(value.matchAll(/{{\s*([^{}]+?)\s*}}/g), match => match[1]).sort()
    : [];
  locales.forEach((locale) => {
    Object.entries(flatLocales[locale]).forEach(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) {
        invalidValues.push(`${locale}: ${key}`);
      }
      const source = flatLocales['zh-CN'][key];
      if (source !== undefined && JSON.stringify(placeholders(source)) !== JSON.stringify(placeholders(value))) {
        placeholderMismatches.push(`${locale}: ${key}`);
      }
    });
  });

  const duplicateGroups = new Map();
  const localeKeys = locales.filter(Boolean);
  const sharedKeys = Array.from(allKeys).filter((key) =>
    localeKeys.every((locale) => key in flatLocales[locale])
  );
  sharedKeys.forEach((key) => {
    const values = localeKeys.map((locale) => flatLocales[locale][key]);
    const signature = JSON.stringify(values);
    if (!duplicateGroups.has(signature)) {
      duplicateGroups.set(signature, []);
    }
    duplicateGroups.get(signature).push(key);
  });

  const duplicateList = Array.from(duplicateGroups.values()).filter(
    (group) => group.length > 1
  );

  const codeFiles = walkFiles(srcRoot);
  const usedKeys = collectUsedKeys(codeFiles, allKeys);
  const missingReferencedKeys = Array.from(usedKeys).filter((key) => !allKeys.has(key));
  const unusedKeys = Array.from(allKeys).filter((key) => !usedKeys.has(key));

  const fallbackUsages = collectFallbackUsages(codeFiles);
  const rawChinese = collectRawChinese(codeFiles);

  console.log(`Locales: ${locales.join(', ')}`);
  console.log(`Total keys: ${allKeys.size}`);
  locales.forEach((locale) => {
    console.log(`${locale} keys: ${Object.keys(flatLocales[locale]).length}`);
  });

  const backendIssues = auditBackendTranslations(flatLocales);
  console.log(`\nBackend translation issues: ${backendIssues.length}`);
  backendIssues.forEach(issue => console.log(`  - ${issue}`));

  console.log('\nMissing keys per locale:');
  locales.forEach((locale) => {
    console.log(`${locale}: ${missingByLocale[locale].length}`);
    missingByLocale[locale].slice(0, 50).forEach((key) => {
      console.log(`  - ${key}`);
    });
  });

  console.log(`\nInvalid translation values: ${invalidValues.length}`);
  invalidValues.forEach(item => console.log(`  - ${item}`));
  console.log(`Placeholder mismatches: ${placeholderMismatches.length}`);
  placeholderMismatches.forEach(item => console.log(`  - ${item}`));
  console.log(`Missing referenced translation keys: ${missingReferencedKeys.length}`);
  missingReferencedKeys.forEach(key => console.log(`  - ${key}`));

  console.log('\nDuplicate value groups (same text across all locales):');
  console.log(`Groups: ${duplicateList.length}`);
  duplicateList.slice(0, 20).forEach((group) => {
    console.log(`- ${group.length} :: ${group.slice(0, 6).join(', ')}${group.length > 6 ? ' ...' : ''}`);
  });

  console.log('\nUnused keys (by t("...") scan):');
  console.log(`Count: ${unusedKeys.length}`);
  console.log(unusedKeys.slice(0, 50).join('\n'));

  console.log('\nRaw Chinese strings (non-i18n, code scan):');
  console.log(`Count: ${rawChinese.length}`);
  rawChinese.slice(0, 50).forEach((item) => {
    console.log(`${path.relative(projectRoot, item.file)}:${item.line} ${item.text}`);
  });

  console.log('\nFallback translations (t("key", "...") or defaultValue):');
  console.log(`Count: ${fallbackUsages.length}`);
  fallbackUsages.slice(0, 50).forEach((item) => {
    console.log(`${path.relative(projectRoot, item.file)}:${item.line} ${item.type} ${item.key} :: ${item.text}`);
  });

  if (Object.values(missingByLocale).some((items) => items.length > 0)
    || invalidValues.length > 0 || placeholderMismatches.length > 0
    || missingReferencedKeys.length > 0 || fallbackUsages.length > 0 || backendIssues.length > 0) {
    process.exitCode = 1;
  }
};

main();
