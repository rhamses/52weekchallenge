export function initPageTransitions(): void {
	if (!document.startViewTransition) return;

	document.addEventListener('click', (event) => {
		const target = (event.target as Element)?.closest('a[href]') as HTMLAnchorElement | null;
		if (!target) return;
		const href = target.getAttribute('href');
		if (
			!href ||
			href.startsWith('#') ||
			href.startsWith('http') ||
			href.startsWith('/api/') ||
			target.hasAttribute('data-no-transition')
		) {
			return;
		}
		if (target.target === '_blank' || event.metaKey || event.ctrlKey) return;

		event.preventDefault();
		const direction = target.dataset.transition === 'back' ? 'back' : 'forward';
		document.documentElement.dataset.transition = direction;

		document.startViewTransition(() => {
			window.location.href = href;
		});
	});
}

const EDGE_SWIPE_THRESHOLD = 80;
const EDGE_ZONE_PX = 24;

function isSwipeNavBlocked(target: EventTarget | null): boolean {
	const el = (target as Element)?.closest(
		'input, textarea, select, button, a, [data-swipe-item], [data-notification-item], [data-no-swipe-nav]',
	);
	return Boolean(el);
}

export function initSwipeNavigation(): void {
	let startX = 0;
	let startY = 0;
	let blocked = false;

	document.addEventListener(
		'touchstart',
		(e) => {
			if (e.touches.length !== 1) return;
			blocked = isSwipeNavBlocked(e.target);
			if (blocked) return;
			startX = e.touches[0].clientX;
			startY = e.touches[0].clientY;
		},
		{ passive: true },
	);

	document.addEventListener(
		'touchend',
		(e) => {
			if (blocked) {
				blocked = false;
				return;
			}

			const touch = e.changedTouches[0];
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;
			if (Math.abs(dx) < EDGE_SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;
			if (dx > 0 && startX < EDGE_ZONE_PX && window.history.length > 1) {
				document.documentElement.dataset.transition = 'back';
				window.history.back();
			}
		},
		{ passive: true },
	);
}

// Re-export for interactive.ts
export { initSwipeNavigation as initPageSwipeNav };
