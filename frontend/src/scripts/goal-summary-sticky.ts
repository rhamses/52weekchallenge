export function initGoalSummarySticky(): void {
	const summary = document.getElementById('goal-summary');
	const placeholder = document.getElementById('goal-summary-placeholder');
	const mount = document.getElementById('goal-summary-mount');
	const trigger = document.querySelector<HTMLElement>('#goal-timeline [data-swipe-item]');

	if (!summary || !placeholder || !mount || !trigger) return;

	let isCompact = false;
	let rafId = 0;

	const syncFixedBounds = () => {
		if (!isCompact) return;
		const rect = mount.getBoundingClientRect();
		summary.style.left = `${rect.left}px`;
		summary.style.width = `${rect.width}px`;
	};

	const setCompact = (compact: boolean) => {
		if (compact === isCompact) return;
		isCompact = compact;

		if (compact) {
			placeholder.style.height = `${summary.offsetHeight}px`;
			summary.classList.add('is-compact');
			syncFixedBounds();
		} else {
			summary.classList.remove('is-compact');
			summary.style.left = '';
			summary.style.width = '';
			placeholder.style.height = '0';
		}
	};

	const check = () => {
		rafId = 0;
		const triggerTop = trigger.getBoundingClientRect().top;
		setCompact(triggerTop <= 0);
	};

	const onScroll = () => {
		if (rafId) return;
		rafId = requestAnimationFrame(check);
	};

	window.addEventListener('scroll', onScroll, { passive: true });
	window.addEventListener('resize', syncFixedBounds, { passive: true });
	check();
}
