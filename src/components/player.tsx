'use client';
import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSearchParams,useRouter} from 'next/navigation';
import {useGame} from '@/lib/use-game';
import {Brand,Connection,Countdown,DemoBanner,Notice,shapes} from './common';
import type {Player} from '@/lib/types';
const PlayerReview=dynamic(()=>import('./player-review'));
export default function PlayerScreen(){
 const search=useSearchParams(),router=useRouter(),pin=search.get('pin')??'',demo=search.get('demo')==='1';
 const v=useGame(pin,demo),g=v.game;
 const [pinInput,setPinInput]=useState(pin),[name,setName]=useState(''),[campus,setCampus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState<number|null>(null);
 const attempt=g?.round?.attempt,restored=useRef('');
 useEffect(()=>{setPending(null);setError('');},[attempt]);
 useEffect(()=>{if(v.submission){setPending(null);if(attempt)localStorage.removeItem('congress-pending-'+pin+'-'+attempt);}},[v.submission,attempt,pin]);
 useEffect(()=>{
  if(!attempt||!v.member||v.submission||g?.phase!=='question'||!v.connected||restored.current===attempt)return;
  const value=localStorage.getItem('congress-pending-'+pin+'-'+attempt);
  if(value!==null&&Date.now()+v.offset<(g.round?.endsAt??0)){
   restored.current=attempt;const option=Number(value);if(!Number.isInteger(option)||option<0||option>3)return;
   setPending(option);v.answer(option).catch(()=>{setPending(null);setError('We could not confirm your saved answer. Please check the connection.');});
  }
 },[attempt,v.member?.uid,!!v.submission,v.connected,g?.phase]);
 const submit=async(option:number)=>{
  if(pending!==null||v.submission||!attempt)return;
  setPending(option);setError('');localStorage.setItem('congress-pending-'+pin+'-'+attempt,String(option));
  try{await v.answer(option);localStorage.removeItem('congress-pending-'+pin+'-'+attempt);}
  catch{setPending(null);setError('Your answer was not accepted. The question may have closed. Reconnect to check your recorded answer.');}
 };
 const join=async(e:React.FormEvent)=>{e.preventDefault();setError('');setBusy(true);try{await v.join(name,campus);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const member=v.member as Player|null;
 const revealed=!!g&&['reveal','leaderboard','podium','teams','feud','winner','ended'].includes(g.phase);
 const final=!!g&&['podium','teams','feud','winner','ended'].includes(g.phase);
 return <main className="phone-page">{demo&&<DemoBanner/>}<header className="phone-header"><Brand/>{g&&<Connection connected={v.connected} demo={demo}/>}</header>
 <div className="phone-content">
 {!/^\d{6}$/.test(pin)?<><div className="eyebrow">AFCF EKITI · STUDENT CONGRESS 1.0</div><h1>Join the<br/>Congress game.</h1><p className="muted">Enter the six-digit PIN on the big screen.</p><form onSubmit={e=>{e.preventDefault();if(/^\d{6}$/.test(pinInput))router.push('/join?pin='+pinInput);else setError('Enter all six digits.');}}><label htmlFor="pin">Game PIN</label><input id="pin" className="pin-input" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="000000" value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,''))} required/><button className="button primary full" type="submit">Find my game <span>→</span></button></form><p className="field-help">Shine for a Purpose · Play with your campus.</p></>:
 v.loading?<div className="waiting-state"><div className="loading-star">✳</div><h1>Finding your game…</h1></div>:
 !g?<><h1>Let’s get you<br/>connected.</h1><Notice error>{v.error||'We couldn’t find that game. Check the PIN with your host.'}</Notice><button className="button primary full" onClick={v.reconnect}>Try again</button><a className="demo-link" href="/join">Enter another PIN</a></>:
 member?.removed?<><h1>Please see<br/>your host.</h1><p>Your player has been removed from this game.</p></>:
 !member?<><div className="eyebrow">{g.name}</div><h1>A name.<br/>A campus.<br/><em>Let’s go.</em></h1><form onSubmit={join}><label htmlFor="username">What should we call you?</label><input id="username" autoComplete="nickname" minLength={2} maxLength={15} placeholder="Your player name" value={name} onChange={e=>setName(e.target.value)} required/><small className="field-help">Keep it friendly. Up to 15 characters.</small><label htmlFor="campus">Represent your campus</label><select id="campus" value={campus} onChange={e=>setCampus(e.target.value)} required><option value="">Choose your campus</option>{g.campuses.map(c=><option key={c}>{c}</option>)}</select><button className="button primary full" disabled={busy||!v.connected}>{busy?'Joining…':'Count me in'} <span>→</span></button></form><div className="phone-pin">GAME PIN <strong>{pin}</strong></div></>:
 g.phase==='lobby'?<div className="waiting-state"><div className="waiting-badge">✳</div><div className="eyebrow">YOU’VE GOT A PLACE HERE</div><h1>You’re in,<br/><em>{member.name}!</em></h1><span className="campus-pill">{member.campus}</span><p>Keep this page open.<br/>Your host will start the game shortly.</p><div className="waiting-dots"><i/><i/><i/></div><small className="muted">{g.playerCount} players and counting</small></div>:
 final?<div className="waiting-state"><div className="waiting-badge">✦</div><div className="eyebrow">YOU SHOWED UP. YOU PLAYED.</div><h1>What a<br/><em>game, {member.name}.</em></h1><div className="result-stats"><div><strong>#{v.result?.rank??'—'}</strong><span>Your final rank</span></div><div><strong>{(v.result?.score??0).toLocaleString()}</strong><span>Total points</span></div></div><p>{member.campus} finished <strong>#{v.result?.campusRank??'—'}</strong> on the campus board.</p>{(v.result?.rank??99)<=8&&<Notice>You made the top 8! Listen for your name and head to the stage.</Notice>}<p className="muted">Eyes on the big screen for the survey showdown.</p>{!demo&&<PlayerReview pin={pin}/>}</div>:
 revealed?<div className="waiting-state"><div className={'result-icon '+(v.result?.correct?'correct':'wrong')}>{g.practice?'✦':v.result?.correct?'✓':'×'}</div><div className="eyebrow">{g.practice?'PRACTICE COMPLETE':v.result?.correct?'THAT’S THE ONE':'ON TO THE NEXT ONE'}</div><h1>{g.practice?'Ready for the real thing?':v.result?.correct?'Well played!':'Keep going.'}</h1><p>{v.result?.correct?'You got it right.':g.current&&g.correct!==undefined?'Correct answer: '+g.current.options[g.correct]:'Waiting for your result…'}</p><div className="earned">+{v.result?.earned??0}<small>points this round</small></div><div className="result-stats"><div><strong>{(v.result?.score??0).toLocaleString()}</strong><span>Total points</span></div><div><strong>#{v.result?.rank??'—'}</strong><span>of {g.playerCount} players</span></div></div></div>:
 <><div className="question-top"><span className="eyebrow">{g.practice?'PRACTICE · NO POINTS':'QUESTION '+g.questionNumber}</span></div><div className="question-heading"><h2>{g.current?.text}</h2><Countdown game={g} offset={v.offset}/></div>{g.phase==='paused'?<div className="waiting-state"><div className="waiting-badge">Ⅱ</div><h2>A quick pause.</h2><p>Your host will resume shortly.</p></div>:
 v.submission?<div className="waiting-state"><div className="result-icon correct">✓</div><h1>Answer<br/>confirmed.</h1><p>{g.current?.options[v.submission.option]}</p><small className="muted">Eyes on the screen. Your result is coming.</small></div>:
 pending!==null?<div className="waiting-state"><div className="loading-star">✳</div><h2>Sending your answer…</h2><p>Keep this page open until it’s confirmed.</p>{!v.connected&&<Notice>Reconnecting. Your answer hasn’t been confirmed yet.</Notice>}</div>:
 <div className="answer-grid phone-answers">{g.current?.options.map((o,i)=><button className={'answer answer-'+i} key={i} onClick={()=>submit(i)} disabled={!v.connected||Date.now()+v.offset>=(g.round?.endsAt??0)}><span className="shape">{shapes[i]}</span><span>{o}</span></button>)}</div>}<div className="player-bottom"><span>{member.name} · {member.campus}</span><strong>{(v.result?.score??0).toLocaleString()} pts</strong></div></>}
 {error&&<Notice error>{error}</Notice>}{g&&!v.connected&&<Notice>Connection interrupted. Keep this page open while we reconnect.</Notice>}
 </div><footer className="phone-footer">TOGETHER IS A GOOD PLACE TO BE. ✦</footer></main>;
}
