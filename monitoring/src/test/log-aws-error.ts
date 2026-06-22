export interface AwsSdkError extends Error {
	name: string;
	$metadata?: {
		httpStatusCode?: number;
		requestId?: string;
		attempts?: number;
		totalRetryDelay?: number;
	};
	Code?: string;
	Type?: string;
	Detail?: string;
}

export function isAwsSdkError(err: unknown): err is AwsSdkError {
	return err instanceof Error && 'name' in err;
}

export function logAwsError(context: string, err: unknown): void {
	console.error(`\n[AWS ERROR] ${context}`);
	console.error('─'.repeat(60));

	if (!isAwsSdkError(err)) {
		console.error('Erro desconhecido:', err);
		return;
	}

	console.error(`Tipo:    ${err.name}`);
	if (err.Code) console.error(`Code:    ${err.Code}`);
	console.error(`Mensagem: ${err.message}`);
	if (err.Type) console.error(`Type:    ${err.Type}`);
	if (err.Detail) console.error(`Detail:  ${err.Detail}`);

	if (err.$metadata) {
		const { httpStatusCode, requestId, attempts } = err.$metadata;
		if (httpStatusCode) console.error(`HTTP:    ${httpStatusCode}`);
		if (requestId) console.error(`Request: ${requestId}`);
		if (attempts) console.error(`Tentativas: ${attempts}`);
	}

	const hints = getFixHints(err);
	if (hints.length) {
		console.error('\nPossíveis correções:');
		for (const hint of hints) {
			console.error(`  • ${hint}`);
		}
	}

	console.error('─'.repeat(60));
}

function getFixHints(err: AwsSdkError): string[] {
	const hints: string[] = [];
	const text = `${err.name} ${err.Code ?? ''} ${err.message}`.toLowerCase();

	if (text.includes('invalidclienttokenid') || text.includes('signature')) {
		hints.push('Verifique AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY em .dev.vars');
	}
	if (text.includes('unrecognizedclientexception') || text.includes('invalid region')) {
		hints.push('AWS_REGION inválida — use ex.: us-east-1 ou sa-east-1 (não us-sa-1)');
	}
	if (text.includes('accessdenied') || text.includes('not authorized')) {
		hints.push('A IAM user/role precisa das permissões corretas (ses:SendEmail, ses:GetSendQuota, etc.)');
	}
	if (text.includes('messagerejected') || text.includes('email address is not verified')) {
		hints.push('No sandbox SES, remetente e destinatário precisam estar verificados no console AWS');
		hints.push('Verifique SES_FROM_EMAIL e TEST_EMAIL no console SES → Verified identities');
	}
	if (text.includes('enotfound') || text.includes('not found') && text.includes('amazonaws')) {
		hints.push(`Região AWS inválida ou endpoint inexistente — confira AWS_REGION (atual pode estar errada, ex.: us-sa-1 → sa-east-1)`);
	}

	return hints;
}
