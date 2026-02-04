import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd(), 'web');
const srcRoot = path.join(projectRoot, 'src');
const localesDir = path.join(srcRoot, 'react-i18next', 'locales');
const locales = ['zh-CN', 'en-US', 'zh-TW', 'ja-JP'];

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
  const withoutBlock = code.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock.replace(/\/\/.*$/gm, '');
};

const collectUsedKeys = (files) => {
  const used = new Set();
  const pattern = /\b(?:t|i18n\.t)\(\s*['"`]([^'"`]+)['"`]/g;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      used.add(match[1]);
    }
  }
  return used;
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
  const usedKeys = collectUsedKeys(codeFiles);
  const unusedKeys = Array.from(allKeys).filter((key) => !usedKeys.has(key));

  const rawChinese = collectRawChinese(codeFiles);

  console.log(`Locales: ${locales.join(', ')}`);
  console.log(`Total keys: ${allKeys.size}`);
  locales.forEach((locale) => {
    console.log(`${locale} keys: ${Object.keys(flatLocales[locale]).length}`);
  });

  console.log('\nMissing keys per locale:');
  locales.forEach((locale) => {
    console.log(`${locale}: ${missingByLocale[locale].length}`);
  });

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
};

main();
