const fs = require('fs');
const glob = require('glob');

// Use glob to find all JSX files in src/pages
const files = glob.sync('d:/CAPS-Automaion-frontend/src/pages/*.jsx');

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        // Clean out common BOMs or non-UTF8 noise if any
        const cleaned = content.normalize('NFKC');
        fs.writeFileSync(file, cleaned, 'utf8');
        console.log(`Cleaned: ${file}`);
    } catch (e) {
        console.error(`Failed to clean ${file}:`, e.message);
    }
});
