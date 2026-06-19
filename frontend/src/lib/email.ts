import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { Env } from './types';

function getSesClient(env: Pick<Env, 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'AWS_REGION'>) {
	return new SESClient({
		region: env.AWS_REGION,
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});
}

export async function sendFirstDepositEmail(
	env: Pick<Env, 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'AWS_REGION' | 'SES_FROM_EMAIL'>,
	to: string,
	userName: string,
	goalTitle: string,
): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID || !env.SES_FROM_EMAIL) {
		console.warn('SES not configured, skipping first deposit email');
		return;
	}

	const client = getSesClient(env);
	const html = `
    <h1>Congratulations, ${userName}!</h1>
    <p>The first step toward your goal <strong>${goalTitle}</strong> has been taken.</p>
    <p>Keep going — week by week you will get there.</p>
  `;

	await client.send(
		new SendEmailCommand({
			Source: env.SES_FROM_EMAIL,
			Destination: { ToAddresses: [to] },
			Message: {
				Subject: { Data: 'Congratulations — your first deposit!' },
				Body: { Html: { Data: html } },
			},
		}),
	);
}

export async function sendReminderEmail(
	env: Pick<Env, 'AWS_ACCESS_KEY_ID' | 'AWS_SECRET_ACCESS_KEY' | 'AWS_REGION' | 'SES_FROM_EMAIL'>,
	to: string,
	subject: string,
	html: string,
): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID || !env.SES_FROM_EMAIL) return;

	const client = getSesClient(env);
	await client.send(
		new SendEmailCommand({
			Source: env.SES_FROM_EMAIL,
			Destination: { ToAddresses: [to] },
			Message: {
				Subject: { Data: subject },
				Body: { Html: { Data: html } },
			},
		}),
	);
}
