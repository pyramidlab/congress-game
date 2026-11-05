import type {Game, Question, Survey} from './types';
import {event} from '../event';
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
const surveyRaw: [string, [string,number][]][] = [
 ['Name something a student carries to a fellowship meeting.', [['Bible',35],['Notebook and pen',25],['Phone',17],['Offering or money',12],['Water bottle',6],['Hymn book',5]]],
 ['Name something people do at a congress besides listening to messages.', [['Worship and sing',30],['Eat',22],['Take photos',18],['Take notes',12],['Make new friends',10],['Sleep during sessions',8]]],
 ['Name a reason a student is late to morning prayer.', [['Overslept',40],['No water or bathroom queue',20],['Distance or transport',15],['Stayed up late reading',13],['Dressing up',8],['No light or power',4]]],
 ['Name something every student has in their hostel.', [['Indomie or noodles',30],['Bucket',22],['Rechargeable lamp or fan',18],['Textbooks',14],['Gas cooker',10],['Garri',6]]],
 ['Name a Bible character children learn about first.', [['David',28],['Jesus',22],['Moses',18],['Noah',14],['Daniel',10],['Samson',8]]],
 ['What do students do when the lecturer announces a surprise test?', [['Panic',35],['Pray',25],["Look at a neighbour’s paper",18],['Pretend to be sick',10],['Borrow a pen',7],['Guess the answers',5]]],
 ['Name something that makes a worship session great.', [['Spirit-led atmosphere or passion',28],['Good song selection',24],['Strong vocalists or choir',20],['Instruments or band',15],['Congregation participation',8],['Good sound system',5]]],
 ['Name something people forget when travelling to a congress.', [['Charger',30],['Toiletries or towel',25],['Extra clothes',18],['Bedsheet',12],['Cash',9],['Footwear or sandals',6]]]
];
export const surveys: Survey[] = surveyRaw.map(([question,answers],i)=>({id:'survey-'+i,question,answers:answers.map(([text,points])=>({text,points,accept:''}))}));
export function newGame(pin:string,name:string=event.name):Game {
 return {pin,name,theme:event.theme,revision:0,phase:'lobby',campuses:[...campuses],questions:structuredClone(questions),surveys:structuredClone(surveys),campusTop:5,scoring:'speed',allowLate:false,index:-1,rounds:[],teams:[],audit:[],undo:[],feud:{match:0,survey:0,revealed:[],strikes:0,controlling:0,multiplier:1,awarded:false,matches:[{a:1,b:4,scores:[0,0]},{a:2,b:3,scores:[0,0]},{a:0,b:0,scores:[0,0]}],used:[],suddenDeath:false}};
}
