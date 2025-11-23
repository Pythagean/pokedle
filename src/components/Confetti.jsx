import { useEffect, useRef } from 'react';

// Confetti with two phases: initial outward explosion, then a downward drop.
// Props:
// - active: boolean to trigger the animation
// - duration: total milliseconds to keep the canvas (default 3000)
// - explosionDuration: milliseconds of the initial outward burst (default 800)
export default function Confetti({ active, duration = 3000, explosionDuration = 50, centerRef = null }) {
  const startRef = useRef(null);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const colors = ['#FFC700', '#FF0000', '#2E3192', '#41BBC7', '#7ED321', '#FF66A3'];

    function random(min, max) {
      return Math.random() * (max - min) + min;
    }

    const particles = [];
    function getCenter() {
      if (centerRef && centerRef.current) {
        try {
          const r = centerRef.current.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        } catch (e) {
          // ignore and fallback to default
        }
      }
      return { x: canvas.width / 2, y: Math.max(canvas.height * 0.25, canvas.height / 2 - 60) };
    }
    const { x: centerX, y: centerY } = getCenter();
    // Reduce particle count so the explosion is smaller on most viewports
    const count = Math.min(250, Math.floor((canvas.width * canvas.height) / 3000));
    for (let i = 0; i < count; i++) {
      const angle = random(0, Math.PI * 2);
      // Increased initial speeds for a snappier, faster explosion
      const yspeed = random(2, 12);
      const xspeed = random(10, 30);
      particles.push({
        x: centerX + random(-30, 30),
        y: centerY + random(-8, 8),
        vx: Math.cos(angle) * xspeed,
        // give a stronger upward component so pieces shoot out quicker
        vy: Math.sin(angle) * yspeed * 0.9 - random(0, 0.2),
        size: Math.floor(random(6, 12)),
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-0.2, 0.2),
        gravity: random(0.15, 0.35),
        drag: random(0.90, 0.95),
      });
    }

    let stopped = false;
    let lastTime = performance.now();
    startRef.current = lastTime;

    function draw(now) {
      const elapsed = now - startRef.current;
      const dt = Math.min(50, now - lastTime) / 16.6667; // approx frames multiplier
      lastTime = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let p of particles) {
        if (elapsed < explosionDuration) {
          // Explosion phase: particles move fast outward with gentle gravity
          p.x += p.vx * dt;
          p.y += p.vy * dt + p.gravity * 0.2 * dt;
          p.vx *= p.drag;
          p.vy = p.vy + 0.02 * dt; // slight downward acceleration
        } else {
          // Drop phase: reduce horizontal velocity and let gravity pull down
          p.vx *= 0.96;
          p.vy += p.gravity * 1.4 * dt; // stronger gravity during drop
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rotation += p.rotationSpeed * dt;
        }

        // draw as rotated rectangle
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }

      if (!stopped) requestAnimationFrame(draw);
    }

    const raf = requestAnimationFrame(draw);

    const cleanupTimeout = setTimeout(() => {
      stopped = true;
      try { cancelAnimationFrame(raf); } catch (e) {}
      try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
    }, duration);

    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);

    return () => {
      stopped = true;
      clearTimeout(cleanupTimeout);
      window.removeEventListener('resize', onResize);
      try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
    };
  }, [active, duration, explosionDuration]);

  return null;
}
