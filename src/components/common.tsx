'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {PublicGame,Standing,CampusStanding} from '@/lib/types';
export const shapes=['▲','◆','●','■'];
export function Brand(){return <Link className="brand" href="/"><span className="brandmark">✳</span><span>CONGRESS<span className="brand-sub">GAME SESSION</span></span></Link>;}
export function Connection({connected,demo=false}:{connected:boolean;demo?:boolean}){return <span className={'connection '+(connected?'online':'offline')} role="status"><span className="dot"/>{demo?'Local demo':connected?'Connected':'Reconnecting…'}</span>;}
export function DemoBanner(){return <div className="demo-banner">DEMO STUDIO <span>Sample players and questions · Changes stay in this browser</span></div>;}
export function QR({url}:{url:string}){const [src,setSrc]=useState('');useEffect(()=>{let live=true;import('qrcode').then(q=>q.toDataURL(url,{width:240,margin:2,color:{dark:'#111b2d',light:'#ffffff'}})).then(s=>{if(live)setSrc(s);});return()=>{live=false;};},[url]);return <div className="qr">{src?<img src={src} width="200" height="200" alt="Scan to join this game"/>:<span>Preparing QR…</span>}</div>;}
export function Countdown({game,offset=0,large=false}:{game:PublicGame;offset?:number;large?:boolean}){
 const [now,setNow]=useState(0);
 useEffect(()=>{const tick=()=>setNow(Date.now()+offset);tick();const id=setInterval(tick,200);return()=>clearInterval(id);},[offset]);
 const r=game.round,total=game.current?.seconds??1,remaining=game.phase==='paused'?(r?.remaining??0):Math.max(0,(r?.endsAt??0)-(now||Date.now()+offset)),seconds=Math.ceil(remaining/1000);
 return <div className={'timer '+(large?'timer-large ':'')+(seconds<=5?'urgent':'')} aria-label={seconds+' seconds remaining'}><span>{game.phase==='paused'?'Ⅱ':seconds}</span><div className="timer-track"><i style={{width:Math.min(100,remaining/(total*10))+'%'}}/></div></div>;
}
export function Leaderboard({rows,campuses}:{rows?:Standing[];campuses?:CampusStanding[]}){
 return <div className="leaderboard">{rows?.map((p,i)=><div className="leader-row" key={p.uid}><span className={'rank rank-'+i}>{i<3?['①','②','③'][i]:p.rank}</span><span className="player-avatar">{p.name.slice(0,1)}</span><span className="leader-name">{p.name}<small>{p.campus}</small></span><strong>{p.score.toLocaleString()}<small>pts</small></strong></div>)}{campuses?.map(c=><div className="leader-row" key={c.campus}><span className="rank">{c.rank}</span><span className="leader-name">{c.campus}<small>{c.players} players</small></span><strong>{c.score.toLocaleString()}<small>pts</small></strong></div>)}</div>;
}
export function Notice({children,error=false}:{children:React.ReactNode;error?:boolean}){return <div className={'notice '+(error?'error':'')} role={error?'alert':'status'}>{children}</div>;}
