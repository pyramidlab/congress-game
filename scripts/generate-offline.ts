import fs from 'node:fs';
import ts from 'typescript';
import {giantQuestions} from '../src/lib/core/giant-seed';
const template=fs.readFileSync('scripts/offline-template.html','utf8');
fs.mkdirSync('public',{recursive:true});
const runtime=ts.transpileModule(fs.readFileSync('src/lib/core/giant.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/^export /gm,'');
const data={id:'starter',questions:giantQuestions,names:[],lives:3};
fs.writeFileSync('public/offline-board.html',template.replace('__GIANT_JSON__',JSON.stringify(data).replace(/</g,'\\u003c')).replace('__GIANT_RUNTIME__',runtime));
console.log('Generated a standalone Bible Giant board using the shared game engine.');
