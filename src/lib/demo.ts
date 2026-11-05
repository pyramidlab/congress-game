import {newGame} from '../../functions/src/seed';
import {hydrate,project,rank,transition,username,validateContent} from '../../functions/src/engine';
import {exportsFor} from '../../functions/src/export';
import type {Snapshot,Submission,Game} from './types';
const key='congress-demo-v1',event='congress-demo-change';
const names=['Tomi','Emmanuel','Deborah','Samuel','Esther','Daniel','Faith','Joshua','Grace','David','Mercy','Caleb'];
function initial():Snapshot {
 const g=newGame('482913');return {game:g,members:Object.fromEntries(names.map((name,i)=>['demo-'+i,{uid:'demo-'+i,name,campus:g.campuses[i%g.campuses.length],joinedAt:Date.now()+i}])),answers:{}};
}
function read():Snapshot{try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s?.game)return {...s,game:hydrate(s.game)};}catch{}const s=initial();write(s);return s;}
function write(s:Snapshot){localStorage.setItem(key,JSON.stringify(s));window.dispatchEvent(new Event(event));}
function tick(){const s=read(),g=s.game;if(g.phase!=='question'||!g.round)return;
 let changed=false;const r=g.round;s.answers[r.attempt]??={};
 names.forEach((_,i)=>{const delay=(i+1)*700;if(Date.now()>=r.startedAt+r.pausedMs+delay&&!s.answers[r.attempt]['demo-'+i]){s.answers[r.attempt]['demo-'+i]={option:i%4===0?(g.questions[g.index].correct+1)%4:g.questions[g.index].correct,receivedAt:r.startedAt+r.pausedMs+delay,attempt:r.attempt,pausedMs:r.pausedMs};changed=true;}});
 if(Date.now()>=r.endsAt){s.game=transition(g,'reveal',{},Date.now());changed=true;}
 if(changed)write(s);
}
export function demoSubscribe(listener:(s:Snapshot)=>void){let active=true;const notify=()=>{if(active)listener(read());};window.addEventListener('storage',notify);window.addEventListener(event,notify);notify();const id=setInterval(tick,500);return()=>{active=false;clearInterval(id);window.removeEventListener('storage',notify);window.removeEventListener(event,notify);};}
export function demoView(s:Snapshot,uid:string){return {...project(s.game,s.members,s.answers),privateGame:s.game,member:s.members[uid]??null,submission:s.game.round?s.answers[s.game.round.attempt]?.[uid]??null:null,count:s.game.round?Object.keys(s.answers[s.game.round.attempt]??{}).length:0};}
export function demoUid(){let uid=localStorage.getItem('congress-demo-uid');if(!uid){uid='guest-'+crypto.randomUUID();localStorage.setItem('congress-demo-uid',uid);}return uid;}
export function demoJoin(name:string,campus:string){const s=read(),uid=demoUid();if(s.members[uid])return s.members[uid];if(s.game.phase!=='lobby'&&!(s.game.phase==='question'&&s.game.allowLate))throw new Error('Game already started.');name=username(name);if(Object.values(s.members).some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new Error('That name is taken.');const p={uid,name,campus,joinedAt:Date.now()};s.members[uid]=p;write(s);return p;}
export function demoAnswer(option:number){const s=read(),r=s.game.round,uid=demoUid();if(!r||s.game.phase!=='question'||Date.now()>r.endsAt)throw new Error('This question is closed.');s.answers[r.attempt]??={};if(s.answers[r.attempt][uid])return;s.answers[r.attempt][uid]={option,receivedAt:Date.now(),attempt:r.attempt,pausedMs:r.pausedMs};write(s);}
export function demoCommand(action:string,payload:Record<string,unknown>={}){
 const s=read();
 if(action==='save'){if(s.game.phase!=='lobby')throw new Error('Content is locked after starting.');Object.assign(s.game,validateContent(payload));s.game.revision++;}
 else if(action==='remove'){const p=s.members[String(payload.uid)];if(p)p.removed=true;s.game.revision++;}
 else if(action==='rename'){const p=s.members[String(payload.uid)];if(p)p.name=username(payload.name);s.game.revision++;}
 else s.game=transition(s.game,action,payload,Date.now(),rank(s.game,s.members,s.answers),crypto.randomUUID());
 write(s);
}
export function demoReset(){write(initial());}
export function demoExport(){return exportsFor(read());}
