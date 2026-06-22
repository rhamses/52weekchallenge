import { beforeAll, describe, expect, it } from 'vitest';
import {
	GetIdentityVerificationAttributesCommand,
	GetSendQuotaCommand,
	SESClient,
} from '@aws-sdk/client-ses';
import { sendEmail } from '../dispatch/email';
import { loadIntegrationEnv, logConfigSummary } from '../test/integration-env';
import { logAwsError } from '../test/log-aws-error';

describe('AWS SES — email (integração real)', () => {
	const { env, vars, testEmail } = loadIntegrationEnv();
	const recipient = testEmail ?? env.SES_FROM_EMAIL;

	beforeAll(() => {
		logConfigSummary(vars);
	});

	it('credenciais AWS são aceitas pelo SES', async () => {
		const client = new SESClient({
			region: env.AWS_REGION,
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			},
		});

		try {
			const quota = await client.send(new GetSendQuotaCommand({}));
			console.log('\n[SES] Credenciais válidas. Quota diária:', quota.Max24HourSend);
			console.log('[SES] Enviados nas últimas 24h:', quota.SentLast24Hours);
		} catch (err) {
			logAwsError('GetSendQuota — credenciais ou região inválidas', err);
			throw err;
		}
	});

	it('SES_FROM_EMAIL está verificado no SES', async () => {
		if (!env.SES_FROM_EMAIL) {
			console.error('\n[SES] SES_FROM_EMAIL não definido em .dev.vars');
			expect.fail('Defina SES_FROM_EMAIL em .dev.vars');
		}

		const client = new SESClient({
			region: env.AWS_REGION,
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID,
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
			},
		});

		const domain = env.SES_FROM_EMAIL.split('@')[1];

		try {
			const result = await client.send(
				new GetIdentityVerificationAttributesCommand({
					Identities: [env.SES_FROM_EMAIL, domain],
				}),
			);

			const emailStatus =
				result.VerificationAttributes?.[env.SES_FROM_EMAIL]?.VerificationStatus;
			const domainStatus = result.VerificationAttributes?.[domain]?.VerificationStatus;
			console.log(`\n[SES] Status de ${env.SES_FROM_EMAIL}: ${emailStatus ?? 'não encontrado'}`);
			console.log(`[SES] Status do domínio ${domain}: ${domainStatus ?? 'não encontrado'}`);

			const verified = emailStatus === 'Success' || domainStatus === 'Success';
			if (!verified) {
				console.error(
					`[SES] Remetente não verificado. Verifique ${domain} ou ${env.SES_FROM_EMAIL} no console SES → Verified identities`,
				);
			}

			expect(verified).toBe(true);
		} catch (err) {
			logAwsError(`GetIdentityVerificationAttributes — ${env.SES_FROM_EMAIL}`, err);
			throw err;
		}
	});

	it('envia email de teste real via SES', async () => {
		if (!env.SES_FROM_EMAIL) {
			expect.fail('Defina SES_FROM_EMAIL em .dev.vars');
		}
		if (!recipient) {
			expect.fail('Defina TEST_EMAIL ou SES_FROM_EMAIL em .dev.vars');
		}

		console.log(`\n[SES] Enviando email de teste: ${env.SES_FROM_EMAIL} → ${recipient}`);

		try {
			await sendEmail(
				env,
				recipient,
				'[52weekchallenge] Teste de integração SES',
				`<p>Email de teste enviado em ${new Date().toISOString()}.</p><p>Se você recebeu, SES está configurado corretamente.</p>`,
			);
			console.log('[SES] Email enviado com sucesso.');
		} catch (err) {
			logAwsError(`SendEmail — ${env.SES_FROM_EMAIL} → ${recipient}`, err);
			throw err;
		}
	});
});
