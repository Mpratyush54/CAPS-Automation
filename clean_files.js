const fs = require('fs');
const path = 'd:/CAPS-Automaion-frontend/src/pages/Reports.jsx';
const content = fs.readFileSync(path, 'utf8');
const cleaned = content.replace(/[^\x00-\x7F]/g, (char) => {
    // Keep common symbols if needed, otherwise drop
    return char; 
}).normalize('NFKC'); 
fs.writeFileSync(path, cleaned, 'utf8');
console.log('Cleaned Reports.jsx');
