import { hydrateGoalDetailFromCache } from './deposits';
import { hydrateGoalsList } from './goals-optimistic';
import { hydrateNotificationsList } from './notifications-optimistic';

export function hydrateOptimisticState(): void {
	if (document.getElementById('goal-summary')) {
		hydrateGoalDetailFromCache();
	}
	if (document.querySelector('[data-goals-list]')) {
		hydrateGoalsList();
	}
	if (document.getElementById('notification-list')) {
		hydrateNotificationsList();
	}
}
