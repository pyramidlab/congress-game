'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {changedSound,countdownBeat,soundRate,soundSamples,type GameSound} from './game-sounds';
import type {PublicGame} from './types';

class SoundPlayer{
 readonly context=new AudioContext();
 private master=this.context.createGain();
 private buffers=new Map<GameSound,AudioBuffer>();
 private sources=new Set<AudioBufferSourceNode>();
 constructor(volume:number){this.master.gain.value=volume;this.master.connect(this.context.destination);}
 setVolume(volume:number){this.master.gain.setTargetAtTime(volume,this.context.currentTime,.025);}
 play(name:GameSound){
  if(this.context.state!=='running')return;
  let buffer=this.buffers.get(name);
  if(!buffer){const samples=soundSamples(name);buffer=this.context.createBuffer(1,samples.length,soundRate);buffer.copyToChannel(samples,0);this.buffers.set(name,buffer);}
  const source=this.context.createBufferSource();source.buffer=buffer;source.connect(this.master);this.sources.add(source);
  source.onended=()=>{source.disconnect();this.sources.delete(source);};source.start();
 }
 stop(){for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();}
 dispose(){this.stop();void this.context.close().catch(()=>{});}
}

export function useGameSounds(game:PublicGame|null,offset:number){
 const [enabled,setEnabled]=useState(false),[volume,setVolume]=useState(.45),[error,setError]=useState('');
 const player=useRef<SoundPlayer|null>(null),previous=useRef<PublicGame|null>(null),expired=useRef(new Set<string>());
 const finish=useCallback((attempt:string)=>{if(expired.current.has(attempt))return;expired.current.add(attempt);player.current?.play('time-up');},[]);
 const unlock=async()=>{player.current??=new SoundPlayer(volume);await player.current.context.resume();if(player.current.context.state!=='running')throw Error('Audio is not ready. Click Sound on again.');setError('');return player.current;};
 const toggle=async()=>{
  if(enabled){player.current?.stop();setEnabled(false);return;}
  try{await unlock();setEnabled(true);}catch{setError('Could not enable sound. Check your browser and speakers, then try again.');}
 };
 const preview=async()=>{if(game?.phase==='question')return;try{const audio=await unlock();audio.stop();setEnabled(true);audio.play('countdown-preview');}catch{setError('Could not play the preview. Check your browser and speakers.');}};
 useEffect(()=>{player.current?.setVolume(volume);},[volume]);
 useEffect(()=>()=>{player.current?.dispose();player.current=null;},[]);
 useEffect(()=>{
  if(!game){previous.current=null;return;}
  const before=previous.current;previous.current=game;
  if(!enabled)return;
  if((game.phase==='paused'&&before?.phase!=='paused')||(game.phase==='question'&&game.round?.attempt!==before?.round?.attempt))player.current?.stop();
  const sound=changedSound(before,game,Date.now()+offset);
  if(sound==='time-up'&&game.round)finish(game.round.attempt);
  else if(sound){if(sound==='winner')player.current?.stop();player.current?.play(sound);}
 },[game,enabled,offset,finish]);
 const attempt=game?.round?.attempt,endsAt=game?.round?.endsAt,phase=game?.phase;
 useEffect(()=>{
  if(!enabled||phase!=='question'||!attempt||!endsAt)return;
  if(endsAt<=Date.now()+offset){expired.current.add(attempt);return;}
  let last='',active=true;
  const tick=()=>{
   if(!active)return;const remaining=endsAt-(Date.now()+offset);
   if(remaining<=0){finish(attempt);return;}
   const beat=countdownBeat(remaining);if(beat&&beat.key!==last){last=beat.key;player.current?.play(beat.sound);}
  };
  // Sample the shared deadline; missed beats are skipped rather than replayed.
  tick();const interval=setInterval(tick,75);
  return()=>{active=false;clearInterval(interval);};
 },[enabled,phase,attempt,endsAt,offset,finish]);
 return {enabled,volume,setVolume,toggle,preview,previewAvailable:game?.phase!=='question',error};
}
