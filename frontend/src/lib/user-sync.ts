import type { User } from './types';
import { generateId } from './calculations';
import { getUserByEmail, upsertUser } from './db';

export interface BetterAuthUserRow {
	id: string;
	name: string;
	email: string;
	image?: string | null;
	emailVerified?: boolean;
}

export async function syncF2wUserFromBetterAuth(
	db: D1Database,
	baUser: BetterAuthUserRow,
): Promise<User> {
	const account = await db
		.prepare(
			`SELECT accountId FROM f2w_account WHERE userId = ? AND providerId LIKE 'cognito-%' LIMIT 1`,
		)
		.bind(baUser.id)
		.first<{ accountId: string }>();

	const existing = await getUserByEmail(db, baUser.email);

	return upsertUser(db, {
		id: existing?.id ?? generateId(),
		cognito_sub: account?.accountId ?? existing?.cognito_sub ?? null,
		email: baUser.email,
		name: baUser.name,
		avatar_url: baUser.image ?? existing?.avatar_url ?? null,
		locale: existing?.locale,
	});
}

export async function getF2wUserByEmail(db: D1Database, email: string): Promise<User | null> {
	return getUserByEmail(db, email);
}
