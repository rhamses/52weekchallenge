import { confirmDeposit, undoDeposit } from './deposits';
import { deleteNotificationOptimistically } from './notifications-optimistic';

const SWIPE_THRESHOLD = 80;
const HORIZONTAL_LOCK_PX = 10;

function preventHorizontalBrowserNav(e: TouchEvent, startX: number, startY: number): void {
	const touch = e.touches[0];
	const dx = touch.clientX - startX;
	const dy = touch.clientY - startY;
	if (Math.abs(dx) > HORIZONTAL_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
		e.preventDefault();
	}
}

export function initSwipeHandlers(): void {
	document.querySelectorAll('[data-swipe-item]').forEach((el) => {
		if ((el as HTMLElement).dataset.swipeBound) return;
		(el as HTMLElement).dataset.swipeBound = 'true';

		let startX = 0;
		let startY = 0;
		let currentX = 0;
		let dragging = false;

		const onStart = (clientX: number, clientY: number) => {
			startX = clientX;
			startY = clientY;
			currentX = 0;
			dragging = true;
			(el as HTMLElement).style.transition = 'none';
		};

		const onMove = (clientX: number) => {
			if (!dragging) return;
			currentX = clientX - startX;
			(el as HTMLElement).style.transform = `translateX(${currentX}px)`;
		};

		const onEnd = () => {
			if (!dragging) return;
			dragging = false;
			(el as HTMLElement).style.transition = 'transform 0.25s ease';

			const item = el as HTMLElement;
			const depositUrl = item.dataset.depositUrl;
			const undoUrl = item.dataset.undoUrl;

			if (currentX <= -SWIPE_THRESHOLD && depositUrl) {
				item.style.transform = 'translateX(-100%)';
				confirmDeposit(item, depositUrl);
			} else if (currentX >= SWIPE_THRESHOLD && undoUrl) {
				item.style.transform = 'translateX(100%)';
				undoDeposit(item, undoUrl);
			} else {
				item.style.transform = 'translateX(0)';
			}
		};

		el.addEventListener(
			'touchstart',
			(e) => onStart(e.touches[0].clientX, e.touches[0].clientY),
			{ passive: true },
		);
		el.addEventListener(
			'touchmove',
			(e) => {
				preventHorizontalBrowserNav(e, startX, startY);
				onMove(e.touches[0].clientX);
			},
			{ passive: false },
		);
		el.addEventListener('touchend', () => onEnd());

		el.addEventListener('mousedown', (e) => onStart((e as MouseEvent).clientX, (e as MouseEvent).clientY));
		el.addEventListener('mousemove', (e) => {
			if (dragging) onMove((e as MouseEvent).clientX);
		});
		el.addEventListener('mouseup', () => onEnd());
		el.addEventListener('mouseleave', () => {
			if (dragging) onEnd();
		});
	});
}

export function initNotificationSwipe(): void {
	document.querySelectorAll('[data-notification-item]').forEach((el) => {
		if ((el as HTMLElement).dataset.notifBound) return;
		(el as HTMLElement).dataset.notifBound = 'true';

		let startX = 0;
		let startY = 0;

		el.addEventListener(
			'touchstart',
			(e) => {
				startX = e.touches[0].clientX;
				startY = e.touches[0].clientY;
			},
			{ passive: true },
		);

		el.addEventListener(
			'touchmove',
			(e) => {
				preventHorizontalBrowserNav(e, startX, startY);
			},
			{ passive: false },
		);

		el.addEventListener(
			'touchend',
			(e) => {
				const dx = e.changedTouches[0].clientX - startX;
				const item = el as HTMLElement;
				const deleteUrl = item.dataset.deleteUrl;
				const notificationId = item.dataset.notificationId;
				const list = document.getElementById('notification-list');
				const errorMessage = list?.dataset.deleteError ?? 'Could not delete notification';

				if (dx <= -SWIPE_THRESHOLD && deleteUrl && notificationId) {
					deleteNotificationOptimistically(item, notificationId, deleteUrl, errorMessage);
				}
			},
			{ passive: true },
		);
	});
}

document.addEventListener('htmx:afterSwap', () => {
	initNotificationSwipe();
});
