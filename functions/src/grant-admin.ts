import {initializeApp,applicationDefault} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const [projectId,email]=process.argv.slice(2);
if(!projectId||!email)throw new Error('Usage: npm run grant-admin -- PROJECT_ID HOST_EMAIL');
async function main(){initializeApp({credential:applicationDefault(),projectId});
const user=await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid,{...user.customClaims,admin:true});
console.log('Host access granted to the requested existing Firebase user. Sign out and back in to refresh the token.');}
void main();
