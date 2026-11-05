import fs from 'node:fs';
import {surveys} from '../functions/src/seed';
const template=fs.readFileSync('scripts/offline-template.html','utf8');
fs.mkdirSync('public',{recursive:true});
fs.writeFileSync('public/offline-board.html',template.replace('__SURVEY_JSON__',JSON.stringify(surveys).replace(/</g,'\\u003c')));
console.log('Generated a standalone offline board with '+surveys.length+' starter surveys.');
