import Alpine from 'alpinejs';
import htmx from 'htmx.org';

declare global {
	interface Window {
		Alpine: typeof Alpine;
		htmx: typeof htmx;
		f2wSync: typeof import('./sync-client');
	}
}

window.Alpine = Alpine;
window.htmx = htmx;

Alpine.start();

import { initSyncClient } from './sync-client';
import { initPageTransitions, initSwipeNavigation } from './transitions';
import { initSwipeHandlers, initNotificationSwipe } from './swipes';
import { initLottiePlayers } from './lottie';

initSyncClient();
initPageTransitions();
initSwipeNavigation();
initSwipeHandlers();
initNotificationSwipe();
initLottiePlayers();
