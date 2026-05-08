import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";

/**
 * ANTHROPIC_API_KEY is bound from Secret Manager. Each onCall that calls Claude
 * must declare it via `{ secrets: [ANTHROPIC_API_KEY_SECRET] }` so Cloud Run mounts
 * it into the function's process.env at runtime. The SDK reads it implicitly.
 */
export const ANTHROPIC_API_KEY_SECRET = defineSecret("ANTHROPIC_API_KEY");

admin.initializeApp();

export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
export const auth = admin.auth();
export const anthropic = new Anthropic();
