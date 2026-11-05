import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:start','--project','demo-congress'],{stdio:'inherit',env:{...process.env,DATABASE_URL:'https://demo-congress-default-rtdb.firebaseio.com',FUNCTIONS_DISCOVERY_TIMEOUT:process.env.FUNCTIONS_DISCOVERY_TIMEOUT||'60'}});
child.on('exit',code=>process.exitCode=code??1);
