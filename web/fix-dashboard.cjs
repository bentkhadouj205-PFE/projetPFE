const fs = require('fs');
let c = fs.readFileSync('src/sections/AdminDashboard.tsx', 'utf8');

// ── Fix 1: Restore missing helper functions before filteredEmployees ──────────
const helperFunctions = `
  const getEmpName = (emp) => ({ first: emp.firstName || emp.name?.split(' ')[0] || '', last: emp.lastName || emp.name?.split(' ').slice(1).join(' ') || '' });
  const translateService = (raw) => { const e = SERVICE_LABELS[raw?.toLowerCase()]; return e ? e[language] : raw; };
  const translatePosition = (raw) => { const e = POSITION_LABELS[raw?.toLowerCase()]; return e ? e[language] : raw; };

`;

if (!c.includes('const getEmpName')) {
  c = c.replace('  // ── Derived variables', helperFunctions + '  // ── Derived variables');
  console.log('getEmpName + translate helpers added');
} else {
  console.log('getEmpName already exists, skipping');
}

// Remove duplicate translateService/translatePosition if they were already added in derived vars
// (keep only one copy)
const dupePattern = /const translateService[\s\S]*?const translatePosition[\s\S]*?;\n\n([\s\S]*?)const translateService/;
if (dupePattern.test(c)) {
  c = c.replace(
    /  const translateService = \(raw: string\)[\s\S]*?const translatePosition = \(raw: string\).*?;\n(?=\n  const getTabTitle)/,
    ''
  );
  console.log('Removed duplicate translate functions');
}

// ── Fix 2: Add isMatch before CompareRow ──────────────────────────────────────
const isMatchDef = `const isMatch = (a: string, b: string | null) =>
  b ? a.toLowerCase().trim() === b.toLowerCase().trim() : false;\n\n  `;

if (!c.includes('const isMatch = (a: string, b: string | null)')) {
  c = c.replace('const CompareRow', isMatchDef + 'const CompareRow');
  console.log('isMatch added before CompareRow');
} else {
  console.log('isMatch already exists');
}

// ── Fix 3: Fix all broken encoded strings ─────────────────────────────────────
const replacements = [
  ['Validate \u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u201d send activation email', 'Validate \u2014 send activation email'],
  ['Validate \u00e2\u20ac\u201c send activation email', 'Validate \u2014 send activation email'],
  ['Reject \u00e2\u20ac\u201c send rejection email', 'Reject \u2014 send rejection email'],
  ['Reject \u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u201d send rejection email', 'Reject \u2014 send rejection email'],
  ['Demande validee', 'Demande valid\u00e9e \u2705'],
  ['Demande rejetee', 'Demande rejet\u00e9e \u274c'],
];

for (const [find, replace] of replacements) {
  if (c.includes(find)) {
    c = c.split(find).join(replace);
    console.log(`Fixed: "${find}"`);
  }
}

fs.writeFileSync('src/sections/AdminDashboard.tsx', c, 'utf8');
console.log('\nAll fixes applied and saved as UTF-8!');
