const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'injection_report.json');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const riskyPatterns = [
  /eval\s*\(/,
  /new Function\s*\(/,
  /child_process\.(exec|execSync)\s*\(/,
  /\.innerHTML\s*=/,
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|ts|html)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function main() {
  const findings = [];
  for (const file of walk(ROOT)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    riskyPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        findings.push({ file: rel, pattern: String(pattern), severity: 'high' });
      }
    });
  }
  const exploitableHigh = findings.length;
  const report = { exploitableHigh, findings };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (exploitableHigh >= 1) {
    console.error('Injection gate failed', report);
    process.exit(1);
  }
  console.log('Injection gate passed', report);
}

main();
