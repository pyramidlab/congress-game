import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/lib/core/seed';
import {transition,project,validateContent} from '../src/lib/core/engine';
import {exportsFor} from '../src/lib/core/export';
import {restoreGame,restorePublic} from '../src/lib/restore';
import {importQuestions} from '../src/lib/csv';
const begin=(lives=3,names=['Ada','Ben','Grace'])=>transition(transition(newGame('123456','Bible Giant','bible-giant'),'giant-roster',{names,lives}),'start');
const pick=(g:ReturnType<typeof begin>,index=0)=>transition(g,'giant-pick',{index});
test('a stage CSV needs only a question, four options and its correct answer',()=>{
 const csv='question,option_a,option_b,option_c,option_d,correct_option,reference\nWho built the ark?,Noah,Moses,David,Paul,A,Genesis 6';
 const [q]=importQuestions(csv,true);assert.equal(q.correct,0);assert.equal(q.reference,'Genesis 6');assert.equal(q.practice,false);assert.throws(()=>importQuestions(csv));
});
test('Bible Giant starts independently with host-entered players and configurable lives',()=>{
 assert.throws(()=>transition(newGame('123456','Bible Giant','bible-giant'),'start'),/players/);
 const g=begin();assert.equal(g.mode,'bible-giant');assert.equal(g.phase,'giant');assert.equal(g.giant.players.length,3);assert.equal(g.giant.players[0].lives,3);assert.equal(g.round,undefined);
 assert.throws(()=>transition(newGame('123456','Giant','bible-giant'),'giant-roster',{names:['Ada','ada'],lives:3}),/different/);
 assert.throws(()=>transition(newGame('123456','Giant','bible-giant'),'giant-roster',{names:['Ada','Ben'],lives:0}),/lives/);
});
test('only a picked question is public and correct answers stay hidden until final confirmation',()=>{
 let g=begin();const secret=g.questions[1].text;assert.ok(!JSON.stringify(project(g,{},{}).publicGame).includes(secret));
 g=pick(g);let p=project(g,{},{}).publicGame;assert.equal(p.playerCount,3);assert.equal(p.giant?.current?.number,1);assert.equal(p.giant?.current?.correct,undefined);assert.ok(!JSON.stringify(p).includes(secret));
 g=transition(g,'giant-select',{option:(g.questions[0].correct+1)%4});p=project(g,{},{}).publicGame;assert.equal(p.giant?.status,'confirm');assert.equal(p.giant?.current?.correct,undefined);assert.equal(g.giant.players[0].lives,3);
 g=transition(g,'giant-final');assert.equal(g.giant.players[0].lives,2);assert.equal(project(g,{},{}).publicGame.giant?.current?.correct,g.questions[0].correct);assert.throws(()=>transition(g,'giant-final'));
});
test('a tentative answer can be changed and a correct final answer preserves lives',()=>{
 let g=pick(begin());assert.throws(()=>transition(g,'giant-final'));
 g=transition(g,'giant-select',{option:3});g=transition(g,'giant-change');assert.equal(g.giant.selected,undefined);
 g=transition(g,'giant-select',{option:g.questions[0].correct});g=transition(g,'giant-final');assert.equal(g.giant.players[0].correct,1);assert.equal(g.giant.players[0].lives,3);
 g=transition(g,'giant-next');assert.equal(g.giant.turn,1);assert.equal(g.giant.status,'pick');assert.throws(()=>transition(g,'giant-pick',{index:0}),/unused/);
});
test('players continue after losing a life and the last remaining player wins',()=>{
 let g=begin(1);for(let i=0;i<2;i++){g=pick(g,i);g=transition(g,'giant-select',{option:(g.questions[i].correct+1)%4});g=transition(g,'giant-final');assert.equal(g.giant.players[i].lives,0);g=transition(g,'giant-next');}
 assert.equal(g.phase,'winner');assert.equal(g.giant.winner,'stage-2');assert.equal(g.giant.players[2].name,'Grace');
});
test('undo restores the final-answer decision, lives and result history',()=>{
 let g=pick(begin());g=transition(g,'giant-select',{option:(g.questions[0].correct+1)%4});g=transition(g,'giant-final');g=transition(g,'undo');assert.equal(g.giant.status,'confirm');assert.equal(g.giant.players[0].lives,3);assert.equal(g.giant.history.length,0);
});
test('an exhausted pool can be extended without reusing numbers or inventing a winner',()=>{
 let g=begin();g.questions=g.questions.slice(0,1);g=pick(g);g=transition(g,'giant-select',{option:0});g=transition(g,'giant-final');g=transition(g,'giant-next');assert.equal(g.phase,'giant');assert.equal(g.giant.winner,undefined);assert.throws(()=>pick(g,0));
 g=transition(g,'giant-add',{questions:[{text:'Extra question',options:['A','B','C','D'],correct:2}]});g=pick(g,1);assert.equal(project(g,{},{}).publicGame.giant?.current?.number,2);assert.deepEqual(g.giant.used,[0,1]);
});
test('Firebase restores empty stage collections and exports stage results separately',()=>{
 const g=begin();delete (g.giant as Partial<typeof g.giant>).used;delete (g.giant as Partial<typeof g.giant>).history;restoreGame(g);assert.deepEqual(g.giant.used,[]);assert.deepEqual(g.giant.history,[]);
 const p=project(g,{},{}).publicGame;delete (p.giant as Partial<NonNullable<typeof p.giant>>).used;restorePublic(p);assert.deepEqual(p.giant?.used,[]);
 const out=exportsFor({game:g,members:{},answers:{}});assert.match(out.players,/Lives remaining/);assert.match(out.players,/Ada/);assert.match(out.campuses,/Starting lives/);
 assert.equal(validateContent(g).mode,'bible-giant');assert.deepEqual(validateContent(g).surveys,[]);
});
