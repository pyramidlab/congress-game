import type {Question} from './types';
export function parseCSV(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw new Error('The CSV contains an unclosed quote.');
 row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function importQuestions(text:string,stage=false):Question[]{
 const [head,...rows]=parseCSV(text.replace(/^\uFEFF/,''));
 const required=['question','option_a','option_b','option_c','option_d','correct_option',...(stage?[]:['time_limit','points'])];
 if(!head||required.some(h=>!head.map(x=>x.trim().toLowerCase()).includes(h)))throw new Error('CSV headers must include '+required.join(', ')+'.');
 const header=head.map(x=>x.trim().toLowerCase());
 return rows.map((row,i)=>{const get=(key:string)=>row[header.indexOf(key)]?.trim()??'';const correctText=get('correct_option').toUpperCase();const correct=/^[A-D]$/.test(correctText)?correctText.charCodeAt(0)-65:Number(correctText)-1;
 const q={id:'import-'+i,text:get('question'),options:['option_a','option_b','option_c','option_d'].map(get),correct,seconds:stage?30:Number(get('time_limit')||15),points:stage?1:Number(get('points')||1000),practice:!stage&&/^(true|1|yes)$/i.test(get('practice')),reference:get('reference').slice(0,120)};
 if(!q.text||q.options.some(o=>!o)||!Number.isInteger(correct)||correct<0||correct>3||!Number.isInteger(q.seconds)||q.seconds<5||q.seconds>120||!Number.isInteger(q.points)||q.points<1||q.points>10000)throw new Error('Check CSV row '+(i+2)+': four options, answer A–D or 1–4, time 5–120 and points 1–10000 are required.');
 return q;});
}
export function download(name:string,contents:string,type='text/csv;charset=utf-8'){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
