/**
 * Fails the build if repo source looks like it contains a pasted-in API key.
 * Run: node scripts/verify-no-secrets.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const SKIP_DIR = new Set(['node_modules', 'dist', 'dist-electron', 'release', '.git', 'coverage', 'terminals']);
const EXCLUDE_FILES = new Set(['verify-no-secrets.mjs']);

const PATTERNS = [
  { name: 'OpenAI-style (sk-…)', re: /sk-(?:proj|ant|test)?[a-zA-Z0-9_-]{20,}/ },
  { name: 'Google (AIza…)', re: /AIzaSy[0-9A-Za-z_-]{16,}/ },
  { name: 'Hugging Face (hf_…)', re: /hf_[a-zA-Z0-9_]{20,}/ },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(name.name) || name.name.startsWith('.')) continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else {
      if (!/\.(ts|tsx|js|jsx|json|html|md|css|env|txt|toml|yaml|yml)$/i.test(name.name)) continue;
      if (EXCLUDE_FILES.has(name.name)) continue;
      out.push(p);
    }
  }
  return out;
}

let failed = false;
const files = walk(path.join(root, 'src'))
  .concat(walk(path.join(root, 'electron')))
  .concat(walk(path.join(root, 'scripts')))
  .concat(
    [
      'package.json',
      'package-lock.json',
      'index.html',
      'vite.config.ts',
      'metadata.json',
    ]
      .map(f => path.join(root, f))
      .filter(f => fs.existsSync(f)),
  );

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file).split(path.sep).join('/');
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      const m = text.match(re);
      console.error(`[verify-no-secrets] ${name} pattern matched in: ${rel}`);
      if (m?.[0]) {
        const preview = m[0].length > 20 ? `${m[0].slice(0, 6)}…${m[0].slice(-4)}` : '[redacted]';
        console.error(`  Offending sample (truncated): ${preview}`);
      }
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    '\nRemove real API keys from the repo. Keys should only live in the app Settings (localStorage) or in a local .env that is gitignored, never in source files.',
  );
  process.exit(1);
}

console.log('verify-no-secrets: OK (no key-like strings in scanned files).');
