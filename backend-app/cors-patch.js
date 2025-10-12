const fs = require('fs');
const file = 'dist/middleware/index.js';
let content = fs.readFileSync(file, 'utf8');

// 找到corsOptions的origin函数，简化为始终允许
const searchPattern = /origin: \(origin, callback\) => \{[\s\S]*?\n\s{4}\},/;
const replacement = `origin: (origin, callback) => {
        // Temporary: Allow all origins for testing
        return callback(null, true);
    },`;

content = content.replace(searchPattern, replacement);
fs.writeFileSync(file, content);
console.log('CORS已配置为允许所有源');
