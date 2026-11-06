'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {changedSound,countdownBeat,suspenseActive} from './game-sounds';
import {SoundPlayer} from './sound-player';
import type {PublicGame} from './types';

export function useGameSounds(game:PublicGame|null,offset:number){
 const [enabled,setEnabled]=useState(false),[volume,setVolume]=useState(.45),[suspense,setSuspense]=useState(true),[error,setError]=useState('');
 const giant=game?.mode==='bible-giant',previewAvailable=game?.phase!=='question'&&!(game?.phase==='giant'&&game.giant?.status!=='pick');
 const player=useRef<SoundPlayer|null>(null),previous=useRef<PublicGame|null>(null),expired=useRef(new Set<string>());
 const finish=useCallback((attempt:string)=>{if(expired.current.has(attempt))return;expired.current.add(attempt);player.current?.play('time-up');},[]);
 const unlock=async()=>{player.current??=new SoundPlayer(volume);await player.current.context.resume();if(player.current.context.state!=='running')throw Error('Audio is not ready. Click Sound on again.');setError('');return player.current;};
 const toggle=async()=>{
  if(enabled){player.current?.stop();setEnabled(false);return;}
  try{await unlock();setEnabled(true);}catch{setError('Could not enable sound. Check your browser and speakers, then try again.');}
 };
 const preview=async()=>{if(!previewAvailable)return;try{const audio=await unlock();audio.stop();setEnabled(true);audio.play(giant?'giant-preview':'countdown-preview');}catch{setError('Could not play the preview. Check your browser and speakers.');}};
 useEffect(()=>{player.current?.setVolume(volume);},[volume]);
 useEffect(()=>()=>{player.current?.dispose();player.current=null;},[]);
 useEffect(()=>{
  if(!game){previous.current=null;player.current?.stop();return;}
  const before=previous.current;previous.current=game;
  if(!enabled)return;
  // Preserve a deadline buzzer already playing when the server publishes its reveal.
  if(before&&(before.pin!==game.pin||before.mode!==game.mode||(before.phase!==game.phase&&game.phase!=='reveal')||(game.phase==='question'&&before.round?.attempt!==game.round?.attempt)||(game.phase==='giant'&&game.giant?.status==='pick'&&before.giant?.status!=='pick')))player.current?.stop();
  const sound=changedSound(before,game,Date.now()+offset);
  if(sound==='time-up'&&game.round)finish(game.round.attempt);
  else if(sound)player.current?.play(sound);
 },[game,enabled,offset,finish]);
 useEffect(()=>{player.current?.setSuspense(enabled&&suspense&&suspenseActive(game));},[game,enabled,suspense]);
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
 return {enabled,volume,setVolume,suspense,setSuspense,giant,toggle,preview,previewAvailable,error};
}
