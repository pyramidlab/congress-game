'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {onValue,ref,set,serverTimestamp,onDisconnect,get} from 'firebase/database';
import {callable} from '@/lib/firebase';
import {firebaseClient,configured} from './firebase';
import {restoreGame,restorePublic} from './restore';
import type {Game,Player,PlayerResult,PublicGame,Submission} from './types';
export type GameView={game:PublicGame|null;privateGame:Game|null;member:Player|null;members:Player[];result:PlayerResult|null;submission:Submission|null;connected:boolean;offset:number;count:number;loading:boolean;error:string;backup?:{ok:boolean;at:number};scheduler?:{ok:boolean}};
const blank:GameView={game:null,privateGame:null,member:null,members:[],result:null,submission:null,connected:false,offset:0,count:0,loading:true,error:''};
export function useGame(pin:string,demo:boolean,host=false){
 const [view,setView]=useState<GameView>(blank),[refresh,setRefresh]=useState(0);
 const pendingAnswers=useRef(new Set<string>());
 useEffect(()=>{
  let live=true,stops:(()=>void)[]=[];
 setView(blank);
  const patch=(p:Partial<GameView>)=>{if(live)setView(v=>({...v,...p}));};
  if(!/^\d{6}$/.test(pin)){patch({loading:false});return;}
  if(demo){
   import('./demo').then(d=>{if(!live)return;stops.push(d.demoSubscribe(s=>{const v=d.demoView(s,d.demoUid());patch({game:v.publicGame,privateGame:host?v.privateGame:null,member:v.member,members:host?Object.values(s.members):[],result:v.results[d.demoUid()]??null,submission:v.submission,count:v.count,connected:true,loading:false,error:''});}));});
  }else if(!configured){patch({loading:false,error:'Live play is not connected yet. Please check with the organiser.'});}
  else{
   firebaseClient().then(async c=>{
    if(!live)return;const uid=c.auth.currentUser!.uid;
    const watch=<T,>(path:string,fn:(value:T)=>void)=>{stops.push(onValue(ref(c.db,path),s=>fn(s.val()),e=>patch({error:e.message,loading:false})));};
    watch<boolean>('.info/connected',connected=>patch({connected:!!connected}));
    watch<number>('.info/serverTimeOffset',offset=>patch({offset:offset??0}));
    watch<PublicGame>('sessions/'+pin,game=>patch({game:game?restorePublic(game):null,loading:false}));
    watch<Player>('members/'+pin+'/'+uid,member=>patch({member}));
    watch<PlayerResult>('results/'+pin+'/'+uid,result=>patch({result}));
    if(host){
     await callable('hostAccess')({});if(!live)return;
    }
   }).catch(e=>patch({error:e.message,loading:false}));
  }
  return()=>{live=false;stops.forEach(stop=>stop());};
 },[pin,demo,host,refresh]);

 useEffect(()=>{
  if(demo||!host||!view.game||!view.connected)return;let live=true;
  callable<{pin:string},{game:Game;members:Player[];backup:GameView['backup']}>('hostState')({pin}).then(r=>{if(live)setView(v=>({...v,privateGame:restoreGame(r.data.game),members:r.data.members??[],backup:r.data.backup,error:''}));}).catch(()=>{});
  return()=>{live=false;};
 },[pin,demo,host,view.game?.revision,view.game?.playerCount,view.connected,refresh]);
 const attempt=view.game?.round?.attempt;
 useEffect(()=>{
  if(demo||!configured||!pin||view.game?.phase!=='question'||!view.connected)return;
  let stopped=false,busy=false;
  const tick=async()=>{
   if(stopped||busy)return;busy=true;
   try{
    if(host)await callable('gameProgress')({pin});
    const deadline=view.game?.round?.endsAt??Infinity;
    const delay=host||!view.member?100:1800;
    if(Date.now()+view.offset>=deadline+delay)await callable('syncGame')({pin});
   }catch{}finally{busy=false;}
  };
  const deadline=view.game.round?.endsAt??Infinity;
  const delay=host||!view.member?100:1800+Math.floor(Math.random()*1500);
  const closeTimer=setTimeout(()=>{if(!stopped)void callable('syncGame')({pin}).catch(()=>{});},Math.max(0,deadline-(Date.now()+view.offset)+delay));
  void tick();const interval=setInterval(()=>void tick(),host?2000:2000+Math.floor(Math.random()*1500));
  return()=>{stopped=true;clearInterval(interval);clearTimeout(closeTimer);};
 },[pin,demo,host,view.game?.phase,attempt,view.game?.round?.endsAt,view.connected,view.member?.uid,view.offset]);
 useEffect(()=>{
  if(demo||!configured||!attempt)return;let live=true;const stops:(()=>void)[]=[];
  setView(v=>({...v,submission:null,count:0}));
  firebaseClient().then(c=>{if(!live)return;
   stops.push(onValue(ref(c.db,'answers/'+pin+'/'+attempt+'/'+c.auth.currentUser!.uid),s=>{if(live&&!pendingAnswers.current.has(attempt))setView(v=>({...v,submission:s.val()}));}));
   stops.push(onValue(ref(c.db,'progress/'+pin+'/'+attempt+'/count'),s=>{if(live)setView(v=>({...v,count:s.val()??0}));}));
  });return()=>{live=false;stops.forEach(s=>s());};
 },[pin,demo,attempt]);
 useEffect(()=>{
  if(demo||!view.member||view.member.removed||!configured)return;
  let live=true;let stop:(()=>void)|undefined;
  firebaseClient().then(c=>{if(!live)return;const presence=ref(c.db,'presence/'+pin+'/'+c.auth.currentUser!.uid);
   stop=onValue(ref(c.db,'.info/connected'),async s=>{if(!s.val()||!live)return;try{await onDisconnect(presence).set({online:false,at:serverTimestamp()});if(live)await set(presence,{online:true,at:serverTimestamp()});}catch{}});
  });return()=>{live=false;stop?.();};
 },[pin,demo,view.member?.uid,view.member?.removed]);
 const join=useCallback(async(name:string,campus:string)=>{
  if(demo){const d=await import('./demo');return d.demoJoin(name,campus);}
  const c=await firebaseClient();await callable('joinGame')({pin,name,campus});
 },[pin,demo]);
 const answer=useCallback(async(option:number)=>{
  if(demo){const d=await import('./demo');return d.demoAnswer(option);}
  const c=await firebaseClient(),r=view.game?.round;if(!r)throw new Error('No question is open.');
  const path=ref(c.db,'answers/'+pin+'/'+r.attempt+'/'+c.auth.currentUser!.uid);
  pendingAnswers.current.add(r.attempt);
  try{
   try{await set(path,{option,attempt:r.attempt,pausedMs:r.pausedMs,receivedAt:serverTimestamp()});}
   catch(error){const saved=await get(path);if(!saved.exists())throw error;}
   const saved=await get(path);
   setView(v=>v.game?.round?.attempt===r.attempt?{...v,submission:saved.val()}:v);
  }finally{pendingAnswers.current.delete(r.attempt);}
 },[pin,demo,view.game?.round]);
 const command=useCallback(async(action:string,payload:Record<string,unknown>={})=>{
  if(demo){const d=await import('./demo');return d.demoCommand(action,payload);}
  const c=await firebaseClient();await callable('hostCommand')({pin,action,payload,revision:view.privateGame?.revision,requestId:crypto.randomUUID()});
 },[pin,demo,view.privateGame?.revision]);
 return {...view,join,answer,command,reconnect:()=>setRefresh(n=>n+1)};
}
