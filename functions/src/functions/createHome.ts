import { onCall, HttpsError } from "firebase-functions/v2/https";
import { createHome as createHomeService } from "../services/home";
import type { CreateHomeInput } from "../../../shared/src/index";

export const createHome = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const input = request.data as CreateHomeInput;
  if (!input.zipCode || typeof input.zipCode !== "string") {
    throw new HttpsError("invalid-argument", "zipCode is required");
  }
  if (!input.nickname || typeof input.nickname !== "string") {
    throw new HttpsError("invalid-argument", "nickname is required");
  }

  const home = await createHomeService(request.auth.uid, input);
  return { homeId: home.id };
});
