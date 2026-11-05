import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,serverTimestamp,goOffline} from 'firebase/database';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(new URL('../package.json',import.meta.url));
process.env.GCLOUD_PROJECT='demo-congress';process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';
const admin=require('firebase-admin');admin.initializeApp({projectId:'demo-congress',databaseURL:'https://demo-congress-default-rtdb.firebaseio.com'});
const apps:ReturnType<typeof initializeApp>[]=[];
async function client(name:string){const app=initializeApp({projectId:'demo-congress',apiKey:'demo-key',databaseURL:'https://demo-congress-default-rtdb.firebaseio.com'},name);apps.push(app);const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);await signInAnonymously(auth);return {auth,db,uid:auth.currentUser!.uid};}
async function main(){
 const host=await client('host-'+Date.now());await admin.auth().setCustomUserClaims(host.uid,{admin:true});await host.auth.currentUser!.getIdToken(true);
 const call=async(c:Awaited<ReturnType<typeof client>>,name:string,data:unknown)=>{
  const response=await fetch('http://127.0.0.1:3105/api/game/'+name,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await c.auth.currentUser!.getIdToken()},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok){const error=new Error(result.error) as Error&{code:string};error.code='functions/'+result.code;throw error;}return result as any;
 };
 const {pin}=await call(host,'createGame',{name:'Emulator full flow'});assert.match(pin,/^\d{6}$/);
 const players=[];
 for(let i=0;i<8;i++){const p=await client('p-'+i+'-'+Date.now());await call(p,'joinGame',{pin,name:'Tester '+i,campus:'EKSU'});players.push(p);}
 await assert.rejects(()=>call(players[0],'hostCommand',{pin,action:'start'}));
 const extra=await client('duplicate-'+Date.now());await assert.rejects(()=>call(extra,'joinGame',{pin,name:'Tester 0',campus:'EKSU'}));
 const command=async(action:string,payload:unknown={})=>{
  for(let tries=0;tries<30;tries++){
   const revision=(await admin.database().ref('games/'+pin+'/revision').get()).val();
   try{return await call(host,'hostCommand',{pin,action,payload,revision,requestId:crypto.randomUUID()});}catch(error){if((error as {code:string}).code!=='functions/aborted')throw error;await delay(100);}
  }throw Error('Host lock never cleared.');
 };
 const content=(await admin.database().ref('games/'+pin).get()).val();
 await command('save',{...content,questions:content.questions.map((q:any)=>({...q,seconds:120}))});
 const saved=await call(host,'hostLibrary',{action:'save',content});
 const library=await call(host,'hostLibrary',{action:'list'});assert.ok(library.templates.some((t:any)=>t.id===saved.id));assert.ok(library.rooms.some((room:any)=>room.pin===pin));
 const copy=await call(host,'createGame',{templateId:saved.id});assert.notEqual(copy.pin,pin);
 await assert.rejects(()=>call(players[0],'hostLibrary',{action:'list'}));
 console.log('Created a game, joined eight players, rejected a duplicate name and unauthorized host command.');
 await call(host,'hostAccess',{});await command('start');
 await assert.rejects(()=>call(players[0],'playerReview',{pin}));
 let g=(await get(ref(players[0].db,'sessions/'+pin))).val();assert.equal(g.current.correct,undefined);assert.equal(g.correct,undefined);
 await assert.rejects(()=>get(ref(players[0].db,'games/'+pin)));
 const attempt=g.round.attempt;await set(ref(players[0].db,'answers/'+pin+'/'+attempt+'/'+players[0].uid),{option:0,attempt,pausedMs:0,receivedAt:serverTimestamp()});
 await assert.rejects(()=>set(ref(players[0].db,'answers/'+pin+'/'+attempt+'/'+players[0].uid),{option:1,attempt,pausedMs:0,receivedAt:serverTimestamp()}));
 await admin.database().ref('games/'+pin+'/round/endsAt').set(Date.now()-1);await call(players[0],'syncGame',{pin});g=(await get(ref(players[0].db,'sessions/'+pin))).val();assert.equal(typeof g.correct,'number');
 await command('next');g=(await get(ref(players[0].db,'sessions/'+pin))).val();const privateQuestion=(await admin.database().ref('games/'+pin+'/questions/1').get()).val();
 await Promise.all(players.map(p=>set(ref(p.db,'answers/'+pin+'/'+g.round.attempt+'/'+p.uid),{option:privateQuestion.correct,attempt:g.round.attempt,pausedMs:0,receivedAt:serverTimestamp()})));
 await command('reveal');const result=(await get(ref(players[0].db,'results/'+pin+'/'+players[0].uid))).val();assert.ok(result.score>0);assert.ok(result.rank>=1&&result.rank<=8);
 console.log('Protected answers, first-write-only receipt, practice and scored reveal passed.');
 const restored=await call(players[0],'joinGame',{pin,name:'ignored',campus:'EKSU'});assert.equal(restored.player.uid,players[0].uid);
 await command('finish');const review=await call(players[0],'playerReview',{pin});assert.equal(review.questions.length,2);await command('pair');g=(await get(ref(host.db,'games/'+pin))).val();assert.equal(g.teams.length,4);assert.equal(new Set(g.teams.flatMap((t:any)=>t.players)).size,8);
 await command('feud');await command('flip',{index:0});await command('strike');await command('award',{side:0});await command('undo');
 g=(await get(ref(host.db,'games/'+pin))).val();assert.equal(g.feud.awarded,false);assert.equal(g.feud.strikes,1);
 const backup=await call(host,'exportBackup',{pin});assert.equal(backup.files.length,3);const csv=await call(host,'exportGame',{pin});assert.match(csv.players,/Tester 0/);assert.match(csv.campuses,/EKSU/);
 console.log('PASS: real emulated Auth → Next.js API → Database rules → public state/results → pairing → survey controls → CSV export.');
}
const timeout=setTimeout(()=>{console.error('Integration test exceeded 180 seconds.');process.exit(1);},180000);
main().then(()=>finish(0),error=>{console.error(error);return finish(1);});
async function finish(code:number){clearTimeout(timeout);apps.forEach(app=>goOffline(getDatabase(app)));admin.database().goOffline();await Promise.all(apps.map(deleteApp));await admin.app().delete();process.exit(code);}


