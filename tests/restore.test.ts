import assert from 'node:assert/strict';
import {test} from 'node:test';
import {newGame} from '../functions/src/seed';
import {project,transition} from '../functions/src/engine';
import {restoreGame,restorePublic} from '../src/lib/restore';
test('a new Firebase lobby tolerates omitted empty collections',()=>{
 const g=newGame('123456');const {publicGame}=project(g,{},{});
 for(const key of ['leaders','recent','teams'] as const)delete (publicGame as Partial<typeof publicGame>)[key];
 delete (publicGame.feud as Partial<typeof publicGame.feud>).revealed;
 const restored=restorePublic(publicGame);assert.deepEqual(restored.recent,[]);assert.deepEqual(restored.leaders,[]);assert.deepEqual(restored.teams,[]);assert.deepEqual(restored.feud.revealed,[]);
 delete (g as Partial<typeof g>).rounds;delete (g as Partial<typeof g>).teams;
 assert.deepEqual(restoreGame(g).rounds,[]);assert.deepEqual(g.teams,[]);
});
test('host leaderboard defaults to campuses after scored question five',()=>{
 let g=newGame('123456');g.index=5;g.phase='reveal';g=transition(g,'leaderboard');assert.equal(g.leaderboardMode,'campus');g=transition(g,'board',{mode:'individual'});assert.equal(g.leaderboardMode,'individual');
});
