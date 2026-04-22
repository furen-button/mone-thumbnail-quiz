/**
 * 依存ゼロの軽量紙吹雪。正解モーダル表示時に使う。
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
}

const COLORS = ['#ff6b9d', '#ffd166', '#06d6a0', '#4cc9f0', '#b5179e', '#f9c74f'];

/**
 * 画面全体に紙吹雪を降らせる (約 1.8 秒)。
 */
export function burstConfetti(durationMs = 1800, count = 140): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const particles: Particle[] = Array.from({ length: count }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 80,
    y: canvas.height / 2 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 12 - 4,
    size: Math.random() * 8 + 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    life: 1,
  }));

  const start = performance.now();
  let rafId = 0;

  function step(now: number) {
    const elapsed = now - start;
    const progress = elapsed / durationMs;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      p.life = Math.max(0, 1 - progress);

      ctx!.save();
      ctx!.globalAlpha = p.life;
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }

    if (elapsed < durationMs) {
      rafId = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(rafId);
      canvas.remove();
    }
  }

  rafId = requestAnimationFrame(step);
}
