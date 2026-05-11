/**
 * Hard caps on user-supplied free-form text. These bound both
 * context-stuffing attacks (50KB description = ~$0.50 in extra Claude
 * tokens per agent run) and copy-paste injection payloads.
 *
 * Caps are chosen to comfortably accommodate real user input:
 * a thoughtful project description rarely exceeds 500 chars; a clarification
 * answer rarely exceeds 400. The cap is a guardrail, not a UX cap.
 */
import { HttpsError } from "firebase-functions/v2/https";

export const INPUT_LIMITS = {
  title: 200,
  description: 2000,
  message: 1000,
  question: 1000,
  zipCode: 12, // 5-digit + 4-digit + dash, plus a small slop
};

export function assertStringField(
  value: unknown,
  field: keyof typeof INPUT_LIMITS,
  opts: { required?: boolean } = {},
): string {
  const required = opts.required ?? true;
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new HttpsError("invalid-argument", `${field} is required`);
    }
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new HttpsError("invalid-argument", `${field} must not be blank`);
  }
  const cap = INPUT_LIMITS[field];
  if (trimmed.length > cap) {
    throw new HttpsError(
      "invalid-argument",
      `${field} is too long (max ${cap} characters)`,
    );
  }
  return trimmed;
}
