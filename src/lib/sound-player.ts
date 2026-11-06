import {soundRate,soundSamples,type GameSound} from './game-sounds';

/** Construct only from an explicit sound-enable or preview click. */
export class SoundPlayer{
 private master:GainNode;
 private buffers=new Map<GameSound,AudioBuffer>();
 private sources=new Set<AudioBufferSourceNode>();
 private bed:{source:AudioBufferSourceNode;gain:GainNode}|null=null;
 constructor(volume:number,readonly context:AudioContext=new AudioContext()){
  this.master=context.createGain();this.master.gain.value=volume;this.master.connect(context.destination);
 }
 setVolume(volume:number){this.master.gain.setTargetAtTime(volume,this.context.currentTime,.025);}
 private source(name:GameSound,gain:GainNode){
  let buffer=this.buffers.get(name);
  if(!buffer){const samples=soundSamples(name);buffer=this.context.createBuffer(1,samples.length,soundRate);buffer.copyToChannel(samples,0);this.buffers.set(name,buffer);}
  const source=this.context.createBufferSource();source.buffer=buffer;source.connect(gain);gain.connect(this.master);this.sources.add(source);
  source.onended=()=>{source.disconnect();gain.disconnect();this.sources.delete(source);};return source;
 }
 play(name:GameSound){
  if(this.context.state!=='running')return;
  if(name!=='tick'&&name!=='urgent')this.stopCues();
  const source=this.source(name,this.context.createGain());source.start();
 }
 setSuspense(active:boolean){
  if(!active){
   if(!this.bed)return;const {source,gain}=this.bed;this.bed=null;
   gain.gain.cancelScheduledValues(this.context.currentTime);gain.gain.setTargetAtTime(0,this.context.currentTime,.04);source.stop(this.context.currentTime+.2);return;
  }
  if(this.bed||this.context.state!=='running')return;
  const gain=this.context.createGain();gain.gain.value=0;gain.gain.setTargetAtTime(.65,this.context.currentTime,.15);
  const source=this.source('suspense-bed',gain);source.loop=true;this.bed={source,gain};source.start();
 }
 private stopCues(){for(const source of this.sources)if(source!==this.bed?.source){try{source.stop();}catch{}}}
 stop(){for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources.clear();this.bed=null;}
 dispose(){this.stop();void this.context.close().catch(()=>{});}
}
