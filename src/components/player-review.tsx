'use client';
import {useState} from 'react';
import {callable} from '@/lib/firebase';
import {firebaseClient} from '@/lib/firebase';
import {Notice} from './common';
type Review={text:string;options:string[];correct:number;choice:number|null;practice:boolean};
export default function PlayerReview({pin}:{pin:string}){
 const [rows,setRows]=useState<Review[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <section className="player-review"><button className="button ghost full" disabled={busy} onClick={async()=>{if(rows){setRows(null);return;}setBusy(true);setError('');try{const c=await firebaseClient();const r=await callable<{pin:string},{questions:Review[]}>('playerReview')({pin});setRows(r.data.questions);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'Opening…':rows?'Close review':'Review my answers'}</button>{error&&<Notice error>{error}</Notice>}{rows?.map((q,i)=><article className="review-card" key={i}><small>{q.practice?'Practice':'Question '+(i+1)}</small><h3>{q.text}</h3><p>Your answer: <strong>{q.choice===null?'No answer':q.options[q.choice]}</strong></p><p className={q.choice===q.correct?'review-correct':'muted'}>Correct answer: {q.options[q.correct]}</p></article>)}</section>;
}

