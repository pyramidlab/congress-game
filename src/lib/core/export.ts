import {rank,campusRanks,elapsed} from './engine';
import type {Snapshot} from './types';
export function csv(rows:unknown[][]):string {
 return '\uFEFF'+rows.map(row=>row.map(v=>{
  let text=String(v??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
 }).join(',')).join('\r\n');
}
export function exportsFor({game:g,members,answers}:Snapshot) {
 const standings=rank(g,members,answers),rounds=g.rounds.filter(r=>!r.void&&!r.active);
 const players=csv([['Player','Campus','Rank','Points','Correct answer time (ms)',...rounds.flatMap((r,i)=>['Q'+(i+1)+' answer','Q'+(i+1)+' time (ms)'])],
 ...standings.map(p=>[p.name,p.campus,p.rank,p.score,p.answerTime,...rounds.flatMap(r=>{const a=answers[r.attempt]?.[p.uid];return [a?g.questions[r.questionIndex].options[a.option]:'No answer',a?elapsed(g,r.attempt,a):''];})])]);
 const campuses=csv([['Campus','Rank','Top '+g.campusTop+' points','Players'],...campusRanks(g,standings).map(c=>[c.campus,c.rank,c.score,c.players])]);
 return {players,campuses};
}
