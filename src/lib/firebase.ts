import {initializeApp,getApps} from 'firebase/app';
import {getAuth,initializeAuth,browserLocalPersistence,signInAnonymously,signInWithEmailAndPassword,signOut,type Auth} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,type Database} from 'firebase/database';
import {connectAuthEmulator} from 'firebase/auth';
import {initializeAppCheck,ReCaptchaV3Provider,type AppCheck} from 'firebase/app-check';
export const configured=!!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
let client:{auth:Auth;db:Database}|undefined;
let authentication:Promise<unknown>|undefined;
let appCheck:AppCheck|undefined;
export async function firebaseClient(){
 if(!configured)throw new Error('Live play is not connected yet. The organiser is setting up Firebase.');
 if(!client){
  const app=getApps()[0]??initializeApp({
   apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
   projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,databaseURL:process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
   storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });
  let auth:Auth;try{auth=initializeAuth(app,{persistence:browserLocalPersistence});}catch{auth=getAuth(app);}
  const db=getDatabase(app);
  if(process.env.NEXT_PUBLIC_USE_EMULATORS==='true'){
   connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectDatabaseEmulator(db,'127.0.0.1',9000);
  }else if(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY){
   appCheck=initializeAppCheck(app,{provider:new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
  }
  client={auth,db};
 }
 const c=client;
 if(!c.auth.currentUser){
  authentication??=(async()=>{await c.auth.authStateReady();if(!c.auth.currentUser)await signInAnonymously(c.auth);})();
  try{await authentication;}finally{authentication=undefined;}
 }
 return c;
}
export async function hostLogin(email:string,password:string){const c=await firebaseClient();const credential=await signInWithEmailAndPassword(c.auth,email,password);try{await callable('hostAccess')({});}catch(error){await signOut(c.auth);throw error;}return credential.user;}
export function callable<Input=unknown,Output=unknown>(action:string){
 return async(data:Input):Promise<{data:Output}>=>{
  const c=await firebaseClient(),headers:Record<string,string>={'Content-Type':'application/json',Authorization:'Bearer '+await c.auth.currentUser!.getIdToken()};
  if(appCheck){
   const {getToken}=await import('firebase/app-check');headers['X-Firebase-AppCheck']=(await getToken(appCheck)).token;
  }
  const response=await fetch('/api/game/'+action,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok){const error=new Error(result.error||'Please retry.') as Error&{code:string};error.code='functions/'+(result.code||'internal');throw error;}
  return {data:result as Output};
 };
}
