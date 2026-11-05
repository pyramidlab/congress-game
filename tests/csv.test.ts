import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,importQuestions} from '../src/lib/csv';
test('CSV parser handles quoted commas, newlines and escaped quotes',()=>{assert.deepEqual(parseCSV('a,b\r\n"hello, world","line 1\nline ""2"""'),[['a','b'],['hello, world','line 1\nline "2"']]);assert.throws(()=>parseCSV('"unclosed'));});
test('CSV question import supports letter and one-based numeric answers',()=>{const head='question,option_a,option_b,option_c,option_d,correct_option,time_limit,points,practice\n';assert.equal(importQuestions(head+'Pick A,A,B,C,D,A,20,1000,true')[0].correct,0);assert.equal(importQuestions(head+'Pick C,A,B,C,D,3,15,500,false')[0].correct,2);assert.throws(()=>importQuestions(head+'Pick C,A,B,C,D,8,15,500,false'));assert.throws(()=>importQuestions('question,answer\nHello,A'));});
