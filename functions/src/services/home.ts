import { db } from "../config";
import type { CreateHomeInput, Home } from "../../../shared/src/index";

export async function createHome(
  userId: string,
  input: CreateHomeInput,
): Promise<Home> {
  const ref = db.collection("homes").doc();
  const now = new Date();
  const home: Home = {
    id: ref.id,
    userId,
    nickname: input.nickname,
    zipCode: input.zipCode,
    address: input.address,
    yearBuilt: input.yearBuilt,
    squareFeet: input.squareFeet,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(home);
  await db.doc(`users/${userId}`).set(
    { primaryHomeId: ref.id, updatedAt: now },
    { merge: true },
  );
  return home;
}

export async function ensureHome(
  userId: string,
  zipCode: string,
): Promise<string> {
  const userRef = db.doc(`users/${userId}`);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : {};
  const existingId = userData["primaryHomeId"] as string | undefined;
  if (existingId) {
    const homeSnap = await db.doc(`homes/${existingId}`).get();
    if (homeSnap.exists) {
      const home = homeSnap.data() as Home;
      if (!home.zipCode && zipCode) {
        await homeSnap.ref.update({ zipCode, updatedAt: new Date() });
      }
      return existingId;
    }
  }
  const home = await createHome(userId, {
    nickname: "Main home",
    zipCode,
  });
  return home.id;
}
