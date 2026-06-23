import { db } from './index.js';
import { users } from './schema.js';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      name,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        name,
      },
    })
    .returning();

  return result[0];
}
