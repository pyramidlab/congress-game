export const runtime='nodejs';
export function GET(){
 const required=['FIREBASE_SERVICE_ACCOUNT','HOST_UIDS','NEXT_PUBLIC_FIREBASE_PROJECT_ID','NEXT_PUBLIC_FIREBASE_DATABASE_URL'];
 const missing=required.filter(key=>!process.env[key]);
 return Response.json({configured:missing.length===0,missing},{status:missing.length?503:200,headers:{'Cache-Control':'no-store'}});
}
