import type {PublicGame} from './types';
import type {GiantState} from './core/giant';
export const soundNames=['tick','urgent','time-up','reveal','strike','winner','countdown-preview'] as const;
export type GameSound=typeof soundNames[number];
export const soundRate=22050;
const duration:Record<GameSound,number>={tick:.085,urgent:.095,'time-up':1.1,reveal:.65,strike:.4,winner:2.1,'countdown-preview':6.15};

/** Original, deterministic sounds; no audio downloads are needed for playback. */
export function soundSamples(name:GameSound,rate=soundRate):Float32Array<ArrayBuffer>{
 const data=new Float32Array(Math.ceil(duration[name]*rate));
 const note=(start:number,length:number,hz:number,level:number,bright=false)=>{
  const from=Math.round(start*rate),count=Math.round(length*rate);
  for(let i=0;i<count&&from+i<data.length;i++){
   const t=i/rate,attack=Math.min(1,t/.004),release=Math.pow(Math.max(0,1-i/count),2);
   const phase=2*Math.PI*hz*t;
   data[from+i]+=level*attack*release*(Math.sin(phase)+(bright ? .22*Math.sin(phase*2)+.08*Math.sin(phase*3) : 0));
  }
 };
 if(name==='tick'||name==='urgent'){
  note(0,name==='tick'?.075:.085,name==='tick'?1550:2150,.38,true);
  note(0,.025,name==='tick'?3100:4300,.12);
 }else if(name==='reveal'){
  [523.25,659.25,783.99,1046.5].forEach((hz,i)=>note(i*.085,.33,hz,.34,true));
 }else if(name==='strike'){
  note(0,.38,110,.34,true);note(0,.34,146.83,.27,true);
 }else if(name==='time-up'){
  [440,349.23,261.63].forEach((hz,i)=>note(i*.18,.48,hz,.36,true));
  note(.36,.72,130.81,.17);
 }else if(name==='winner'){
  [523.25,659.25,783.99,1046.5].forEach((hz,i)=>note(i*.16,.38,hz,.28,true));
  [523.25,659.25,783.99,1046.5].forEach(hz=>note(.82,1.25,hz,.16,true));
  [0,.32,.64,.82].forEach(at=>note(at,.16,65.4,.24));
 }else{
  const mix=(clip:Float32Array,at:number)=>{const start=Math.round(at*rate);for(let i=0;i<clip.length&&start+i<data.length;i++)data[start+i]+=clip[i];};
  const tick=soundSamples('urgent',rate);for(let i=0;i<10;i++)mix(tick,i*.5);
  mix(soundSamples('time-up',rate),5);
 }
 let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));
 if(peak>.75)for(let i=0;i<data.length;i++)data[i]*=.75/peak;
 return data;
}

export function countdownBeat(remainingMs:number){
 if(!Number.isFinite(remainingMs)||remainingMs<=0)return null;
 const urgent=remainingMs<=5000,interval=urgent?500:1000;
 return {key:(urgent?'urgent:':'tick:')+Math.ceil(remainingMs/interval),sound:urgent?'urgent' as const:'tick' as const};
}
type Signal=Pick<PublicGame,'pin'|'phase'|'round'|'feud'> & {giant?:Pick<GiantState,'status'|'selected'|'players'|'turn'>};
export function changedSound(before:Signal|null,after:Signal,now:number):GameSound|null{
 // Reconnecting or enabling audio must not replay historical results.
 if(!before||before.pin!==after.pin)return null;
 if(before.phase!==after.phase){
  if(after.phase==='winner'||after.phase==='podium')return 'winner';
  if(after.phase==='reveal')return before.phase==='question'&&now>=(before.round?.endsAt??Infinity)?'time-up':'reveal';
 }
 if(before.phase==='giant'&&after.phase==='giant'&&before.giant&&after.giant){
  if(after.giant.status==='confirm'&&(before.giant.status!=='confirm'||before.giant.selected!==after.giant.selected))return 'urgent';
  if(after.giant.status==='result'&&before.giant.status!=='result'){
   const player=after.giant.players[after.giant.turn],previous=before.giant.players.find(p=>p.id===player?.id);
   return player&&previous&&player.lives<previous.lives?'strike':'reveal';
  }
 }
 if(before.phase==='feud'&&after.phase==='feud'){
  if(after.feud.strikes>before.feud.strikes)return 'strike';
  if(after.feud.revealed.length>before.feud.revealed.length||(!before.feud.awarded&&after.feud.awarded))return 'reveal';
 }
 return null;
}
