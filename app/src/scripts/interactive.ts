import Alpine from 'alpinejs';
import htmx from 'htmx.org';

declare global {
	interface Window {
		Alpine: typeof Alpine;
		htmx: typeof htmx;
		f2wSync: typeof import('./sync-client');
	}
}

document.addEventListener('alpine:init', () => {
	const raw = document.body.dataset.appErrorLabels;
	const labels = raw ? JSON.parse(raw) : { title: 'Error', ok: 'OK' };
	Alpine.data('appError', () => ({
		visible: false,
		message: '',
		title: labels.title,
		okLabel: labels.ok,
		open(msg: string) {
			this.message = msg;
			this.visible = true;
		},
		close() {
			this.visible = false;
		},
	}));
});

window.Alpine = Alpine;
Alpine.start();

import { initSyncClient } from './sync-client';
import { initPageTransitions, initSwipeNavigation } from './transitions';
import { initSwipeHandlers, initNotificationSwipe } from './swipes';
import { initLottiePlayers } from './lottie';
import { initGoalsOptimistic } from './goals-optimistic';
import { initNotificationsOptimistic } from './notifications-optimistic';
import { hydrateOptimisticState } from './hydrate-optimistic';
import { initGoalSummarySticky } from './goal-summary-sticky';
import { initPwaInstall } from './pwa-install';
import { initPwaUpdate } from './pwa-update';
import { initPushClient } from './push-client';

initSyncClient();
initGoalsOptimistic();
initNotificationsOptimistic();
hydrateOptimisticState();
initGoalSummarySticky();
initPwaInstall();
initPwaUpdate();
void initPushClient();
initPageTransitions();
initSwipeNavigation();
initSwipeHandlers();
initNotificationSwipe();
initLottiePlayers();
