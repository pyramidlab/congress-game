import {createHash, randomInt, randomUUID} from 'node:crypto';
import {initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {onValueCreated,onValueWritten} from 'firebase-functions/v2/database';
import {onTaskDispatched} from 'firebase-functions/v2/tasks';
import {setGlobalOptions} from 'firebase-functions/v2';
import {newGame} from './seed';
import {hydrate,project,rank,transition,username,validateContent,clean} from './engine';
import {exportsFor} from './export';
import type {Game,Snapshot,Player} from './types';
initializeApp();
const region='europe-west1';
// The local RTDB emulator routes database triggers only through us-central1.
const databaseRegion=process.env.FUNCTIONS_EMULATOR==='true'?'us-central1':region;
setGlobalOptions({region,maxInstances:20});
const db=getDatabase();
const callableOptions={enforceAppCheck:process.env.FUNCTIONS_EMULATOR!=='true' && process.env.ENFORCE_APP_CHECK!=='false',timeoutSeconds:60};
function pinOf(value:unknown):string {const pin=String(value??'');if(!/^\d{6}$/.test(pin))throw new HttpsError('invalid-argument','Enter a six-digit PIN.');return pin;}
function auth(r:{auth?:{uid:string;token:Record<string,unknown>}}):string {if(!r.auth)throw new HttpsError('unauthenticated','Please sign in again.');return r.auth.uid;}
function admin(r:{auth?:{uid:string;token:Record<string,unknown>}}):string {const uid=auth(r);if(r.auth!.token.admin!==true)throw new HttpsError('permission-denied','This account is not a host.');return uid;}
async function snapshot(pin:string):Promise<Snapshot> {
 const [g,m,a]=await Promise.all([db.ref('games/'+pin).get(),db.ref('members/'+pin).get(),db.ref('answers/'+pin).get()]);
 if(!g.exists())throw new HttpsError('not-found','Game not found.');
 return {game:hydrate(g.val()),members:m.val()??{},answers:a.val()??{}};
}
async function publish(s:Snapshot) {
 const {publicGame,results}=project(s.game,s.members,s.answers);
 await db.ref().update({['sessions/'+s.game.pin]:publicGame,['results/'+s.game.pin]:results});
}
async function withLock<T>(pin:string,fn:()=>Promise<T>):Promise<T> {
 const owner=randomUUID(),ref=db.ref('locks/'+pin),now=Date.now();
 const lease=await ref.transaction(v=>!v||v.until<now?{owner,until:now+90000}:undefined);
 if(!lease.committed)throw new HttpsError('aborted','Another host action is finishing. Please retry.');
 // A transaction can first run with an empty local cache. Returning null lets
 // the server supply its actual value before checking ownership on retry.
 try{return await fn();}finally{await ref.transaction(v=>!v||v.owner===owner?null:undefined);}
}
async function schedule(g:Game) {
 if(g.phase!=='question'||!g.round)return;
 if(process.env.FUNCTIONS_EMULATOR==='true')return; // emulator rehearsal uses the host's reveal button
 const {getFunctions}=await import('firebase-admin/functions');
 await getFunctions().taskQueue('locations/'+region+'/functions/closeQuestion').enqueue({pin:g.pin,attempt:g.round.attempt},{scheduleTime:new Date(g.round.endsAt+150)});
}
function userError(e:unknown):never {if(e instanceof HttpsError)throw e;throw new HttpsError('failed-precondition',e instanceof Error?e.message:'Please try again.');}
export const createGame=onCall(callableOptions,async r=>{
 const uid=admin(r);
 try{
  let source=r.data?.content;
  if(r.data?.templateId){const id=String(r.data.templateId);if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error('Choose a saved question set.');source=(await db.ref('hosts/'+uid+'/templates/'+id+'/content').get()).val();if(!source)throw new Error('Question set not found.');}
  if(r.data?.sourcePin){source=(await db.ref('games/'+pinOf(r.data.sourcePin)).get()).val();if(!source)throw new Error('Game not found.');}
  const content=source?validateContent(source):undefined;
  for(let i=0;i<10;i++){
   const pin=String(randomInt(100000,1000000)),g=newGame(pin,String(r.data?.name??'Ekiti Area Congress'));
   if(content)Object.assign(g,content);
   g.createdBy=uid;g.createdAt=Date.now();
   const result=await db.ref('games/'+pin).transaction(v=>v?undefined:g);
   if(!result.committed)continue;
   await publish({game:g,members:{},answers:{}});
   await db.ref('hosts/'+uid+'/rooms/'+pin).set({pin,name:g.name,createdAt:g.createdAt,phase:g.phase});return {pin};
  }
  throw new Error('Could not reserve a PIN. Retry.');
 }catch(e){userError(e);}
});
export const hostLibrary=onCall(callableOptions,async r=>{
 const uid=admin(r),root=db.ref('hosts/'+uid);
 try{
  if(r.data?.action==='save'){
   const content=validateContent(r.data.content),entry=root.child('templates').push();
   await entry.set({name:content.name,createdAt:Date.now(),content});return {id:entry.key};
  }
  if(r.data?.action==='delete'){
   const id=String(r.data.id??'');if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error('Choose a question set.');
   await root.child('templates/'+id).remove();return {ok:true};
  }
  if(r.data?.action!=='list')throw new Error('Unknown library action.');
  const [templates,rooms]=await Promise.all([root.child('templates').orderByChild('createdAt').limitToLast(50).get(),root.child('rooms').orderByChild('createdAt').limitToLast(50).get()]);
  return {templates:Object.entries(templates.val()??{}).map(([id,t])=>({id,name:(t as {name:string}).name,createdAt:(t as {createdAt:number}).createdAt})).reverse(),rooms:Object.values(rooms.val()??{}).reverse()};
 }catch(e){userError(e);}
});
export const joinGame=onCall(callableOptions,async r=>{
 const uid=auth(r),pin=pinOf(r.data?.pin);
 try {
  const existing=await db.ref('members/'+pin+'/'+uid).get();
  if(existing.exists()){if(existing.val().removed)throw new Error('The host has removed this player.');return {player:existing.val()};}
  const gameSnap=await db.ref('games/'+pin).get();if(!gameSnap.exists())throw new Error('Game not found. Check the PIN.');
  const g=hydrate(gameSnap.val());
  if(g.phase!=='lobby'&&!(g.phase==='question'&&g.allowLate))throw new Error('Game already started.');
  const rateNow=Date.now(),ip=createHash('sha256').update(r.rawRequest.ip??'unknown').digest('hex').slice(0,24);
  for(const [key,limit] of [[uid,10],['ip-'+ip,600]] as [string,number][]){
   const rate=await db.ref('rateLimits/join/'+key).transaction(v=>{if(!v||rateNow-v.start>60000)return {start:rateNow,count:1};if(v.count>=limit)return;return {...v,count:v.count+1};});
   if(!rate.committed)throw new HttpsError('resource-exhausted','Too many join attempts. Wait a moment and retry.');
  }
  const name=username(r.data?.name),campus=String(r.data?.campus??'');
  if(!g.campuses.includes(campus))throw new Error('Choose a campus.');
  const key=Buffer.from(name.toLocaleLowerCase('en')).toString('base64url'),nameRef=db.ref('names/'+pin+'/'+key);
  const reserved=await nameRef.transaction(v=>!v||v===uid?uid:undefined);
  if(!reserved.committed)throw new Error('That name is taken. Try adding your initials.');
  const player:Player={uid,name,campus,joinedAt:Date.now()};
  // Recheck after name reservation; a host may have closed the lobby in between.
  const latest=(await db.ref('games/'+pin).get()).val() as Game;
  if(latest.phase!=='lobby'&&!(latest.phase==='question'&&latest.allowLate)){await nameRef.transaction(v=>!v||v===uid?null:undefined);throw new Error('Game already started.');}
  await db.ref('members/'+pin+'/'+uid).set(player);
  return {player};
 }catch(e){userError(e);}
});
export const hostCommand=onCall(callableOptions,async r=>{
 admin(r);const pin=pinOf(r.data?.pin);
 try{return await withLock(pin,async()=>{
  const s=await snapshot(pin),action=String(r.data?.action??''),payload=r.data?.payload??{};
  const expected=Number(r.data?.revision);
  const requestId=String(r.data?.requestId??'');if(!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw new Error('A command identifier is required.');
  const processed=db.ref('commands/'+pin+'/'+requestId);
  if((await processed.get()).exists())return {revision:s.game.revision};
  if(expected!==s.game.revision)throw new HttpsError('aborted','The board changed. Review it and try again.');
  if(action==='save'){
   if(s.game.phase!=='lobby')throw new Error('Content is locked once the game starts. Create a new game to change questions.');
   const c=validateContent(payload);const members=Object.values(s.members);
   if(members.some(p=>!p.removed&&!c.campuses.includes(p.campus)))throw new Error('A joined player belongs to a campus you removed.');
   Object.assign(s.game,c);s.game.revision++;
  }else if(action==='remove'||action==='rename'){
   const uid=String(payload.uid??''),p=s.members[uid];if(!p)throw new Error('Player not found.');
   if(action==='remove')p.removed=true;
   else {
    const name=username(payload.name),key=Buffer.from(name.toLocaleLowerCase('en')).toString('base64url');
    const claim=await db.ref('names/'+pin+'/'+key).transaction(v=>!v||v===uid?uid:undefined);
    if(!claim.committed)throw new Error('That name is already taken.');p.name=name;
   }
   await db.ref('members/'+pin+'/'+uid).set(p);s.game.revision++;
  }else{
   s.game=transition(s.game,action,payload,Date.now(),rank(s.game,s.members,s.answers),randomUUID());
  }
  // Closing the authoritative gate happens before reading the final answer set.
  await db.ref('games/'+pin).set(s.game);
  s.answers=(await db.ref('answers/'+pin).get()).val()??{};
  await publish(s);
  await processed.set({at:Date.now(),revision:s.game.revision});
  try{await schedule(s.game);await db.ref('scheduler/'+pin).set({ok:true,at:Date.now()});}
  catch(e){await db.ref('scheduler/'+pin).set({ok:false,at:Date.now()});console.error('Question timer scheduling failed',pin,e);}
  return {revision:s.game.revision};
 });}catch(e){userError(e);}
});
export const closeQuestion=onTaskDispatched({region,retryConfig:{maxAttempts:5,minBackoffSeconds:2},rateLimits:{maxConcurrentDispatches:10}},async r=>{
 const pin=pinOf(r.data.pin);
 await withLock(pin,async()=>{
  const s=await snapshot(pin);
  if(!s.game.round||s.game.phase!=='question'||s.game.round.attempt!==r.data.attempt||Date.now()<s.game.round.endsAt)return;
  s.game=transition(s.game,'reveal',{},Date.now());
  await db.ref('games/'+pin).set(s.game);
  s.answers=(await db.ref('answers/'+pin).get()).val()??{};await publish(s);
 });
});
export const memberChanged=onValueWritten({ref:'/members/{pin}/{uid}',region:databaseRegion,retry:true},async e=>{
 await withLock(e.params.pin,async()=>{await publish(await snapshot(e.params.pin));});
});
export const answerReceived=onValueCreated({ref:'/answers/{pin}/{attempt}/{uid}',region:databaseRegion,retry:true},async e=>{
 const {pin,attempt,uid}=e.params;
 // Idempotent delivery: one marker per player, even if this trigger is retried.
 await db.ref('answerMarkers/'+pin+'/'+attempt+'/'+uid).set(true);
 const snap=await db.ref('answerMarkers/'+pin+'/'+attempt).get();
 await db.ref('progress/'+pin+'/'+attempt+'/count').transaction(value=>Math.max(Number(value)||0,snap.numChildren()));
});
export const exportGame=onCall(callableOptions,async r=>{admin(r);const pin=pinOf(r.data?.pin);return exportsFor(await snapshot(pin));});
export const playerReview=onCall(callableOptions,async r=>{
 const uid=auth(r),s=await snapshot(pinOf(r.data?.pin));
 if(!s.members[uid]||s.members[uid].removed)throw new HttpsError('permission-denied','Join this game first.');
 if(!['podium','teams','feud','winner','ended'].includes(s.game.phase))throw new HttpsError('failed-precondition','Your review opens when the quiz finishes.');
 return {questions:s.game.rounds.filter(round=>!round.active&&!round.void).map(round=>{
  const q=s.game.questions[round.questionIndex],a=s.answers[round.attempt]?.[uid];return {text:q.text,options:q.options,correct:q.correct,choice:a?.option??null,practice:!!q.practice};
 })};
});
export const automaticBackup=onValueWritten({ref:'/games/{pin}/phase',region:databaseRegion,retry:true},async e=>{
 const pin=e.params.pin,owner=(await db.ref('games/'+pin+'/createdBy').get()).val();
 if(owner&&e.data.after.exists())await db.ref('hosts/'+owner+'/rooms/'+pin).update({phase:e.data.after.val()});
 if(!['podium','winner','ended'].includes(String(e.data.after.val())))return;
 try{
  const s=await snapshot(pin),out=exportsFor(s),prefix='backups/'+pin+'/'+Date.now();
  const {getStorage}=await import('firebase-admin/storage');
  await Promise.all([
   getStorage().bucket().file(prefix+'/players.csv').save(out.players,{resumable:false,contentType:'text/csv; charset=utf-8'}),
   getStorage().bucket().file(prefix+'/campuses.csv').save(out.campuses,{resumable:false,contentType:'text/csv; charset=utf-8'}),
   getStorage().bucket().file(prefix+'/game.json').save(JSON.stringify(clean(s)),{resumable:false,contentType:'application/json'})
  ]);
  await db.ref('backups/'+pin).set({ok:true,path:prefix,at:Date.now()});
 }catch(error){await db.ref('backups/'+pin).set({ok:false,at:Date.now()});throw error;}
});
