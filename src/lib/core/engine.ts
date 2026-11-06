import type {Game, Player, Standing, CampusStanding, Submission, AnswerMap, PublicGame, PlayerResult, Question, Survey} from './types';
import {applyGiant,emptyGiant,publicGiant,restoreGiant,validateGiantQuestions} from './giant';
export function clean<T>(value:T):T {return JSON.parse(JSON.stringify(value));}
export function hydrate(g:Game):Game {
 g.mode??='quiz';g.giant=restoreGiant(g.giant);
 g.rounds??=[];g.teams??=[];g.surveys??=[];g.audit??=[];g.undo??=[];g.feud.revealed??=[];g.feud.used??=[];
 g.feud.matches=g.feud.matches.map(m=>({...m,scores:m.scores??[0,0]}));
 return g;
}
export function username(value:unknown):string {
 if(typeof value!=='string')throw new Error('Enter a player name.');
 const name=value.normalize('NFKC').trim();
 if(!/^[\p{L}\p{N} _-]{2,15}$/u.test(name))throw new Error('Use 2–15 letters, numbers, spaces, _ or -.');
 if(/(?:fuck|shit|bitch|cunt|nigger)/i.test(name))throw new Error('Please choose another name.');
 return name;
}
export function points(q:Question,elapsed:number,mode:'speed'|'accuracy'='speed'):number {
 if(q.practice||elapsed<0||elapsed>q.seconds*1000)return 0;
 return mode==='accuracy'?q.points:Math.round(q.points*(1-elapsed/(q.seconds*1000)/2));
}
export function elapsed(g:Game,attempt:string,s:Submission):number {
 const r=g.rounds.find(r=>r.attempt===attempt);
 return r ? s.receivedAt-r.startedAt-(s.pausedMs??0) : Infinity;
}
export function rank(g:Game,members:Record<string,Player>,answers:AnswerMap):Standing[] {
 const rows=Object.values(members).filter(p=>!p.removed).map(p=>{
  let score=0,answerTime=0;
  for(const r of g.rounds.filter(r=>!r.void&&!r.active)) {
   const q=g.questions[r.questionIndex], a=answers[r.attempt]?.[p.uid];
   if(!q||!a||a.option!==q.correct||q.practice)continue;
   const t=elapsed(g,r.attempt,a);if(t<0||t>q.seconds*1000)continue;
   score+=points(q,t,g.scoring);answerTime+=t;
  }
  return {...p,rank:0,score,answerTime};
 });
 rows.sort((a,b)=>b.score-a.score||a.answerTime-b.answerTime||a.joinedAt-b.joinedAt||a.uid.localeCompare(b.uid));
 return rows.map((p,i)=>({...p,rank:i+1}));
}
export function campusRanks(g:Game,rows:Standing[]):CampusStanding[] {
 return g.campuses.map(campus=>{
  const ps=rows.filter(p=>p.campus===campus);
  return {campus,score:ps.slice(0,g.campusTop).reduce((s,p)=>s+p.score,0),players:ps.length,rank:0};
 }).sort((a,b)=>b.score-a.score||a.campus.localeCompare(b.campus)).map((c,i)=>({...c,rank:i+1}));
}
export function roundTotal(g:Game):number {const s=g.surveys[g.feud.survey];return g.feud.revealed.reduce((n,i)=>n+(s?.answers[i]?.points??0),0)*g.feud.multiplier;}
export function project(g:Game,members:Record<string,Player>,answers:AnswerMap):{publicGame:PublicGame;results:Record<string,PlayerResult>} {
 hydrate(g);
 const rows=rank(g,members,answers), cs=campusRanks(g,rows), q=g.questions[g.index];
 const revealed=['reveal','leaderboard','podium','teams','feud','winner','ended'].includes(g.phase);
 const distribution=[0,0,0,0];
 if(g.round)for(const a of Object.values(answers[g.round.attempt]??{}))if(distribution[a.option]!==undefined)distribution[a.option]++;
 const current=q?{id:q.id,text:q.text,options:q.options,seconds:q.seconds,points:q.points,practice:!!q.practice,...(q.image?{image:q.image}:{})}:undefined;
 const survey=g.surveys[g.feud.survey];
 const publicGame:PublicGame=clean({
  mode:g.mode,...(g.mode==='bible-giant'?{giant:publicGiant(g)}:{}),
  pin:g.pin,name:g.name,theme:g.theme,phase:g.phase,revision:g.revision,campuses:g.campuses,scoring:g.scoring,allowLate:g.allowLate,
  questionIndex:g.index,questionNumber:g.questions.slice(0,g.index+1).filter(q=>!q.practice).length,leaderboardMode:g.leaderboardMode,questionCount:g.questions.filter(q=>!q.practice).length,practice:!!q?.practice,playerCount:g.mode==='bible-giant'?g.giant.players.length:rows.length,
  recent:Object.values(members).filter(p=>!p.removed).sort((a,b)=>b.joinedAt-a.joinedAt).slice(0,12).map(p=>({name:p.name,campus:p.campus})),
  current,round:g.round,correct:revealed?q?.correct:undefined,distribution:revealed?distribution:undefined,
  leaders:rows.slice(0,10),campusesBoard:cs,teams:g.teams,feud:g.feud,
  survey:survey?{question:survey.question,answers:survey.answers.map((a,index)=>g.feud.revealed.includes(index)?{...a,index}:{index})}:undefined,
  roundTotal:roundTotal(g),winner:g.phase==='winner'?g.teams.find(t=>t.id===g.feud.matches[2].winner):undefined
 });
 const results=Object.fromEntries(rows.map(p=>{
  const a=g.round?answers[g.round.attempt]?.[p.uid]:undefined;
  const t=a&&g.round?elapsed(g,g.round.attempt,a):Infinity;
  const correct=!!a&&a.option===q?.correct&&t>=0&&t<=(q?.seconds??0)*1000;
  return [p.uid,clean({score:p.score,rank:p.rank,total:rows.length,campusRank:cs.find(c=>c.campus===p.campus)?.rank??0,
   earned:revealed&&correct?points(q,t,g.scoring):0,correct:revealed&&q?correct:undefined,
   option:revealed?a?.option:undefined,attempt:g.round?.attempt})];
 }));
 return {publicGame,results};
}
export function validateContent(input:unknown):{mode:Game['mode'];questions:Question[];surveys:Survey[];campuses:string[];name:string;theme:string;campusTop:number;scoring:'speed'|'accuracy'} {
 const d=input as Record<string,unknown>;
 if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.length>100)throw new Error('Give the game a name of up to 100 characters.');
 if(!Array.isArray(d.campuses)||d.campuses.length<1||d.campuses.length>50)throw new Error('Add between 1 and 50 campuses.');
 const campuses=d.campuses.map(c=>String(c).trim());
 if(campuses.some(c=>!c||c.length>40)||new Set(campuses).size!==campuses.length)throw new Error('Campus names must be unique and non-empty.');
 if(!Array.isArray(d.questions)||d.questions.length<1||d.questions.length>(d.mode==='bible-giant'?300:100))throw new Error('Add 1–100 questions.');
 const mode:Game['mode']=d.mode==='bible-giant'?'bible-giant':'quiz';
 const questions=mode==='bible-giant'?validateGiantQuestions(d.questions):d.questions.map((q:Question,i)=>{
  if(!q.text?.trim()||q.text.length>500||!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string'||!o.trim()||o.length>200))throw new Error('Question '+(i+1)+' needs text and four options.');
  if(!Number.isInteger(q.correct)||q.correct<0||q.correct>3||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>120||!Number.isInteger(q.points)||q.points<1||q.points>10000)throw new Error('Check the answer, timer (5–120s) and points (1–10000) on question '+(i+1)+'.');
  if(q.image&&!/^https:\/\//.test(q.image))throw new Error('Images must use HTTPS.');
  return clean({id:'q-'+i,text:q.text.trim(),options:q.options.map(o=>o.trim()),correct:q.correct,seconds:q.seconds,points:q.points,practice:!!q.practice,...(q.image?{image:q.image}:{})});
 });
 if(new Set(questions.filter(q=>q.practice).map(q=>q.id)).size>1||questions.some((q,i)=>q.practice&&i!==0))throw new Error('Only the first question may be practice.');
 const surveys:Survey[]=[];
 return {mode,questions,surveys,campuses,name:d.name.trim(),theme:String(d.theme??'').slice(0,200),campusTop:Math.max(1,Math.min(20,Number(d.campusTop)||5)),scoring:d.scoring==='accuracy'?'accuracy':'speed'};
}
export function transition(source:Game,action:string,payload:Record<string,unknown>={},now=Date.now(),rows:Standing[]=[],attempt='round-'+now):Game {
 const g=hydrate(clean(source));
 if(g.mode==='bible-giant'){applyGiant(g,action,payload,now);g.revision++;g.audit.push({action,at:now});g.audit=g.audit.slice(-200);return clean(g);}
 const open=(index:number)=>{
  if(!g.questions[index])throw new Error('No more questions.');
  g.index=index;g.allowLate=false;
  g.round={attempt,questionIndex:index,startedAt:now,endsAt:now+g.questions[index].seconds*1000,pausedMs:0,active:true};
  g.rounds.push(g.round);g.phase='question';
 };
 switch(action){
 case 'start':if(g.phase!=='lobby')throw new Error('Game already started.');open(0);break;
 case 'next':if(!['reveal','leaderboard'].includes(g.phase))throw new Error('Reveal this question first.');if(g.index+1>=g.questions.length){g.phase='podium';}else open(g.index+1);break;
 case 'pause':if(g.phase!=='question'||!g.round||now>=g.round.endsAt)throw new Error('Only a running question can be paused.');g.round.pauseAt=now;g.round.remaining=g.round.endsAt-now;g.phase='paused';break;
 case 'resume':if(g.phase!=='paused'||!g.round)throw new Error('No paused question.');g.round.pausedMs+=now-(g.round.pauseAt??now);g.round.endsAt=now+(g.round.remaining??0);delete g.round.pauseAt;delete g.round.remaining;g.phase='question';break;
 case 'reveal':if(!['question','paused'].includes(g.phase)||!g.round)throw new Error('No question to reveal.');g.round.active=false;g.phase='reveal';break;
 case 'leaderboard':if(!['reveal','leaderboard'].includes(g.phase))throw new Error('Reveal first.');g.phase=g.phase==='leaderboard'?'reveal':'leaderboard';g.leaderboardMode=g.questions.slice(0,g.index+1).filter(q=>!q.practice).length%5===0&&!g.questions[g.index].practice?'campus':'individual';break;
 case 'board':if(!['reveal','leaderboard'].includes(g.phase))throw new Error('Reveal first.');g.leaderboardMode=payload.mode==='campus'?'campus':'individual';g.phase='leaderboard';break;
 case 'skip':if(!g.round||!['question','paused','reveal','leaderboard'].includes(g.phase))throw new Error('No question to skip.');g.round.void=true;g.round.active=false;g.rounds=g.rounds.map(r=>r.attempt===g.round!.attempt?g.round!:r);if(g.index+1>=g.questions.length)g.phase='podium';else open(g.index+1);break;
 case 'reset':if(!g.round||!['question','paused','reveal','leaderboard'].includes(g.phase))throw new Error('No question to reset.');g.round.void=true;g.round.active=false;g.rounds=g.rounds.map(r=>r.attempt===g.round!.attempt?g.round!:r);open(g.index);break;
 case 'late':if(g.phase!=='question'||g.questions.slice(0,g.index).filter(q=>!q.practice).length>0)throw new Error('Late joins are available in the first question only.');g.allowLate=!g.allowLate;break;
 case 'finish':if(g.round?.active)throw new Error('Reveal the current question before ending the quiz.');g.phase='podium';break;
 case 'end':g.phase='ended';if(g.round)g.round.active=false;break;
 default:throw new Error('Unknown host action.');
 }
 if(g.round)g.rounds=g.rounds.map(r=>r.attempt===g.round!.attempt?g.round!:r);
 g.revision++;g.audit.push({action,at:now});g.audit=g.audit.slice(-200);
 return clean(g);
}
