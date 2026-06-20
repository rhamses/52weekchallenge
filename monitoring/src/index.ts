export type { Env } from './env';
import type { Env } from './env';
import { processDueToday } from './scheduled/process-due-today';

export default {
	async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
		await processDueToday(env);
	},
};
