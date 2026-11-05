export const dynamic = 'force-dynamic';
export function GET() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'HOST_UIDS',
    'FIREBASE_SERVICE_ACCOUNT',
  ];
  const missing = required.filter(key => !process.env[key]?.trim());
  let serviceAccountValid = false;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      serviceAccountValid = !!(account.project_id && account.client_email && account.private_key);
    } catch { /* Never return credential contents or parser errors. */ }
  }
  return Response.json({ status: missing.length || !serviceAccountValid ? 'setup_required' : 'configured', missing, serviceAccountValid, note: 'Configuration presence only. Live Firebase connectivity is not tested by this endpoint.' }, { headers: { 'Cache-Control': 'no-store' } });
}
