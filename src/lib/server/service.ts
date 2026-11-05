import 'server-only';
import {createHash,randomInt,randomUUID} from 'node:crypto';
import {adminServices} from './admin';
import {isHost} from '../host-access';
import {event} from '../event';
import {newGame} from '../core/seed';
import {hydrate,project,rank,transition,username,validateContent,clean} from '../core/engine';
import {exportsFor} from '../core/export';
import type {Game,Snapshot,Player} from '../core/types';
export class ServiceError extends Error {constructor(public code:string,message:string){super(message);}}
export type ServiceRequest={auth?:{uid:string;token:Record<string,unknown>};data:Record<string,any>;rawRequest:{ip?:string}};
const db={ref:(path?:string)=>adminServices().db.ref(path)};
async function backupIfNeeded(s:Snapshot){
 if(!['podium','winner','ended'].includes(s.game.phase))return;
 const previous=(await db.ref('backups/'+s.game.pin).get()).val();if(previous?.revision===s.game.revision&&previous.ok)return;
 const out=exportsFor(s),path='backupFiles/'+s.game.pin+'/'+s.game.revision;
 const files=[{name:'players.csv',type:'text/csv',content:out.players},{name:'campuses.csv',type:'text/csv',content:out.campuses},{name:'game.json',type:'application/json',content:JSON.stringify(clean(s))}];
 await db.ref().update({[path]:files,['backups/'+s.game.pin]:{ok:true,revision:s.game.revision,at:Date.now(),path}});
}
async function publishMembership(pin:string){
 const members=(await db.ref('members/'+pin).get()).val() as Record<string,Player>|null;
 const players=Object.values(members??{}).filter(p=>!p.removed);
 const recent=players.sort((a,b)=>b.joinedAt-a.joinedAt).slice(0,12).map(p=>({name:p.name,campus:p.campus}));
 await db.ref('sessions/'+pin).transaction(current=>!current?null:{...current,playerCount:players.length,recent});
}
export async function hostAccess(r:ServiceRequest){
 admin(r);
 return {host:true};
}
export async function hostState(r:ServiceRequest){
 admin(r);const pin=pinOf(r.data.pin);
 const [game,members,backup]=await Promise.all([db.ref('games/'+pin).get(),db.ref('members/'+pin).get(),db.ref('backups/'+pin).get()]);
 if(!game.exists())throw new ServiceError('not-found','Game not found.');
 return {game:hydrate(game.val()),members:Object.values(members.val()??{}),backup:backup.val()};
}
export async function syncGame(r:ServiceRequest){
 auth(r);const pin=pinOf(r.data.pin),initial=(await db.ref('games/'+pin).get()).val() as Game|null;
 if(!initial||initial.phase!=='question'||!initial.round||Date.now()<initial.round.endsAt)return {closed:false};
 try{return await withLock(pin,async()=>{
  const s=await snapshot(pin);if(s.game.phase!=='question'||!s.game.round||Date.now()<s.game.round.endsAt)return {closed:false};
  s.game=transition(s.game,'reveal',{},Date.now());await db.ref('games/'+pin).set(s.game);
  s.answers=(await db.ref('answers/'+pin).get()).val()??{};await publish(s);return {closed:true};
 });}catch(error){if(error instanceof ServiceError&&error.code==='aborted')return {closed:false};throw error;}
}
export async function gameProgress(r:ServiceRequest){
 admin(r);const pin=pinOf(r.data.pin),g=(await db.ref('games/'+pin).get()).val() as Game|null;
 if(!g?.round)return {count:0};
 const snap=await db.ref('answers/'+pin+'/'+g.round.attempt).get(),count=snap.numChildren();
 await db.ref('progress/'+pin+'/'+g.round.attempt+'/count').transaction(value=>Math.max(Number(value)||0,count));return {count};
}
export async function exportBackup(r:ServiceRequest){
 admin(r);const pin=pinOf(r.data.pin),meta=(await db.ref('backups/'+pin).get()).val();if(!meta?.ok)throw new ServiceError('not-found','No saved backup is available yet.');
 return {files:(await db.ref(meta.path).get()).val(),createdAt:meta.at};
}
function pinOf(value:unknown):string {const pin=String(value??'');if(!/^\d{6}$/.test(pin))throw new ServiceError('invalid-argument','Enter a six-digit PIN.');return pin;}
function auth(r:{auth?:{uid:string;token:Record<string,unknown>}}):string {if(!r.auth)throw new ServiceError('unauthenticated','Please sign in again.');return r.auth.uid;}
function admin(r:{auth?:{uid:string;token:Record<string,unknown>}}):string {
 const uid=auth(r);
 const emulated=!!(process.env.FIREBASE_AUTH_EMULATOR_HOST&&(process.env.FIREBASE_PROJECT_ID||'').startsWith('demo-'));
 if(!isHost(uid,r.auth!.token.admin,process.env.HOST_UIDS||'',emulated))throw new ServiceError('permission-denied','This account is not authorised to host games. Check HOST_UIDS.');return uid;
}
async function snapshot(pin:string):Promise<Snapshot> {
 const [g,m,a]=await Promise.all([db.ref('games/'+pin).get(),db.ref('members/'+pin).get(),db.ref('answers/'+pin).get()]);
 if(!g.exists())throw new ServiceError('not-found','Game not found.');
 return {game:hydrate(g.val()),members:m.val()??{},answers:a.val()??{}};
}
async function publish(s:Snapshot) {
 const {publicGame,results}=project(s.game,s.members,s.answers);
 try{await backupIfNeeded(s);}catch{await db.ref('backups/'+s.game.pin).set({ok:false,at:Date.now()});}
 await db.ref().update({['sessions/'+s.game.pin]:publicGame,['results/'+s.game.pin]:results});
 if(s.game.createdBy)await db.ref('hosts/'+s.game.createdBy+'/rooms/'+s.game.pin).update({phase:s.game.phase});
}
async function withLock<T>(pin:string,fn:()=>Promise<T>):Promise<T> {
 const owner=randomUUID(),ref=db.ref('locks/'+pin),now=Date.now();
 const lease=await ref.transaction(v=>!v||v.until<now?{owner,until:now+90000}:undefined);
 if(!lease.committed)throw new ServiceError('aborted','Another host action is finishing. Please retry.');
 // A transaction can first run with an empty local cache. Returning null lets
 // the server supply its actual value before checking ownership on retry.
 try{return await fn();}finally{await ref.transaction(v=>!v||v.owner===owner?null:undefined);}
}

function userError(e:unknown):never {if(e instanceof ServiceError)throw e;throw new ServiceError('failed-precondition',e instanceof Error?e.message:'Please try again.');}

export async function createGame(r:ServiceRequest){
 const uid=admin(r);
 try{
  let source=r.data?.content;
  if(r.data?.templateId){const id=String(r.data.templateId);if(!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error('Choose a saved question set.');source=(await db.ref('hosts/'+uid+'/templates/'+id+'/content').get()).val();if(!source)throw new Error('Question set not found.');}
  if(r.data?.sourcePin){source=(await db.ref('games/'+pinOf(r.data.sourcePin)).get()).val();if(!source)throw new Error('Game not found.');}
  const content=source?validateContent(source):undefined;
  for(let i=0;i<10;i++){
   const pin=String(randomInt(100000,1000000)),g=newGame(pin,String(r.data?.name??event.name));
   if(content)Object.assign(g,content);
   g.createdBy=uid;g.createdAt=Date.now();
   const result=await db.ref('games/'+pin).transaction(v=>v?undefined:g);
   if(!result.committed)continue;
   await publish({game:g,members:{},answers:{}});
   await db.ref('hosts/'+uid+'/rooms/'+pin).set({pin,name:g.name,createdAt:g.createdAt,phase:g.phase});return {pin};
  }
  throw new Error('Could not reserve a PIN. Retry.');
 }catch(e){userError(e);}
}
export async function hostLibrary(r:ServiceRequest){
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
}
export async function joinGame(r:ServiceRequest){
 const uid=auth(r),pin=pinOf(r.data?.pin);
 try {
  const existing=await db.ref('members/'+pin+'/'+uid).get();
  if(existing.exists()){if(existing.val().removed)throw new Error('The host has removed this player.');await publishMembership(pin);return {player:existing.val()};}
  const gameSnap=await db.ref('games/'+pin).get();if(!gameSnap.exists())throw new Error('Game not found. Check the PIN.');
  const g=hydrate(gameSnap.val());
  if(g.phase!=='lobby'&&!(g.phase==='question'&&g.allowLate))throw new Error('Game already started.');
  const rateNow=Date.now(),ip=createHash('sha256').update(r.rawRequest.ip??'unknown').digest('hex').slice(0,24);
  for(const [key,limit] of [[uid,10],['ip-'+ip,600]] as [string,number][]){
   const rate=await db.ref('rateLimits/join/'+key).transaction(v=>{if(!v||rateNow-v.start>60000)return {start:rateNow,count:1};if(v.count>=limit)return;return {...v,count:v.count+1};});
   if(!rate.committed)throw new ServiceError('resource-exhausted','Too many join attempts. Wait a moment and retry.');
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
  await publishMembership(pin);
  return {player};
 }catch(e){userError(e);}
}
export async function hostCommand(r:ServiceRequest){
 admin(r);const pin=pinOf(r.data?.pin);
 try{return await withLock(pin,async()=>{
  const s=await snapshot(pin),action=String(r.data?.action??''),payload=r.data?.payload??{};
  const expected=Number(r.data?.revision);
  const requestId=String(r.data?.requestId??'');if(!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))throw new Error('A command identifier is required.');
  const processed=db.ref('commands/'+pin+'/'+requestId);
  if((await processed.get()).exists())return {revision:s.game.revision};
  if(expected!==s.game.revision)throw new ServiceError('aborted','The board changed. Review it and try again.');
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

  return {revision:s.game.revision};
 });}catch(e){userError(e);}
}
export async function exportGame(r:ServiceRequest){admin(r);const pin=pinOf(r.data?.pin);return exportsFor(await snapshot(pin));}
export async function playerReview(r:ServiceRequest){
 const uid=auth(r),s=await snapshot(pinOf(r.data?.pin));
 if(!s.members[uid]||s.members[uid].removed)throw new ServiceError('permission-denied','Join this game first.');
 if(!['podium','teams','feud','winner','ended'].includes(s.game.phase))throw new ServiceError('failed-precondition','Your review opens when the quiz finishes.');
 return {questions:s.game.rounds.filter(round=>!round.active&&!round.void).map(round=>{
  const q=s.game.questions[round.questionIndex],a=s.answers[round.attempt]?.[uid];return {text:q.text,options:q.options,correct:q.correct,choice:a?.option??null,practice:!!q.practice};
 })};
}
