import {initializeApp,getApps} from 'firebase/app';
import {getAuth,initializeAuth,browserLocalPersistence,signInAnonymously,signInWithEmailAndPassword,signOut,type Auth} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,type Database} from 'firebase/database';
import {getFunctions,connectFunctionsEmulator,type Functions} from 'firebase/functions';
import {connectAuthEmulator} from 'firebase/auth';
import {initializeAppCheck,ReCaptchaV3Provider} from 'firebase/app-check';
export const configured=!!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
let client:{auth:Auth;db:Database;fn:Functions}|undefined;
let authentication:Promise<unknown>|undefined;
export async function firebaseClient(){
 if(!configured)throw new Error('Live play is not connected yet. The organiser is setting up Firebase.');
 if(!client){
  const app=getApps()[0]??initializeApp({
   apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
   projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,databaseURL:process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
   storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });
  let auth:Auth;try{auth=initializeAuth(app,{persistence:browserLocalPersistence});}catch{auth=getAuth(app);}
  const db=getDatabase(app),fn=getFunctions(app,process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION||'europe-west1');
  if(process.env.NEXT_PUBLIC_USE_EMULATORS==='true'){
   connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectDatabaseEmulator(db,'127.0.0.1',9000);connectFunctionsEmulator(fn,'127.0.0.1',5001);
  }else if(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY){
   initializeAppCheck(app,{provider:new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
  }
  client={auth,db,fn};
 }
 const c=client;
 if(!c.auth.currentUser){
  authentication??=(async()=>{await c.auth.authStateReady();if(!c.auth.currentUser)await signInAnonymously(c.auth);})();
  try{await authentication;}finally{authentication=undefined;}
 }
 return c;
}
export async function hostLogin(email:string,password:string){const c=await firebaseClient();const credential=await signInWithEmailAndPassword(c.auth,email,password);const t=await credential.user.getIdTokenResult(true);if(t.claims.admin!==true){await signOut(c.auth);throw new Error('This account has not been given host access.');}return credential.user;}
