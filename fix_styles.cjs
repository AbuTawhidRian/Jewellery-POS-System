const fs = require('fs');
const path = require('path');

const dirsToProcess = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

const processFile = (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Fix 1: Add dark:text-slate-400 to text-slate-500 if missing
  // Using negative lookahead to ensure it doesn't already have a dark:text- variant right after
  content = content.replace(/text-slate-500(?!\s+dark:text-)/g, 'text-slate-500 dark:text-slate-400');

  // Fix 2: hover:bg-slate-100 dark:bg-slate-800 -> hover:bg-slate-100 dark:hover:bg-slate-800 (when it was obviously meant to be hover)
  // Look for hover:bg-slate-100 dark:bg-slate-800 and change to dark:hover
  content = content.replace(/hover:bg-slate-100\s+dark:bg-slate-800(?!\/)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');
  content = content.replace(/hover:bg-slate-50\s+dark:hover:bg-slate-800/g, 'hover:bg-slate-50 dark:hover:bg-slate-800'); // already fine but let's check for hover:bg-slate-50 missing dark
  
  // Fix hover:bg-slate-50 missing dark counterpart
  content = content.replace(/hover:bg-slate-50(?!\s+dark:hover:bg-)/g, 'hover:bg-slate-50 dark:hover:bg-slate-800');
  
  // Fix hover:bg-slate-100 missing dark counterpart
  content = content.replace(/hover:bg-slate-100(?!\s+dark:hover:bg-)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');

  // Fix disabled states
  content = content.replace(/disabled:bg-slate-100\s+dark:bg-slate-800\s+disabled:text-slate-500/g, 'disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500');

  // Fix empty state td text
  content = content.replace(/text-center text-slate-500/g, 'text-center text-slate-500 dark:text-slate-400');
  // the above might duplicate if rule 1 already hit, let's just rely on rule 1.
  
  // Clean up any double dark:text-slate-400 we might have accidentally created
  content = content.replace(/dark:text-slate-400\s+dark:text-slate-400/g, 'dark:text-slate-400');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
};

const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkSync(fullPath);
    } else {
      processFile(fullPath);
    }
  }
};

dirsToProcess.forEach(dir => {
  if (fs.existsSync(dir)) walkSync(dir);
});

console.log('Sweep completed.');
