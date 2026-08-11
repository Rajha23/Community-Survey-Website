const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// The problematic string with escaped backticks
code = code.split('\\`').join('`');
code = code.split('\\$').join('$');

fs.writeFileSync('main.js', code);
console.log('Fixed main.js');
