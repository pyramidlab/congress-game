import type {Game,PublicGame} from './types';
import {restoreGiant} from './core/giant';
// Realtime Database omits empty arrays. Restore collection defaults at the read boundary.
export function restoreGame(g:Game):Game {
 g.mode??='quiz';g.giant=restoreGiant(g.giant);
 g.rounds??=[];g.teams??=[];g.surveys??=[];g.audit??=[];g.undo??=[];
 g.feud.revealed??=[];g.feud.used??=[];
 return g;
}
export function restorePublic(g:PublicGame):PublicGame {
 g.mode??='quiz';if(g.giant){g.giant.players??=[];g.giant.used??=[];}
 g.leaders??=[];g.recent??=[];g.teams??=[];g.campusesBoard??=[];
 g.feud.revealed??=[];g.feud.used??=[];
 return g;
}
