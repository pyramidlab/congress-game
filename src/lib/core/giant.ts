import type {Game,Question} from './types';
export type GiantPlayer={id:string;name:string;lives:number;correct:number};
export type GiantState={players:GiantPlayer[];startingLives:number;turn:number;used:number[];status:'pick'|'question'|'confirm'|'result';question?:number;selected?:number;winner?:string;history:{player:string;question:number;choice:number;correct:boolean;lives:number;at:number}[]};
export type PublicGiant=Omit<GiantState,'history'> & {poolSize:number;current?:{number:number;text:string;options:string[];correct?:number;reference?:string}};
export const emptyGiant=():GiantState=>({players:[],startingLives:3,turn:0,used:[],status:'pick',history:[]});
export function restoreGiant(value?:GiantState):GiantState {const g=value??emptyGiant();g.players??=[];g.used??=[];g.history??=[];return g;}
export function publicGiant(game:Game):PublicGiant{
 const g=restoreGiant(game.giant),q=g.question===undefined?undefined:game.questions[g.question];
 const {history,...visible}=g,showAnswer=g.status==='result'||game.phase==='winner'||game.phase==='ended';
 return {...visible,poolSize:game.questions.length,...(q?{current:{number:g.question!+1,text:q.text,options:q.options,...(showAnswer?{correct:q.correct,...(q.reference?{reference:q.reference}:{})}:{})}}:{})};
}
export function validateGiantQuestions(input:unknown,offset=0):Question[]{
 if(!Array.isArray(input)||!input.length||input.length+offset>300)throw Error('Use 1–300 Bible Giant questions.');
 return input.map((q:Question,i)=>{
  if(!q||typeof q.text!=='string'||!q.text.trim()||q.text.length>500||!Array.isArray(q.options)||q.options.length!==4||q.options.some(o=>typeof o!=='string'||!o.trim()||o.length>200)||!Number.isInteger(q.correct)||q.correct<0||q.correct>3)throw Error('Bible Giant question '+(offset+i+1)+' needs text, four options and a correct answer.');
  return {id:'giant-'+(offset+i),text:q.text.trim(),options:q.options.map(o=>o.trim()),correct:q.correct,seconds:30,points:1,practice:false,...(q.reference?{reference:String(q.reference).slice(0,120)}:{})};
 });
}
export function applyGiant(game:Game,action:string,payload:Record<string,unknown>,now:number){
 const g=restoreGiant(game.giant);game.giant=g;
 const remember=()=>{game.undo??=[];game.undo.push(JSON.parse(JSON.stringify({teams:game.teams,feud:game.feud,phase:game.phase,giant:g})));game.undo=game.undo.slice(-30);};
 const running=()=>{if(game.phase!=='giant')throw Error('Start Bible Giant first.');};
 switch(action){
 case 'giant-roster':{
  if(game.phase!=='lobby')throw Error('Set the stage players before starting.');
  const names=payload.names,lives=Number(payload.lives);
  if(!Array.isArray(names)||names.length<2||names.length>30||names.some(n=>typeof n!=='string'||n.trim().length<2||n.trim().length>40)||new Set(names.map(n=>String(n).trim().toLocaleLowerCase())).size!==names.length)throw Error('Enter 2–30 different player names, 2–40 characters each.');
  if(!Number.isInteger(lives)||lives<1||lives>9)throw Error('Choose 1–9 starting lives.');
  g.startingLives=lives;g.players=names.map((name,i)=>({id:'stage-'+i,name:String(name).trim(),lives,correct:0}));break;
 }
 case 'start':
  if(game.phase!=='lobby')throw Error('Game already started.');if(g.players.length<2)throw Error('Add at least two stage players first.');if(!game.questions.length)throw Error('Add a question pool first.');
  g.players=g.players.map(p=>({...p,lives:g.startingLives,correct:0}));g.turn=0;g.used=[];g.history=[];g.status='pick';delete g.question;delete g.selected;delete g.winner;game.phase='giant';break;
 case 'giant-pick':{
  running();if(g.status!=='pick')throw Error('Complete the current question first.');const index=Number(payload.index);
  if(!Number.isInteger(index)||!game.questions[index]||g.used.includes(index))throw Error('Choose an unused question number.');
  remember();g.question=index;g.used.push(index);delete g.selected;g.status='question';break;
 }
 case 'giant-select':{
  running();if(!['question','confirm'].includes(g.status))throw Error('Pick a question first.');const option=Number(payload.option);
  if(!Number.isInteger(option)||option<0||option>3)throw Error('Choose answer A, B, C or D.');remember();g.selected=option;g.status='confirm';break;
 }
 case 'giant-change':running();if(g.status!=='confirm')throw Error('No tentative answer.');remember();delete g.selected;g.status='question';break;
 case 'giant-final':{
  running();if(g.status!=='confirm'||g.selected===undefined||g.question===undefined)throw Error('Select an answer before confirming it.');
  const player=g.players[g.turn];if(!player||player.lives<=0)throw Error('The current player is not active.');remember();
  const correct=g.selected===game.questions[g.question].correct;if(correct)player.correct++;else player.lives--;
  g.history.push({player:player.id,question:g.question,choice:g.selected,correct,lives:player.lives,at:now});g.status='result';
  const remaining=g.players.filter(p=>p.lives>0);if(remaining.length===1)g.winner=remaining[0].id;break;
 }
 case 'giant-next':{
  running();if(g.status!=='result')throw Error('Confirm the final answer first.');remember();
  if(g.winner){game.phase='winner';break;}
  for(let step=1;step<=g.players.length;step++){const next=(g.turn+step)%g.players.length;if(g.players[next].lives>0){g.turn=next;break;}}
  g.status='pick';delete g.question;delete g.selected;break;
 }
 case 'giant-add':{
  running();if(g.status!=='pick')throw Error('Add questions between turns.');const extra=validateGiantQuestions(payload.questions,game.questions.length);game.questions.push(...extra);break;
 }
 case 'undo':{
  const previous=game.undo?.at(-1);if(!previous?.giant)throw Error('Nothing to undo.');game.undo!.pop();game.giant=previous.giant;game.phase=previous.phase;break;
 }
 case 'end':game.phase='ended';break;
 default:throw Error('This action is not available in Bible Giant.');
 }
}
