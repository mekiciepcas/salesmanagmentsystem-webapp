const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'audit_summary.json');

const required = ['JWT_SECRET', 'ADMIN_REGISTER_SECRET'];

function readEnvTemplate() {
  const envExamplePath = path.join(ROOT, '.env.example');
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const keys = new Set();
  content.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) return;
    keys.add(t.split('=')[0].trim());
  });
  return keys;
}

function main() {
  const keys = readEnvTemplate();
  const missing = required.filter((k) => !keys.has(k));
  const report = {
    required,
    missing,
    pass: missing.length === 0,
  };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  if (missing.length > 0) {
    console.error('Config gate failed', report);
    process.exit(1);
  }
  console.log('Config gate passed', report);
}

main();
