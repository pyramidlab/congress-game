import type {Game,PublicGame} from './types';
// Realtime Database omits empty arrays. Restore collection defaults at the read boundary.
export function restoreGame(g:Game):Game {
 g.rounds??=[];g.teams??=[];g.audit??=[];g.undo??=[];
 g.feud.revealed??=[];g.feud.used??=[];
 return g;
}
export function restorePublic(g:PublicGame):PublicGame {
 g.leaders??=[];g.recent??=[];g.teams??=[];g.campusesBoard??=[];
 g.feud.revealed??=[];g.feud.used??=[];
 return g;
}
