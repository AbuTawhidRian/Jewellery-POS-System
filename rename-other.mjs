import fs from 'fs';
import path from 'path';

const files = [
  'src/pages/Ledger.tsx',
  'src/components/ThermalPrintLayout.tsx',
  'src/components/InvoicePrintLayout.tsx'
];

files.forEach(f => {
  const filePath = path.resolve(f);
  let content = fs.readFileSync(filePath, 'utf8');

  // We know these only contain item.description or similar.
  // We'll replace description -> model and Description -> Model
  content = content.replace(/descriptions/g, 'models');
  content = content.replace(/Descriptions/g, 'Models');
  content = content.replace(/description/g, 'model');
  content = content.replace(/Description/g, 'Model');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Renamed successfully in ${f}`);
});
