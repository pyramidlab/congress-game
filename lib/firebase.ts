"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const configured = !!(
  config.apiKey &&
  config.databaseURL &&
  config.projectId &&
  config.appId
);
export function services() {
  if (!configured)
    throw new Error(
      "Firebase is not configured yet. Follow the setup guide to connect this game.",
    );
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getDatabase(app) };
}
let signingIn: Promise<void> | null = null;
export async function playerAuth() {
  const { auth } = services();
  await auth.authStateReady();
  if (!auth.currentUser) {
    signingIn ??= (async () => {
      await setPersistence(auth, browserLocalPersistence);
      await signInAnonymously(auth);
    })().finally(() => {
      signingIn = null;
    });
    await signingIn;
  }
  return auth.currentUser!;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = Record<string, unknown>>(
  path: string,
  body: object,
): Promise<T> {
  const user = await playerAuth();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.error || "Something went wrong. Please try again.",
      response.status,
    );
  return data;
}
