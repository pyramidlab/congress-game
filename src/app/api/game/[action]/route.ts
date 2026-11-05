import type {NextRequest} from 'next/server';
import {adminServices} from '@/lib/server/admin';
import * as game from '@/lib/server/service';
export const runtime='nodejs';
export const maxDuration=30;
const handlers:Record<string,(request:game.ServiceRequest)=>Promise<unknown>>={
 createGame:game.createGame,hostAccess:game.hostAccess,hostState:game.hostState,hostLibrary:game.hostLibrary,
 joinGame:game.joinGame,hostCommand:game.hostCommand,exportGame:game.exportGame,
 playerReview:game.playerReview,syncGame:game.syncGame,gameProgress:game.gameProgress,exportBackup:game.exportBackup
};
export async function POST(request:NextRequest,context:{params:Promise<{action:string}>}){
 try{
  const {action}=await context.params,handler=handlers[action];if(!handler)return Response.json({error:'Unknown game action.'},{status:404});
  if(Number(request.headers.get('content-length'))>150000)throw new game.ServiceError('invalid-argument','Request is too large.');
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)throw new game.ServiceError('unauthenticated','Sign in to continue.');
  const text=await request.text();if(text.length>150000)throw new game.ServiceError('invalid-argument','Request is too large.');
  let data;try{data=JSON.parse(text);}catch{throw new game.ServiceError('invalid-argument','Invalid request.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new game.ServiceError('invalid-argument','Invalid request.');
  const services=adminServices();let identity;
  try{identity=await services.auth.verifyIdToken(token);}catch{throw new game.ServiceError('unauthenticated','Your session expired. Sign in again.');}
  if(process.env.ENFORCE_APP_CHECK==='true'){
   const check=request.headers.get('x-firebase-appcheck');if(!check)throw new game.ServiceError('unauthenticated','App verification is required.');
   try{const {getAppCheck}=await import('firebase-admin/app-check');await getAppCheck(services.app).verifyToken(check);}catch{throw new game.ServiceError('unauthenticated','App verification failed. Refresh and retry.');}
  }
  const ip=(request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim().slice(0,100);
  return Response.json(await handler({auth:{uid:identity.uid,token:identity},data,rawRequest:{ip}}));
 }catch(error){
  if(error instanceof game.ServiceError){const statuses:Record<string,number>={unauthenticated:401,'permission-denied':403,'not-found':404,'invalid-argument':400,aborted:409,'failed-precondition':409,'resource-exhausted':429};return Response.json({error:error.message,code:error.code},{status:statuses[error.code]||400});}
  console.error('Game API failed:',error instanceof Error?error.name:'Unknown error');
  return Response.json({error:'The game server could not complete this request. Check its Firebase configuration.',code:'internal'},{status:503});
 }
}
