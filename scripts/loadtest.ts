import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {ref,set,get,serverTimestamp,goOffline,goOnline} from 'firebase/database';
import {newGame} from '../src/lib/core/seed';
import {project,rank,transition} from '../src/lib/core/engine';
import type {AnswerMap,Player} from '../src/lib/core/types';
async function main(){
 if(process.env.LOADTEST_PRODUCTION==='true')throw new Error('This runner only targets the local Firebase emulator.');
 const count=Number(process.env.LOADTEST_PLAYERS)||200,pin='987654';
 const env=await initializeTestEnvironment({projectId:'demo-congress',database:{host:'127.0.0.1',port:9000,rules:readFileSync('database.rules.json','utf8')}});
 const clients=Array.from({length:count},(_,i)=>env.authenticatedContext('bot-'+i).database());
 let g=newGame(pin);g.questions=g.questions.filter(q=>!q.practice).map(q=>({...q,seconds:60}));
 const members:Record<string,Player>=Object.fromEntries(clients.map((_,i)=>['bot-'+i,{uid:'bot-'+i,name:'Bot '+i,campus:g.campuses[i%g.campuses.length],joinedAt:i}]));
 const all:AnswerMap={},latencies:number[]=[];let accepted=0;const started=performance.now();
 try{
  await env.withSecurityRulesDisabled(c=>set(ref(c.database()),{games:{[pin]:g},members:{[pin]:members},sessions:{[pin]:project(g,members,{}).publicGame}}));
  await Promise.all(clients.map(db=>get(ref(db,'sessions/'+pin))));
  for(let round=0;round<10;round++){
   const attempt='load-round-'+round;
   g=transition(g,round===0?'start':'next',{},Date.now(),[],attempt);
   await env.withSecurityRulesDisabled(c=>set(ref(c.database(),'games/'+pin),g));
   const interrupted=round===4?clients.filter((_,i)=>i%5===0):[];
   interrupted.forEach(goOffline);
   const reconnect=setTimeout(()=>interrupted.forEach(goOnline),800);
   await Promise.all(clients.map(async(db,i)=>{const start=performance.now();await set(ref(db,'answers/'+pin+'/'+attempt+'/bot-'+i),{option:g.questions[round].correct,receivedAt:serverTimestamp(),attempt,pausedMs:0});latencies.push(performance.now()-start);accepted++;}));clearTimeout(reconnect);
   await env.withSecurityRulesDisabled(async c=>{await set(ref(c.database(),'games/'+pin+'/phase'),'reveal');all[attempt]=(await get(ref(c.database(),'answers/'+pin+'/'+attempt))).val();});
   g=transition(g,'reveal',{},Date.now());assert.equal(Object.keys(all[attempt]).length,count);
   console.log('Round '+(round+1)+': '+count+' accepted answers'+(interrupted.length?' · '+interrupted.length+' clients reconnected':''));
  }
  const rows=rank(g,members,all);assert.equal(rows.length,count);assert.equal(new Set(rows.map(p=>p.rank)).size,count);assert.ok(rows.every(p=>p.score>0));
  latencies.sort((a,b)=>a-b);const report={environment:'Local Firebase Realtime Database emulator; no WAN throttling',players:count,rounds:10,accepted,expected:count*10,reconnectedClients:Math.ceil(count/5),durationMs:Math.round(performance.now()-started),submissionP50Ms:Math.round(latencies[Math.floor(latencies.length*.5)]),submissionP95Ms:Math.round(latencies[Math.floor(latencies.length*.95)]),uniqueRanks:rows.length,passed:true};
  mkdirSync('test-results',{recursive:true});writeFileSync('test-results/loadtest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await env.cleanup();}
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
