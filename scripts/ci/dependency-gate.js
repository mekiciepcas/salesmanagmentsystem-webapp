const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'dependency_report.json');

function main() {
  let audit = { metadata: { vulnerabilities: {} } };
  try {
    const output = execSync('npm audit --json', {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    audit = JSON.parse(output || '{}');
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '{}';
    try {
      audit = JSON.parse(stdout);
    } catch (_) {
      audit = { metadata: { vulnerabilities: {} }, parseError: true };
    }
  }

  const vul = audit.metadata?.vulnerabilities || {};
  const criticalCveCount = Number(vul.critical || 0);
  const highCveCount = Number(vul.high || 0);
  const report = { criticalCveCount, highCveCount, vulnerabilities: vul };
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  if (criticalCveCount >= 1 || highCveCount >= 5) {
    console.error('Dependency gate failed', report);
    process.exit(1);
  }
  console.log('Dependency gate passed', report);
}

main();
