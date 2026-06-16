import fs from 'fs';
import path from 'path';

const filePath = path.resolve('src/pages/Vault.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Order matters to prevent double replacements
content = content.replace(/descriptions/g, 'models');
content = content.replace(/Descriptions/g, 'Models');
content = content.replace(/description/g, 'model');
content = content.replace(/Description/g, 'Model');
content = content.replace(/descSearch/g, 'modelSearch');
content = content.replace(/DescSearch/g, 'ModelSearch');
content = content.replace(/isDescDropdownOpen/g, 'isModelDropdownOpen');
content = content.replace(/IsDescDropdownOpen/g, 'IsModelDropdownOpen');
content = content.replace(/editingDescName/g, 'editingModelName');
content = content.replace(/EditingDescName/g, 'EditingModelName');
content = content.replace(/newDescName/g, 'newModelName');
content = content.replace(/NewDescName/g, 'NewModelName');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Renamed successfully in Vault.tsx');
