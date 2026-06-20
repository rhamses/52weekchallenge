import type { Env } from '../env';

export async function sendEmail(
	env: Env,
	to: string,
	subject: string,
	html: string,
): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID || !env.SES_FROM_EMAIL) {
		console.warn('SES not configured');
		return;
	}

	const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
	const client = new SESClient({
		region: env.AWS_REGION,
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});

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
