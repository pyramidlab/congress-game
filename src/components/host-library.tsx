'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {callable} from '@/lib/firebase';
import {firebaseClient} from '@/lib/firebase';
import {Notice} from './common';
type Library={templates:{id:string;name:string;createdAt:number}[];rooms:{pin:string;name:string;phase:string;createdAt:number}[]};
export default function HostLibrary({onCreate}:{onCreate:(source:{templateId?:string;sourcePin?:string})=>Promise<void>}){
 const [library,setLibrary]=useState<Library>({templates:[],rooms:[]}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const refresh=async()=>{const c=await firebaseClient();const r=await callable<{action:string},Library>('hostLibrary')({action:'list'});setLibrary(r.data);};
 useEffect(()=>{let live=true;firebaseClient().then(c=>callable<{action:string},Library>('hostLibrary')({action:'list'})).then(r=>{if(live)setLibrary(r.data);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 const create=async(source:{templateId?:string;sourcePin?:string})=>{setBusy(true);setError('');try{await onCreate(source);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const removeGame=async(room:Library['rooms'][number])=>{
  if(!confirm('Delete “'+room.name+'” (PIN '+room.pin+')?\n\nThis permanently removes the game, its players, results and saved backups. Download any exports you need first. Saved question sets will stay.'))return;
  setBusy(true);setError('');setMessage('');
  try{await callable('deleteGame')({pin:room.pin,confirmPin:room.pin});setLibrary(l=>({...l,rooms:l.rooms.filter(r=>r.pin!==room.pin)}));setMessage('Game '+room.pin+' deleted.');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 return <section className="panel host-library"><div className="section-heading"><div><div className="eyebrow">KEEP THE GOOD QUESTIONS</div><h2>Your game library</h2></div><button className="button ghost small" disabled={busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh</button></div>{error&&<Notice error>{error}</Notice>}{message&&<Notice>{message}</Notice>}
 <h3>Saved question sets</h3>{!library.templates.length?<p className="muted">Save a session’s quiz, surveys and settings from the host dashboard to reuse them here.</p>:<div className="library-list">{library.templates.map(t=><article key={t.id}><div><strong>{t.name}</strong><small>{new Date(t.createdAt).toLocaleDateString()}</small></div><button className="button primary small" disabled={busy} onClick={()=>create({templateId:t.id})}>Create game →</button><button className="button ghost small" disabled={busy} onClick={async()=>{if(!confirm('Delete this saved question set? Existing games will stay.'))return;setBusy(true);try{const c=await firebaseClient();await callable('hostLibrary')({action:'delete',id:t.id});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Delete</button></article>)}</div>}
 <h3>Recent games</h3>{!library.rooms.length?<p className="muted">Your new sessions will appear here.</p>:<><p className="field-help">End a running game before deleting it. Download any results you want to keep first.</p><div className="library-list">{library.rooms.map(r=><article key={r.pin}><div><strong>{r.name}</strong><small>{r.pin} · {r.phase} · {new Date(r.createdAt).toLocaleDateString()}</small></div><Link className="button ghost small" href={'/host?pin='+r.pin}>Open ↗</Link><button className="button primary small" disabled={busy} onClick={()=>create({sourcePin:r.pin})}>Reuse questions</button><button className="button danger small" disabled={busy||!['lobby','ended'].includes(r.phase)} title={['lobby','ended'].includes(r.phase)?'Delete game '+r.pin:'End this game before deleting it'} aria-label={'Delete game '+r.name+' (PIN '+r.pin+')'} onClick={()=>void removeGame(r)}>Delete game</button></article>)}</div></>}</section>;
}
