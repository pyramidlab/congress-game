import test from 'node:test';
import assert from 'node:assert/strict';
import {SoundPlayer} from '../src/lib/sound-player';

class FakeSource{
 loop=false;starts=0;stops:number[]=[];onended:(()=>void)|null=null;
 connect(){}disconnect(){}start(){this.starts++;}stop(at=0){this.stops.push(at);if(!at)this.onended?.();}
}
class FakeContext{
 state='running';currentTime=10;destination={};sources:FakeSource[]=[];buffers=0;closed=false;
 createGain(){return {gain:{value:1,setTargetAtTime(){},cancelScheduledValues(){}},connect(){},disconnect(){}};}
 createBuffer(){this.buffers++;return {copyToChannel(){}};}
 createBufferSource(){const source=new FakeSource();this.sources.push(source);return source;}
 async close(){this.closed=true;}
}
test('one suspense loop survives repeated updates and foreground cues; stopping fades it once',()=>{
 const ctx=new FakeContext(),player=new SoundPlayer(.45,ctx as unknown as AudioContext);
 player.setSuspense(true);const bed=ctx.sources[0];assert.equal(bed.loop,true);assert.equal(bed.starts,1);
 player.setSuspense(true);player.play('final-answer');player.setSuspense(true);assert.equal(ctx.sources.length,2);assert.deepEqual(bed.stops,[]);
 player.play('giant-correct');assert.equal(ctx.sources[1].stops.length,1);assert.deepEqual(bed.stops,[]);
 player.setSuspense(false);player.setSuspense(false);assert.deepEqual(bed.stops,[10.2]);
 player.setSuspense(true);assert.equal(ctx.buffers,3,'suspense buffer is reused');
 player.stop();assert.equal(ctx.sources.at(-1)!.stops.length,1);assert.ok(bed.stops.includes(0),'mute also stops any fading tail');
 player.setSuspense(true);assert.equal(ctx.sources.at(-1)!.starts,1);player.dispose();assert.equal(ctx.closed,true);
});
test('a suspended audio context cannot start cues or a background loop',()=>{
 const ctx=new FakeContext();ctx.state='suspended';const player=new SoundPlayer(.45,ctx as unknown as AudioContext);
 player.play('question-open');player.setSuspense(true);assert.equal(ctx.sources.length,0);player.dispose();
});
