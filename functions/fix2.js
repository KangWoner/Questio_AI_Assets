const fs = require('fs');
let content = fs.readFileSync('src/index.ts', 'utf8');

// Replace corrupted blocks for CSV parsing
const goodBlock = `const university = getVal(['university', '대학교', '대학']);
            const year = getVal(['year', '출제년도', '연도']);
            const category = getVal(['category', '문제유형', '분류']);
            const questionLink = getVal(['question_link', 'prob_public', '문제해설']);
            const solutionLink = getVal(['solution_link', 'sol_public', '해설링크', '풀이링크']);
            const title = getVal(['문서제목', 'title', '제목']);`;

// We use regex to match from `const university` to `const title` preserving the indentation
content = content.replace(/const university = getVal.*?\n.*?const title = getVal.*?;/gs, goodBlock);

fs.writeFileSync('src/index.ts', content);
