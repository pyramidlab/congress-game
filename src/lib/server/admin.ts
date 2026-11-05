import 'server-only';
import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';

export function adminServices(){
 const env=process.env,projectId=env.FIREBASE_PROJECT_ID||env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
 const databaseURL=env.FIREBASE_DATABASE_URL||env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
 const emulated=!!(projectId?.startsWith('demo-')&&env.FIREBASE_AUTH_EMULATOR_HOST&&env.FIREBASE_DATABASE_EMULATOR_HOST);
 if(!databaseURL||(!env.FIREBASE_SERVICE_ACCOUNT&&!emulated))throw new Error('The game server is not configured.');
 let app=getApps().find(app=>app.name==='congress-server');
 if(!app){
  let account;
  try{account=emulated?undefined:JSON.parse(env.FIREBASE_SERVICE_ACCOUNT!);}catch{throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.');}
  if(account&&account.project_id!==projectId)throw new Error('The service account belongs to a different Firebase project.');
  app=initializeApp({projectId,databaseURL,...(account?{credential:cert(account)}:{})},'congress-server');
 }
 return {app,auth:getAuth(app),db:getDatabase(app)};
}
