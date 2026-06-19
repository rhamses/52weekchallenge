import type { User } from './types';
import { createAuth } from './better-auth';
import { getF2wUserByEmail } from './user-sync';

export async function getAppUserFromRequest(
	db: D1Database,
	request: Request,
): Promise<User | null> {
	const session = await createAuth().api.getSession({ headers: request.headers });
	if (!session?.user?.email) return null;
	return getF2wUserByEmail(db, session.user.email);
}
