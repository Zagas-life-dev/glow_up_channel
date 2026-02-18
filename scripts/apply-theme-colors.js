/**
 * One-time script: replace local color classes with theme tokens in app/ and components/.
 * Excludes gq-code-user and node_modules.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dirs = ['app', 'components'];

const replacements = [
  // Order matters: more specific first
  [/\bbg-\[#0a0a0a\]\/95\b/g, 'bg-page/95'],
  [/\bbg-\[#0a0a0a\]\/80\b/g, 'bg-page/80'],
  [/\bbg-\[#0a0a0a\]\b/g, 'bg-page'],
  [/\bbg-\[#141414\]\b/g, 'bg-surface'],
  [/\bbg-\[#1a1a1a\]\b/g, 'bg-surface'],
  [/\bborder-white\/\[0\.08\]\b/g, 'border-border'],
  [/\bborder-white\/\[0\.06\]\b/g, 'border-border'],
  [/\bborder-white\/\[0\.1\]\b/g, 'border-border'],
  [/\bborder-white\/\[0\.04\]\b/g, 'border-border'],
  [/\bborder-white\/10\b/g, 'border-border'],
  [/\bbg-white\/\[0\.08\]\b/g, 'bg-muted'],
  [/\bbg-white\/\[0\.06\]\b/g, 'bg-muted'],
  [/\bbg-white\/\[0\.05\]\b/g, 'bg-muted'],
  [/\bbg-white\/\[0\.04\]\b/g, 'bg-muted'],
  [/\bbg-white\/\[0\.03\]\b/g, 'bg-muted'],
  [/\bbg-white\/\[0\.02\]\b/g, 'bg-card'],
  [/\bbg-white\/10\b/g, 'bg-muted'],
  [/\bhover:bg-white\/\[0\.08\]\b/g, 'hover:bg-muted/80'],
  [/\bhover:bg-white\/\[0\.03\]\b/g, 'hover:bg-muted'],
  [/\btext-foreground\/10\b/g, 'text-muted-foreground'],
  [/\bhover:bg-white\/\[0\.06\]\b/g, 'hover:bg-muted'],
  [/\bhover:bg-white\/\[0\.05\]\b/g, 'hover:bg-muted'],
  [/\bhover:bg-white\/\[0\.04\]\b/g, 'hover:bg-muted'],
  [/\bfocus:bg-white\/\[0\.05\]\b/g, 'focus:bg-muted'],
  [/\btext-white\/80\b/g, 'text-foreground'],
  [/\btext-white\/70\b/g, 'text-muted-foreground'],
  [/\btext-white\/60\b/g, 'text-muted-foreground'],
  [/\btext-white\/50\b/g, 'text-muted-foreground'],
  [/\btext-white\/40\b/g, 'text-muted-foreground'],
  [/\btext-white\/30\b/g, 'text-muted-foreground'],
  [/\btext-white\/20\b/g, 'text-muted-foreground'],
  [/\bhover:text-white\b/g, 'hover:text-foreground'],
  [/\bfocus:text-white\b/g, 'focus:text-foreground'],
  [/\btext-white\b/g, 'text-foreground'],
  [/\bbg-orange-500 hover:bg-orange-600 text-primary-foreground\b/g, 'bg-primary hover:bg-primary/90 text-primary-foreground'],
  [/\bbg-orange-500 hover:bg-orange-600\b/g, 'bg-primary hover:bg-primary/90'],
  [/\bbg-orange-500\b/g, 'bg-primary'],
  [/\bhover:bg-orange-600\b/g, 'hover:bg-primary/90'],
  [/\bgroup-hover:text-blue-400\b/g, 'group-hover:text-accent-cyan'],
];

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const name of files) {
    const full = path.join(dir, name);
    if (name === 'gq-code-user' || name === 'node_modules') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, callback);
    else if (name.endsWith('.tsx') || name.endsWith('.jsx')) callback(full);
  }
}

let total = 0;
for (const d of dirs) {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) continue;
  walk(dir, (file) => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    for (const [re, replacement] of replacements) {
      const next = content.replace(re, replacement);
      if (next !== content) {
        content = next;
        changed = true;
      }
    }
    // Literal pass (regex \b doesn't match after ])
    const literals = [
      ['bg-[#0a0a0a]', 'bg-page'],
      ['bg-[#141414]', 'bg-surface'],
      ['bg-[#1a1a1a]', 'bg-surface'],
      ['border-white/[0.08]', 'border-border'],
      ['border-white/[0.06]', 'border-border'],
      ['border-white/[0.1]', 'border-border'],
      ['border-white/[0.04]', 'border-border'],
      ['border-white/20', 'border-border'],
      ['border-white/30', 'border-border'],
      ['border-white/60', 'border-border'],
      ['bg-white/[0.08]', 'bg-muted'],
      ['bg-white/[0.06]', 'bg-muted'],
      ['bg-white/[0.05]', 'bg-muted'],
      ['bg-white/[0.04]', 'bg-muted'],
      ['bg-white/[0.03]', 'bg-muted'],
      ['bg-white/[0.02]', 'bg-card'],
      ['bg-white/5', 'bg-muted'],
      ['bg-white/50', 'bg-muted'],
      ['bg-white/75', 'bg-muted'],
      ['hover:bg-white/[0.08]', 'hover:bg-muted/80'],
      ['hover:bg-white/[0.06]', 'hover:bg-muted'],
      ['hover:bg-white/[0.05]', 'hover:bg-muted'],
      ['hover:bg-white/[0.04]', 'hover:bg-muted'],
      ['hover:bg-white/[0.03]', 'hover:bg-muted'],
      ['hover:bg-white/20', 'hover:bg-muted'],
      ['hover:bg-white', 'hover:bg-card'],
      ['focus:bg-white/[0.05]', 'focus:bg-muted'],
      ['focus:bg-white/[0.08]', 'focus:bg-muted'],
      ['bg-white ', 'bg-card '],
      ['bg-white"', 'bg-card"'],
      ['hover:bg-gray-100', 'hover:bg-muted'],
      ['text-gray-900', 'text-foreground'],
      ['hover:text-black', 'hover:text-foreground'],
    ];
    for (const [from, to] of literals) {
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
