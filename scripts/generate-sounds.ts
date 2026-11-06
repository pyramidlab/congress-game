import fs from 'node:fs';
import path from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {soundNames,soundRate,soundSamples} from '../src/lib/game-sounds';
const target=process.argv[2]||'public/sounds';
fs.mkdirSync(target,{recursive:true});
const names=['01-countdown-tick.wav','02-final-five-tick.wav','03-time-up.wav','04-answer-reveal.wav','05-survey-strike.wav','06-winner.wav','07-countdown-preview.wav'];
const files=soundNames.map((sound,index)=>{
 const samples=soundSamples(sound),buffer=Buffer.alloc(44+samples.length*2);
 buffer.write('RIFF',0);buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
 buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(soundRate,24);
 buffer.writeUInt32LE(soundRate*2,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(samples.length*2,40);
 samples.forEach((sample,i)=>buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),44+i*2));
 return {name:names[index],data:buffer};
});
files.push({name:'README.txt',data:Buffer.from('AFCF Ekiti Area Student Congress 1.0 - Original game sounds\n\nOriginal synthesized sound effects created for the Congress game. No third-party recordings or attribution are required. You may use and adapt these files for your event.\n\nMono, 22050 Hz, 16-bit PCM WAV. Start at a low speaker volume. The seventh clip previews the final five-second countdown and time-up sound.\n\nIn the game: open the projector display, click Sound off to enable audio, then use Sound options for volume, preview and download. Playback is local and requires no streaming. Player phones remain silent.\n')});
for(const file of files)fs.writeFileSync(path.join(target,file.name),file.data);
// A small standard ZIP writer keeps the downloadable pack dependency-free.
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=(data:Buffer)=>{let c=0xffffffff;for(const b of data)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const parts:Buffer[]=[],directory:Buffer[]=[];let offset=0;
const date=((2026-1980)<<9)|(11<<5)|6;
for(const file of files){
 const name=Buffer.from(file.name),data=deflateRawSync(file.data),checksum=crc(file.data);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(date,12);header.writeUInt32LE(checksum,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(file.data.length,22);header.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(date,14);central.writeUInt32LE(checksum,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(file.data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);
 parts.push(header,name,data);directory.push(central,name);offset+=header.length+name.length+data.length;
}
const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...parts,central,end]);fs.writeFileSync(path.join(target,'congress-game-sounds.zip'),zip);
console.log('Generated '+soundNames.length+' WAV clips and '+zip.length+'-byte sound pack in '+target+'.');
