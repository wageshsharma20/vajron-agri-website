// =====================================================================
// Live 3D viewer for the page (flight-mode module).
// Horizontal drag turns the drone; vertical swipes still scroll the page
// (touch-action: pan-y), so it behaves on iPad. Renders only while on
// screen and the page is visible; the static render stays if WebGL is
// unavailable.
// Modes: parked (on the ground, props still), flight (lifts off, rotors
// spinning), radar (in flight, radar coverage shown schematically).
// =====================================================================
import * as THREE from 'three';
import { createStage } from './stage.js';
import { buildAgri, LAYOUT } from './agri.js';

export function mountViewer(canvas, opt = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let S;
  try {
    S = createStage(canvas, { alpha: true, shadows: false, envIntensity: opt.env ?? 0.66, pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      groundY: LAYOUT.footY, contactW: 2.6, contactD: 2.6 });
  } catch (e) { return null; }
  if (!S.renderer.getContext()) return null;
  S.contact.material.opacity = opt.contact ?? 0.55;

  const D = buildAgri(THREE);
  const pivot = new THREE.Group();
  pivot.add(D.group);
  S.scene.add(pivot);
  let mode = opt.mode || 'parked';
  D.snap(mode === 'parked' ? 'parked' : 'flight');
  D.showRadar(mode === 'radar', 0.36, 1.9);

  let yaw = opt.yaw ?? -0.55, vel = 0, dragging = false, lastX = 0, lastT = 0, idle = 0, moved = false;
  const elev = opt.elev ?? 0.34, fov = opt.fov ?? 26, fit = opt.fit ?? 0.9;
  let visible = false, raf = 0, clock = performance.now(), bob = 0, lift = mode === 'parked' ? 0 : 1, radarK = mode === 'radar' ? 1 : 0;

  function frameCamera() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    S.resize(w, h);
    S.camera.fov = fov;
    const vf = fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (w / h));
    // round subject: fit the prop circle horizontally and the height vertically
    const d = Math.max(1.5 / Math.tan(hf / 2), 0.78 / Math.tan(vf / 2)) * fit;
    S.camera.position.set(0, d * Math.sin(elev) + (opt.lookY ?? -0.28), d * Math.cos(elev));
    S.camera.lookAt(0, opt.lookY ?? -0.28, 0);
    S.camera.updateProjectionMatrix();
  }

  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - clock) / 1000); clock = now;
    if (!dragging) {
      if (Math.abs(vel) > 0.0005) { yaw += vel * dt; vel *= Math.pow(0.04, dt); }
      else if (!reduce && opt.autoRotate !== false) { idle += dt; if (idle > 2.2) yaw += 0.14 * dt; }
    }
    pivot.rotation.y = yaw;
    // lift off in flight modes, settle on the ground when parked
    const tl = mode === 'parked' ? 0 : 1;
    lift += (tl - lift) * Math.min(1, dt * (reduce ? 20 : 1.8));
    const tr = mode === 'radar' ? 1 : 0;
    radarK += (tr - radarK) * Math.min(1, dt * (reduce ? 20 : 2.5));
    if (!reduce) bob += dt;
    pivot.position.y = lift * (0.24 + Math.sin(bob * 1.2) * 0.012);
    S.contact.material.opacity = (opt.contact ?? 0.55) * (1 - lift * 0.55);
    S.contact.scale.setScalar(1 + lift * 0.25);
    D.showRadar(radarK > 0.02, 0.36 + lift * 0.24, 1.9);
    D.parts.cone.material.uniforms.a.value = 0.34 * radarK;
    D.parts.fan.material.uniforms.a.value = 0.3 * radarK;
    D.parts.fan.children[0].material.opacity = 0.35 * radarK;
    D.update(dt);
    S.render();
    if (!canvas.classList.contains('is-ready')) { canvas.classList.add('is-ready'); opt.onReady && opt.onReady(); }
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!raf && visible && !document.hidden) { clock = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  // interaction: horizontal drag rotates, vertical movement is left to the page
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false; lastX = e.clientX; lastT = performance.now(); vel = 0; idle = 0;
    canvas.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX, dts = Math.max(0.008, (now - lastT) / 1000);
    if (Math.abs(dx) > 2) moved = true;
    const d = dx * 0.0085;
    yaw += d; vel = d / dts; lastX = e.clientX; lastT = now;
    if (moved && opt.onInteract) opt.onInteract();
  }, { passive: true });
  const end = () => { if (!dragging) return; dragging = false; idle = 0; canvas.classList.remove('is-dragging'); };
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', end, { passive: true });

  const ro = new ResizeObserver(() => { frameCamera(); if (!raf) S.render(); });
  ro.observe(canvas);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.02 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
  frameCamera();

  return {
    setMode(m) { mode = m; D.setMode(m === 'parked' ? 'parked' : 'flight'); idle = 0; start(); },
    get mode() { return mode; },
  };
}
