import type {Game, Question, GameMode} from './types';
import {event} from '../event';
import {emptyGiant} from './giant';
import {giantQuestions} from './giant-seed';
export const campuses = ['EKSU','FUOYE','FEDPOLAD','BOUESTI','FUTES-IYIN','FCE-ILAWE','COHS-IJERO','ABUAD'];
const raw: [string, string[], number][] = [
 ['Practice: which colour is the sky on a clear day?', ['Blue','Orange','Purple','Green'],0],
 ['Who built the ark?', ['Moses','Noah','David','Paul'],1],
 ['How many days are in a week?', ['Five','Six','Seven','Eight'],2],
 ['Which book comes first in the Bible?', ['Genesis','Psalms','Matthew','Acts'],0],
 ['Who faced Goliath?', ['Solomon','Jonah','Peter','David'],3],
 ['Which of these is a musical instrument?', ['Bucket','Trumpet','Notebook','Sandals'],1],
 ['How many people make a pair?', ['One','Two','Three','Four'],1],
 ['Which of these is a fruit?', ['Carrot','Rice','Mango','Bread'],2],
 ['What did Jesus turn water into at Cana?', ['Milk','Oil','Honey','Wine'],3],
 ['Which book contains the creation account?', ['Romans','Genesis','Hebrews','James'],1],
 ['What is the last book in the Bible?', ['Acts','Jude','Revelation','Malachi'],2]
];
export const questions: Question[] = raw.map(([text,options,correct],i)=>({id:'sample-'+i,text,options,correct,seconds:20,points:1000,practice:i===0}));
export function newGame(pin:string,name:string=event.name,mode:GameMode='quiz'):Game {
 return {mode,giant:emptyGiant(),pin,name,theme:event.theme,revision:0,phase:'lobby',campuses:[...campuses],questions:structuredClone(mode==='bible-giant'?giantQuestions:questions),surveys:[],campusTop:5,scoring:'speed',allowLate:false,index:-1,rounds:[],teams:[],audit:[],undo:[],feud:{match:0,survey:0,revealed:[],strikes:0,controlling:0,multiplier:1,awarded:false,matches:[{a:1,b:4,scores:[0,0]},{a:2,b:3,scores:[0,0]},{a:0,b:0,scores:[0,0]}],used:[],suddenDeath:false}};
}
