import test from 'node:test';
import assert from 'node:assert/strict';
import {changedSound,countdownBeat,soundNames,soundRate,soundSamples} from '../src/lib/game-sounds';
import {newGame} from '../src/lib/core/seed';
import type {Phase} from '../src/lib/types';
const signal=(phase:Phase)=>({...newGame('123456'),phase,round:{attempt:'round-1',questionIndex:0,startedAt:0,endsAt:20000,pausedMs:0,active:true}});
test('countdown switches to half-second ticks for the final five seconds and never ticks past zero',()=>{
 assert.equal(countdownBeat(5001)?.sound,'tick');assert.equal(countdownBeat(5000)?.sound,'urgent');
 assert.equal(countdownBeat(4999)?.key,countdownBeat(4800)?.key);
 assert.notEqual(countdownBeat(4800)?.key,countdownBeat(4500)?.key);
 assert.equal(countdownBeat(0),null);assert.equal(countdownBeat(-500),null);assert.equal(countdownBeat(Infinity),null);
});
test('initial state and reconnects do not replay reveal or winner sounds',()=>{
 assert.equal(changedSound(null,signal('winner'),21000),null);
 const before=signal('question'),after=signal('reveal');after.pin='654321';assert.equal(changedSound(before,after,21000),null);
 assert.equal(changedSound(signal('reveal'),signal('reveal'),21000),null);
});
test('manual reveal uses a chime while deadline closure uses the time-up cue; pause and undo stay quiet',()=>{
 assert.equal(changedSound(signal('question'),signal('reveal'),19000),'reveal');
 assert.equal(changedSound(signal('question'),signal('reveal'),20000),'time-up');
 assert.equal(changedSound(signal('question'),signal('paused'),10000),null);
 assert.equal(changedSound(signal('paused'),signal('reveal'),50000),'reveal');
 const before=signal('feud'),after=signal('feud');before.feud.strikes=2;after.feud.strikes=1;assert.equal(changedSound(before,after,20000),null);
});
test('survey strikes, reveals and final celebrations select distinct sounds',()=>{
 const before=signal('feud'),strike=signal('feud'),reveal=signal('feud');strike.feud.strikes=1;reveal.feud.revealed=[0];
 assert.equal(changedSound(before,strike,0),'strike');assert.equal(changedSound(before,reveal,0),'reveal');
 assert.equal(changedSound(before,signal('winner'),0),'winner');assert.equal(changedSound(signal('reveal'),signal('podium'),0),'winner');
});
test('all original clips contain finite audible samples without clipping',()=>{
 for(const name of soundNames){const samples=soundSamples(name);assert.ok(samples.length>=soundRate*.05);let peak=0;for(const sample of samples){assert.ok(Number.isFinite(sample));peak=Math.max(peak,Math.abs(sample));}assert.ok(peak>.05,name+' must not be silent');assert.ok(peak<=.750001,name+' must not clip');}
});
