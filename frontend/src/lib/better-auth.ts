import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { env } from 'cloudflare:workers';
import { syncF2wUserFromBetterAuth } from './user-sync';
import {
	authBaseUrl,
	authTrustedOrigins,
	isCognitoOAuthConfigured,
	requireAuthSecret,
	requireCognitoOAuthConfig,
} from './auth-config';

const COGNITO_IDPS = {
	'cognito-google': 'Google',
	'cognito-facebook': 'Facebook',
} as const;

/** Cognito User Pool should have "Link account with same email" enabled for federated IdPs. */
const COGNITO_OAUTH_PROVIDER_IDS_LIST = [
	'cognito-google',
	'cognito-facebook',
] as const;

function cognitoOAuthConfig(providerId: keyof typeof COGNITO_IDPS) {
	const { domain, clientId, clientSecret } = requireCognitoOAuthConfig();
	const base = `https://${domain}`;

	return {
		providerId,
		clientId,
		clientSecret,
		authorizationUrl: `${base}/oauth2/authorize`,
		tokenUrl: `${base}/oauth2/token`,
		userInfoUrl: `${base}/oauth2/userinfo`,
		scopes: ['openid', 'email', 'profile'],
		pkce: true,
		authorizationUrlParams: {
			identity_provider: COGNITO_IDPS[providerId],
		},
		mapProfileToUser: (profile: Record<string, unknown>) => {
			const email = profile.email as string | undefined;
			return {
				name:
					(profile.name as string) ||
					(profile.given_name as string) ||
					(profile.username as string) ||
					'User',
				email,
				image: (profile.picture as string) || null,
				emailVerified: email ? Boolean(profile.email_verified ?? true) : false,
			};
		},
	};
}

let authInstance: ReturnType<typeof betterAuth> | null = null;

export function createAuth() {
	if (authInstance) return authInstance;

	const baseURL = authBaseUrl();

	authInstance = betterAuth({
		secret: requireAuthSecret(),
		baseURL,
		trustedOrigins: authTrustedOrigins(),
		database: env.DB,
		user: {
			modelName: 'f2w_ba_user',
			fields: {
				email: 'email',
				name: 'name',
				image: 'image',
				emailVerified: 'emailVerified',
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			},
		},
		session: {
			modelName: 'f2w_session',
			fields: {
				userId: 'userId',
				token: 'token',
				expiresAt: 'expiresAt',
				ipAddress: 'ipAddress',
				userAgent: 'userAgent',
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			},
		},
		account: {
			modelName: 'f2w_account',
			fields: {
				userId: 'userId',
				accountId: 'accountId',
				providerId: 'providerId',
				accessToken: 'accessToken',
				refreshToken: 'refreshToken',
				idToken: 'idToken',
				accessTokenExpiresAt: 'accessTokenExpiresAt',
				refreshTokenExpiresAt: 'refreshTokenExpiresAt',
				scope: 'scope',
				password: 'password',
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			},
			accountLinking: {
				enabled: true,
				trustedProviders: [...COGNITO_OAUTH_PROVIDER_IDS_LIST],
				allowDifferentEmails: true,
				updateUserInfoOnLink: true,
			},
		},
		verification: {
			modelName: 'f2w_verification',
			fields: {
				identifier: 'identifier',
				value: 'value',
				expiresAt: 'expiresAt',
				createdAt: 'createdAt',
				updatedAt: 'updatedAt',
			},
		},
		advanced: {
			cookiePrefix: 'f2w',
		},
		plugins: isCognitoOAuthConfigured()
			? [
					genericOAuth({
						config: [
							cognitoOAuthConfig('cognito-google'),
							cognitoOAuthConfig('cognito-facebook'),
						],
					}),
				]
			: [],
		databaseHooks: {
			session: {
				create: {
					after: async (session) => {
						const row = await env.DB.prepare(
							`SELECT id, name, email, image, emailVerified FROM f2w_ba_user WHERE id = ?`,
						)
							.bind(session.userId)
							.first<{
								id: string;
								name: string;
								email: string;
								image: string | null;
								emailVerified: number | boolean;
							}>();

						if (row) {
							await syncF2wUserFromBetterAuth(env.DB, {
								id: row.id,
								name: row.name,
								email: row.email,
								image: row.image,
								emailVerified: Boolean(row.emailVerified),
							});
						}
					},
				},
			},
		},
	});

	return authInstance;
}

export const COGNITO_OAUTH_PROVIDER_IDS = {
	google: 'cognito-google',
	facebook: 'cognito-facebook',
} as const;

export type CognitoLoginProvider = keyof typeof COGNITO_OAUTH_PROVIDER_IDS;

export { isCognitoOAuthConfigured } from './auth-config';
