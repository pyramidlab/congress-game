export type Phase = 'lobby' | 'question' | 'paused' | 'reveal' | 'leaderboard' | 'podium' | 'teams' | 'feud' | 'winner' | 'ended';
export interface Question { id: string; text: string; options: string[]; correct: number; seconds: number; points: number; practice?: boolean; image?: string }
export interface Survey { id: string; question: string; answers: {text: string; points: number; accept?: string}[] }
export interface Player {uid: string; name: string; campus: string; joinedAt: number; removed?: boolean}
export interface Standing extends Player {rank: number; score: number; answerTime: number}
export interface CampusStanding {campus: string; score: number; players: number; rank: number}
export interface Submission {option: number; receivedAt: number; attempt: string; pausedMs?: number}
export interface Team {id: number; name: string; players: string[]}
export interface Match {a: number; b: number; scores: [number, number]; winner?: number; rounds?: number}
export interface FeudState {match: number; survey: number; revealed: number[]; strikes: number; controlling: 0 | 1; multiplier: number; awarded: boolean; matches: Match[]; used: number[]; suddenDeath: boolean}
export interface Round {attempt: string; questionIndex: number; startedAt: number; endsAt: number; pausedMs: number; pauseAt?: number; remaining?: number; active: boolean; void?: boolean}
export interface Game {
 createdBy?:string;createdAt?:number;
 pin: string; name: string; theme: string; revision: number; phase: Phase;
 campuses: string[]; questions: Question[]; surveys: Survey[];
  campusTop: number; scoring: 'speed' | 'accuracy'; allowLate: boolean; leaderboardMode?: 'individual' | 'campus';
 index: number; round?: Round; rounds: Round[]; teams: Team[]; feud: FeudState;
 audit: {action: string; at: number}[]; undo?: {teams: Team[]; feud: FeudState; phase: Phase}[];
}
export interface PlayerResult {score: number; rank: number; total: number; campusRank: number; correct?: boolean; earned: number; option?: number; attempt?: string}
export interface PublicGame {
 pin: string; name: string; theme: string; phase: Phase; revision: number;
 campuses: string[]; scoring: 'speed' | 'accuracy'; allowLate: boolean;
  questionIndex: number; questionNumber: number; questionCount: number; practice: boolean; leaderboardMode?: 'individual' | 'campus';
 playerCount: number; recent: {name: string; campus: string}[];
 current?: Omit<Question, 'correct'>; round?: Round; correct?: number; distribution?: number[];
 leaders: Standing[]; campusesBoard: CampusStanding[]; teams: Team[];
 feud: FeudState; survey?: {question: string; answers: {text?: string; points?: number; index: number}[]};
 roundTotal: number; winner?: Team;
}
export type AnswerMap = Record<string, Record<string, Submission>>;
export interface Snapshot {game: Game; members: Record<string, Player>; answers: AnswerMap}
