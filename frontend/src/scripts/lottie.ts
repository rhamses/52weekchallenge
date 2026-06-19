import { DotLottie } from '@lottiefiles/dotlottie-web';

const CONFETTI_SRC = '/assets/confetti.lottie';
const CONFETTI_FALLBACK_MS = 2800;

const players = new WeakMap<HTMLCanvasElement, DotLottie>();

let confettiOverlay: HTMLElement | null = null;
let confettiCanvas: HTMLCanvasElement | null = null;
let confettiPlayer: DotLottie | null = null;

export function initLottiePlayers(root: ParentNode = document): void {
	root.querySelectorAll<HTMLCanvasElement>('[data-lottie-src]').forEach((canvas) => {
		const src = canvas.dataset.lottieSrc;
		if (!src || players.has(canvas)) return;

		const player = new DotLottie({
			canvas,
			src,
			loop: canvas.dataset.lottieLoop !== 'false',
			autoplay: canvas.dataset.lottieAutoplay !== 'false',
		});

		players.set(canvas, player);
	});
}

export function destroyLottiePlayers(root: ParentNode = document): void {
	root.querySelectorAll<HTMLCanvasElement>('[data-lottie-src]').forEach((canvas) => {
		const player = players.get(canvas);
		if (!player) return;
		player.destroy();
		players.delete(canvas);
	});
}

function ensureConfettiOverlay(): HTMLCanvasElement {
	if (!confettiOverlay) {
		confettiOverlay = document.createElement('div');
		confettiOverlay.id = 'f2w-confetti-overlay';
		confettiOverlay.className = 'f2w-confetti-overlay';
		confettiOverlay.setAttribute('aria-hidden', 'true');

		const wrap = document.createElement('div');
		wrap.className = 'f2w-confetti-wrap';

		confettiCanvas = document.createElement('canvas');
		confettiCanvas.className = 'f2w-confetti-canvas';
		confettiCanvas.width = 430;
		confettiCanvas.height = 430;

		wrap.appendChild(confettiCanvas);
		confettiOverlay.appendChild(wrap);
		document.body.appendChild(confettiOverlay);
	}

	return confettiCanvas!;
}

export function playConfettiCelebration(onComplete?: () => void): void {
	const canvas = ensureConfettiOverlay();
	if (!confettiOverlay) return;

	confettiOverlay.classList.add('is-visible');

	if (confettiPlayer) {
		confettiPlayer.destroy();
		confettiPlayer = null;
	}

	let finished = false;
	const finish = () => {
		if (finished) return;
		finished = true;
		confettiOverlay?.classList.remove('is-visible');
		onComplete?.();
	};

	confettiPlayer = new DotLottie({
		canvas,
		src: CONFETTI_SRC,
		loop: false,
		autoplay: true,
	});

	confettiPlayer.addEventListener('complete', finish);
	window.setTimeout(finish, CONFETTI_FALLBACK_MS);
}
