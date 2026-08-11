import fs from 'fs';

const text = fs.readFileSync('questions.txt', 'utf8');
const lines = text.split('\n');

const questions = [];
let currentQ = null;

lines.forEach(line => {
  line = line.trim();
  if (!line) return;
  
  if (line.match(/^Q\d+\./)) {
    if (currentQ) questions.push(currentQ);
    currentQ = {
      id: line.split('.')[0].trim(),
      text: line,
      options: [],
      type: 'checkbox', // default
      limit: 3 // default
    };
    
    // Check limits
    const lower = line.toLowerCase();
    if (lower.includes('(select one)')) {
      currentQ.type = 'radio';
      currentQ.limit = 1;
    } else if (lower.includes('(select up to five)')) {
      currentQ.limit = 5;
    } else if (lower.includes('(select up to three)')) {
      currentQ.limit = 3;
    } else if (lower.includes('(select all that apply)')) {
      currentQ.limit = 99; // no practical limit
    }
  } else if (line.startsWith('☐')) {
    let optText = line.replace('☐', '').trim();
    currentQ.options.push(optText);
  }
});
if (currentQ) questions.push(currentQ);

const jsCode = `export const surveyQuestions = ${JSON.stringify(questions, null, 2)};`;
fs.writeFileSync('surveyData.js', jsCode);
console.log('Successfully generated surveyData.js with ' + questions.length + ' questions.');
