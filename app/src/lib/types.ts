export type SavingsMode = 'weekly' | 'monthly';
export type PeriodType = 'week' | 'month';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type PeriodStatus = 'pending' | 'completed' | 'skipped';
export type NotificationType = 'reminder' | 'milestone' | 'system';
export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

export interface User {
	id: string;
	cognito_sub: string | null;
	email: string;
	name: string | null;
	avatar_url: string | null;
	locale: Locale;
	default_currency: string;
}

export interface Goal {
	id: string;
	user_id: string;
	title: string;
	target_amount_cents: number;
	currency_code: string;
	savings_mode: SavingsMode;
	deadline_date: string | null;
	period_count: number;
	installment_cents: number;
	saved_amount_cents: number;
	status: GoalStatus;
	created_at: string;
	updated_at: string;
}

export interface GoalPeriod {
	id: string;
	goal_id: string;
	period_index: number;
	period_type: PeriodType;
	due_date: string;
	amount_cents: number;
	status: PeriodStatus;
	completed_at: string | null;
	note?: string | null;
	deposit_id?: string | null;
}

export interface Deposit {
	id: string;
	goal_id: string;
	period_id: string;
	amount_cents: number;
	note: string | null;
	deposited_at: string;
}

export interface Notification {
	id: string;
	user_id: string;
	goal_id: string | null;
	type: NotificationType;
	title: string;
	body: string;
	read_at: string | null;
	created_at: string;
}

export interface DraftGoal {
	title: string;
	target_amount_cents: number;
	currency_code: string;
	savings_mode: SavingsMode;
	use_custom_deadline: boolean;
	deadline_date: string | null;
}

export interface GoalWithProgress extends Goal {
	progress_percent: number;
}

export interface Env {
	DB: D1Database;
	CACHE: KVNamespace;
	SITE_URL: string;
	BETTER_AUTH_URL?: string;
	AUTH_SECRET: string;
	COGNITO_CLIENT_ID: string;
	COGNITO_CLIENT_SECRET: string;
	COGNITO_DOMAIN: string;
	COGNITO_USER_POOL_ID: string;
	AWS_ACCESS_KEY_ID: string;
	AWS_SECRET_ACCESS_KEY: string;
	AWS_REGION: string;
	SES_FROM_EMAIL: string;
	SNS_PLATFORM_ARN: string;
	VAPID_PUBLIC_KEY: string;
	VAPID_PRIVATE_KEY: string;
	VAPID_SUBJECT: string;
}
