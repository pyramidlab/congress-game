import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const env={...process.env,FIREBASE_PROJECT_ID:'demo-congress',FIREBASE_DATABASE_URL:'https://demo-congress-default-rtdb.firebaseio.com',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',FIREBASE_SERVICE_ACCOUNT:'',HOST_UIDS:'',ENFORCE_APP_CHECK:'false'};
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3105'],{env,stdio:'inherit'});
let exited=false;server.on('exit',()=>exited=true);
try{
 let ready=false;for(let i=0;i<100;i++){if(exited)throw Error('Test server exited.');try{const response=await fetch('http://127.0.0.1:3105/');if(response.ok){ready=true;break;}}catch{}await delay(200);}
 if(!ready)throw Error('Test server did not become ready.');
 const test=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','tests/api.integration.ts'],{env,stdio:'inherit'});
 process.exitCode=await new Promise(resolve=>test.on('exit',code=>resolve(code??1)));
}finally{server.kill();}
