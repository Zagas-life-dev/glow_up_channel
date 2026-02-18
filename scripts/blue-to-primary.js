/**
 * Replace blue/cyan accent classes with primary (orange) across app/ and components/.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dirs = ['app', 'components', 'styles'];

const replacements = [
  ['text-blue-400', 'text-primary'],
  ['text-blue-500', 'text-primary'],
  ['text-blue-600', 'text-primary'],
  ['text-blue-700', 'text-foreground'],
  ['text-blue-800', 'text-foreground'],
  ['text-blue-900', 'text-foreground'],
  ['text-blue-300', 'text-primary'],
  ['bg-blue-500/10', 'bg-primary/10'],
  ['bg-blue-500/20', 'bg-primary/20'],
  ['bg-blue-500/30', 'bg-primary/20'],
  ['bg-blue-100', 'bg-primary/10'],
  ['bg-blue-50', 'bg-primary/10'],
  ['border-blue-500/20', 'border-primary/20'],
  ['border-blue-500/30', 'border-primary/30'],
  ['border-blue-500/40', 'border-primary/30'],
  ['border-blue-200', 'border-primary/20'],
  ['border-blue-400', 'border-primary'],
  ['border-blue-500', 'border-primary'],
  ['hover:text-blue-400', 'hover:text-primary'],
  ['hover:text-blue-300', 'hover:text-primary'],
  ['hover:bg-blue-500/10', 'hover:bg-primary/10'],
  ['hover:bg-blue-500/30', 'hover:bg-primary/20'],
  ['from-blue-500/20', 'from-primary/20'],
  ['to-blue-600/20', 'to-primary/20'],
  ['to-blue-600/10', 'to-primary/10'],
  ['from-blue-500/20 to-blue-600/20', 'from-primary/20 to-primary/20'],
  ['from-blue-50 to-blue-100/50', 'from-primary/10 to-primary/10'],
  ['focus:border-blue-500', 'focus:border-primary'],
  ['focus:ring-blue-500', 'focus:ring-primary'],
  ['shadow-orange-500', 'shadow-primary'],
];

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const name of files) {
    const full = path.join(dir, name);
    if (name === 'gq-code-user' || name === 'node_modules') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, callback);
    else if (name.endsWith('.tsx') || name.endsWith('.jsx') || name.endsWith('.css')) callback(full);
  }
}

let total = 0;
for (const d of dirs) {
  const dir = path.join(root, d);
  walk(dir, (file) => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [from, to] of replacements) {
      if (content.includes(from)) {
        content = content.split(from).join(to);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, content);
      total++;
      console.log('Updated:', path.relative(root, file));
    }
  });
}
console.log('Done. Files updated:', total);
