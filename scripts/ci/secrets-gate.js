const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'secrets_report.json');
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);
const IGNORE_FILES = new Set(['.env.example']);
const TEXT_EXTENSIONS = ['.js', '.ts', '.json', '.md', '.yml', '.yaml', '.env', '.html', '.css', '.sql'];

const rules = [
  { severity: 'critical', name: 'jwt_secret_literal', regex: /JWT_SECRET\s*=\s*[A-Za-z0-9]{20,}/ },
  { severity: 'critical', name: 'db_password_literal', regex: /DB_PASSWORD\s*=\s*[^\s]+/ },
  { severity: 'high', name: 'admin_password_literal', regex: /admin123|password\s*:\s*['"]admin123['"]/i },
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.cursor')) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.includes(ext) || path.basename(filePath).startsWith('.env');
}

function main() {
  const findings = [];
  const files = walk(ROOT).filter((f) => isTextFile(f));
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (IGNORE_FILES.has(path.basename(file))) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const rule of rules) {
      if (rule.regex.test(content)) {
        findings.push({ file: rel, severity: rule.severity, rule: rule.name });
      }
    }
  }

  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const report = { criticalCount, highCount, findings };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const fail = criticalCount >= 1 || highCount >= 3;
  if (fail) {
    console.error('Secrets gate failed', report);
    process.exit(1);
  }
  console.log('Secrets gate passed', report);
}

main();
