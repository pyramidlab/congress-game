# Firebase and Vercel setup

## Firebase project

1. Create the Firebase project and a Web app. Use a billing-enabled Blaze project for deployed Functions, Cloud Tasks and Cloud Storage. Set a billing budget alert in Google Cloud.
2. Create a **Realtime Database**, preferably in `europe-west1`, and Cloud Storage. This app uses Realtime Database, not Firestore. Keep the Functions region and database location aligned; the source defaults to `europe-west1`.
3. Enable Authentication providers **Anonymous** (players) and **Email/password** (hosts). Create one or two host users in the Firebase console.
4. Add the Vercel production domain and your selected preview domain under Authentication authorized domains. Add localhost for local testing if needed.
5. Register the Web app with App Check using reCAPTCHA v3, allow the deployed domains, and put its public site key in `NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY`. After confirming real devices produce valid tokens, set `ENFORCE_APP_CHECK=true` in `functions/.env.YOUR_PROJECT_ID` and redeploy Functions. Enable Realtime Database App Check enforcement as well. Initial deployment uses Firebase Authentication and the strict database rules; App Check enforcement is opt-in until its domains and site key are configured.
6. Schedule a higher sign-up quota for the event if many phones share one public IP. Firebase's default new-account limit is 100/hour/IP, which can block a 200-person Wi-Fi lobby. Set it above the audience plus projector/test devices and rehearse behind the venue's NAT. See [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits) and [anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth).

Copy the Firebase Web configuration into `.env.local` using `.env.example`. All `NEXT_PUBLIC_` values are bundled into the browser; never put private credentials there. For the deployed frontend set the same values in Vercel's project environment settings before building. Set `NEXT_PUBLIC_USE_EMULATORS=false` in deployed environments.

## Deploy rules and Functions

Use Node.js 22. From the repository:

```sh
npm ci
npm ci --prefix functions
npx firebase login
npx firebase use --add
npx tsc -p functions/tsconfig.json
npx firebase deploy --only database,storage,functions
```

Select the new project when prompted; `demo-congress` is only for local emulators. Firebase deploy enables required APIs and creates the `closeQuestion` task queue. Accept required API enablement only in the intended project. The deployer needs permissions to deploy Functions, rules and tasks.

The Functions runtime service account must be able to enqueue and invoke `closeQuestion`: `cloudtasks.tasks.create` (Cloud Tasks Enqueuer), permission to act as the task's service account (`iam.serviceAccounts.actAs` where applicable), and the appropriate authenticated function invocation role. Use the runtime service account shown on the deployed Function, rather than assuming its email. Grant only the needed roles and invocation access. Follow [Firebase task queue IAM setup](https://firebase.google.com/docs/functions/task-functions#iam_permissions). Start a test question and verify automatic reveal at its deadline. A red scheduler notice in the host console means to fix IAM before the event; manual reveal remains available.

The runtime account also needs Realtime Database and Storage access (normal Firebase Admin runtime permissions). Check that the default Storage bucket exists; backups use it. No service account key is shipped to Vercel because Vercel serves only the frontend.

## Give the host access

The grant script runs on a trusted development machine with Google Application Default Credentials for this project. The target email must already exist in Firebase Authentication.

```sh
gcloud auth application-default login
npm run grant-admin -- YOUR_PROJECT_ID host@example.com
```

Repeat for a second host. Sign out and sign in on the website after changing claims. Anyone with an `admin` claim can operate every event, so grant it only to operators. Never commit downloaded service account keys or `.env.local`.

## Vercel

Import `pyramidlab/congress-game` into the intended PyramidLab Vercel team. Choose the implementation branch while the PR is under review, then main after merging. Framework: Next.js. Root: repository root. Node: 22. Install: `npm ci`. Build: `npm run build`. No Vercel database, API credential or WebSocket service is needed.

Add every applicable variable from `.env.example` to the production and intended preview environments, including the App Check site key. Environment changes require a new frontend build. Keep protected previews for review; for actual phones use a reachable HTTPS deployment whose Auth/App Check domains are allowed. Use a short custom domain when available, then scan its QR from a phone.

## Local emulators

```sh
npm run emulators
```

Requires Java 21+ and Node 22. In `.env.local`, use `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-congress`, a non-empty demo API key/app ID, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-congress.firebaseapp.com`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://demo-congress-default-rtdb.firebaseio.com`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-congress.appspot.com` and `NEXT_PUBLIC_USE_EMULATORS=true`. Restart the dev server after changing these.

Use the Emulator UI on port 4000 to create a host email/password user, then set its admin claim with the grant script while `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. The client emulator URLs use localhost and are intended for desktop testing. Real phone rehearsal should use the configured HTTPS Firebase deployment. Automatic task scheduling is skipped in emulators; use manual reveal.


