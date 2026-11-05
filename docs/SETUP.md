# Firebase and Vercel setup

## Firebase

1. Create a Firebase project and Web app. Create Realtime Database (not Firestore), preferably in Belgium/europe-west1, and copy its exact URL.
2. In Authentication, select Get started, then enable **Anonymous** and **Email/Password**.
3. Create the host email/password user in Authentication → Users. Copy its **UID** into `HOST_UIDS`; separate multiple operator UIDs with commas. Removing a UID denies that account's host API access. No custom-claim grant or Firebase CLI login is needed.
4. Publish `database.rules.json` in the database Rules editor. The application permits only valid, first, server-timestamped answers for the current open attempt; game and score writes are server-only.
5. Add the deployed hostname to Authentication → Settings → Authorized domains.
6. Generate a service account under Project settings → Service accounts. Store its entire JSON in Vercel's **server-only** `FIREBASE_SERVICE_ACCOUNT` variable. Do not put it in a public variable or commit it.

For 200 simultaneous phones, use Firebase **Blaze**: Spark has a hard limit of 100 database connections, including tabs and server connections. See [Firebase connection limits](https://firebase.google.com/docs/database/faq-and-troubleshooting). Billing activation is performed by the project owner.

Also schedule a temporary higher Auth sign-up quota for the event if many new phones share one public IP. The default is 100 new accounts/hour/IP. Set it above the audience plus test/projector devices, and rehearse behind the venue NAT. See [Authentication limits](https://firebase.google.com/docs/auth/limits).

## Vercel environment variables

Set the following in Production and in the intended Preview environment:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional Web app configuration)
- `NEXT_PUBLIC_USE_EMULATORS=false`
- `HOST_UIDS` — operator Authentication UIDs
- `FIREBASE_SERVICE_ACCOUNT` — entire service-account JSON, marked Secret/Sensitive

In Vercel's individual value field, paste the JSON including its outer braces and existing escaped newlines. Do not add a variable name, Markdown fences or surrounding single quotes. For local `.env.local`, wrap that JSON in single quotes. Keep private credentials out of GitHub.

The service account needs Firebase Auth token/user access and Realtime Database administration for the intended project. It does not need to deploy Cloud Functions or enable Google Cloud services. Backups are archived as named CSV/JSON file objects privately in Realtime Database; no Storage bucket is required.

Import the repository's application branch into Vercel. Framework: Next.js; root: repository root; Node.js: 22.x; install: `npm ci`; build: `npm run build`. `vercel.json` supplies framework/build detection so a previously empty project does not remain a static “Other” deployment. Rebuild after setting public variables. A Ready deployment of a README-only commit will still return 404.

`/api/health` lists missing variable names without exposing values. Configured means settings are present; it does not prove a complete live game has passed.

## Optional App Check

Register the Web app with reCAPTCHA v3, allow the deployed domains, and put its site key in `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`. After real-device checks, set server variable `ENFORCE_APP_CHECK=true`, redeploy Vercel, and enable Realtime Database enforcement in Firebase. Initial deployment uses Firebase Authentication and strict database rules without requiring this extra setup.

## Local emulators

Use Node 22 and Java 21+. Run `npm run emulators`. Auth uses port 9099, Database 9000 and the UI 4000. The automated API test supplies demo-only server configuration and mock host identity; it never targets a live project. Its production server uses port 3105.

For browser testing, configure public demo Web values with project `demo-congress`, database URL `https://demo-congress-default-rtdb.firebaseio.com` and `NEXT_PUBLIC_USE_EMULATORS=true`. Supply server `FIREBASE_PROJECT_ID=demo-congress`, matching `FIREBASE_DATABASE_URL`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000`. Add the emulator host user's UID to `HOST_UIDS`. Restart after environment changes.
