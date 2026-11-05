import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import type { NextRequest } from "next/server";
export function admin() {
  const account = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulated = !!(
    projectId?.startsWith("demo-") &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    process.env.FIREBASE_DATABASE_EMULATOR_HOST
  );
  if ((!account && !emulated) || !process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL)
    throw new Error("The game server is not configured.");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        ...(emulated
          ? { projectId }
          : { credential: cert(JSON.parse(account!)) }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
  return { db: getDatabase(app), auth: getAuth(app) };
}
export async function identity(request: NextRequest, host = false) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue.");
  let uid: string;
  try {
    uid = (await admin().auth.verifyIdToken(token)).uid;
  } catch {
    throw new HttpError(401, "Your session expired. Please sign in again.");
  }
  if (
    host &&
    !process.env.HOST_UIDS?.split(",")
      .map((s) => s.trim())
      .includes(uid)
  )
    throw new HttpError(403, "This account is not authorised to host games.");
  return uid;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json(
    { error: "The game server could not complete this request. Please retry." },
    { status: 500 },
  );
}
export async function payload(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 100000) throw new HttpError(413, "Request is too large.");
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
export function gameCode(value: unknown) {
  if (typeof value !== "string" || !/^\d{6}$/.test(value))
    throw new HttpError(400, "Enter a valid six-digit game code.");
  return value;
}
