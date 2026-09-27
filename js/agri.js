// =====================================================================
// VAJRON 30 L agricultural spraying drone: procedural model
// Six-rotor hexacopter on a foldable carbon frame: faceted blue canopy,
// integrated white 30 L tank with black filler cap and vented bay plate,
// 40 mm carbon arms with folding joints, large outrunner motors with
// 36-inch folding props, four dual-outlet Y nozzles (8 spray points),
// clear spray lines, fixed landing gear, GNSS puck, front radar block.
// Units: metres. Axes: +X forward, +Y up, +Z right.
// Wheelbase 2,028 mm (motor to opposite motor) and 36-inch props, as specified.
// =====================================================================

export const LAYOUT = {
  R: 1.014,                        // centre to motor axis
  armY: 0.0,
  angles: [30, 90, 150, -150, -90, -30],   // degrees from +X towards +Z
  nozzleArms: [30, 150, -150, -30],        // four dual-outlet nozzles
  propR: 0.457,                    // 36-inch props
  footY: -0.735,
};

export function buildAgri(THREE, opt = {}) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const root = new THREE.Group(); root.name = 'VAJRON-AGRI30';
  const M = makeMaterials(THREE);
  const parts = { rotors: [], outlets: [] };
  const mesh = (g, m, name) => { const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (name) o.name = name; return o; };
  const deg = (d) => d * Math.PI / 180;
  const dirOf = (a) => V(Math.cos(deg(a)), 0, Math.sin(deg(a)));

  // helper: cylinder between two points
  function rod(a, b, r, mat, seg = 18) {
    const len = a.distanceTo(b);
    const m = mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  }

  // ---------------------------------------------------------------
  // centre frame and faceted canopy
  // ---------------------------------------------------------------
  const frame = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), M.black, 'frame');
  frame.rotation.y = Math.PI / 8; frame.position.y = -0.005;
  root.add(frame);
  {
    const prof = [
      [0.218, 0.022], [0.217, 0.05], [0.205, 0.086], [0.18, 0.116], [0.14, 0.139], [0.09, 0.152], [0.04, 0.157], [0.0, 0.158],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(prof, 8, Math.PI / 8, Math.PI * 2);
    const canopy = mesh(g, M.canopy, 'canopy');
    canopy.scale.set(1.06, 1, 0.96);
    root.add(canopy);
    // ridge lines between facets read as the moulded shell in the photo
    // label plate on the front facet
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const c = cv.getContext('2d');
    c.fillStyle = '#0d0e10'; c.beginPath(); c.roundRect(4, 4, 504, 120, 14); c.fill();
    c.strokeStyle = '#3a3d44'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#9fb4dc'; c.font = '800 72px Manrope, "Helvetica Neue", Arial, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VAJRON', 256, 68);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const plate = mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1 }));
    // front facet sits at the lathe's segment centre (+X); tilt with the dome
    plate.position.set(0.2125 * 1.06 + 0.002, 0.058, 0);
    plate.rotation.set(0, Math.PI / 2, 0);
    plate.rotateX(-0.28);
    root.add(plate);
  }

  // front block below the canopy: radar / camera housing with two brass ports
  {
    const blk = mesh(new THREE.BoxGeometry(0.07, 0.05, 0.15), M.black, 'front-block');
    blk.position.set(0.215, -0.02, 0);
    root.add(blk);
    [-0.035, 0.035].forEach((z) => {
      const p = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 20), M.brass);
      p.rotation.z = Math.PI / 2; p.position.set(0.252, -0.012, z);
      root.add(p);
    });
    const lens = mesh(new THREE.CircleGeometry(0.008, 24), M.glass);
    lens.rotation.y = Math.PI / 2; lens.position.set(0.2505, -0.03, 0);
    root.add(lens);
    parts.frontRadar = V(0.255, -0.02, 0);          // schematic beam origin only
  }

  // ---------------------------------------------------------------
  // 30 L tank: faceted superelliptic body under the frame
  // ---------------------------------------------------------------
  {
    const NS = 14, NT = 12, n = 3.2, pos = [], idx = [];
    const y0 = -0.05, y1 = -0.37;
    const sec = (k) => {                 // k 0 top .. 1 bottom
      const b = Math.max(0, k - 0.6) / 0.4, round = 1 - Math.sqrt(Math.max(0, 1 - b * b));
      const w = 0.195 - 0.012 * k - 0.07 * round;
      const d = 0.17 - 0.012 * k - 0.065 * round;
      return [d, w];
    };
    for (let i = 0; i <= NS; i++) {
      const k = i / NS, y = y0 + (y1 - y0) * k, [dx, dz] = sec(k);
      for (let j = 0; j < NT; j++) {
        const t = j / NT * Math.PI * 2 + Math.PI / NT;
        const ct = Math.cos(t), st = Math.sin(t);
        pos.push(dx * Math.sign(ct) * Math.abs(ct) ** (2 / n), y, dz * Math.sign(st) * Math.abs(st) ** (2 / n));
      }
    }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) {
      const a = i * NT + j, b = i * NT + (j + 1) % NT, c = (i + 1) * NT + j, d = (i + 1) * NT + (j + 1) % NT;
      idx.push(a, c, b, b, c, d);
    }
    const bot = pos.length / 3; pos.push(0, y1 - 0.004, 0);
    for (let j = 0; j < NT; j++) idx.push(bot, NS * NT + (j + 1) % NT, NS * NT + j);
    const top = pos.length / 3; pos.push(0, y0, 0);
    for (let j = 0; j < NT; j++) idx.push(top, j, (j + 1) % NT);
    let g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g = g.toNonIndexed(); g.computeVertexNormals();          // flat facets like the moulded tank
    const tank = mesh(g, M.tank, 'tank');
    root.add(tank);
    // filler cap on the front face
    const cap = mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.03, 36), M.black, 'filler-cap');
    cap.rotation.z = Math.PI / 2; cap.position.set(0.172, -0.235, 0);
    const capTop = mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.012, 36), M.black);
    capTop.rotation.z = Math.PI / 2; capTop.position.set(0.19, -0.235, 0);
    const tab = mesh(new THREE.BoxGeometry(0.018, 0.03, 0.016), M.black);
    tab.position.set(0.195, -0.269, 0);
    root.add(cap, capTop, tab);
    // vented bay plate on the upper front of the tank
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#101113'; c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#6d7076';
    for (let i = 0; i < 7; i++) {
      c.save(); c.translate(150 + i * 14, 40 + i * 26); c.rotate(-0.5); c.fillRect(-40, -4, 80, 8); c.restore();
      c.save(); c.translate(362 - i * 14, 40 + i * 26); c.rotate(0.5); c.fillRect(-40, -4, 80, 8); c.restore();
    }
    [40, 80, 432, 472].forEach((x) => { c.fillRect(x - 4, 40, 8, 60); c.fillRect(x - 4, 150, 8, 60); });
    const vt = new THREE.CanvasTexture(cv); vt.colorSpace = THREE.SRGBColorSpace; vt.anisotropy = 8;
    const vp = mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshPhysicalMaterial({ map: vt, roughness: 0.45, clearcoat: 0.4 }));
    vp.position.set(0.178, -0.115, 0); vp.rotation.y = Math.PI / 2; vp.rotateX(-0.1);
    root.add(vp);
    // origin of the schematic terrain-radar beam (the radar's position on the
    // aircraft is not published, so no hardware is modelled for it)
    parts.terrainRadar = V(0.07, -0.37, 0);
  }

  // ---------------------------------------------------------------
  // landing gear: four legs to rubber feet
  // ---------------------------------------------------------------
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const a = V(sx * 0.11, -0.04, sz * 0.14), b = V(sx * 0.17, LAYOUT.footY + 0.035, sz * 0.25);
    root.add(rod(a, b, 0.016, M.black));
    const foot = mesh(new THREE.CapsuleGeometry(0.019, 0.05, 6, 16), M.rubber);
    foot.rotation.x = Math.PI / 2; foot.position.set(b.x, LAYOUT.footY + 0.019, b.z);
    root.add(foot);
  });

  // ---------------------------------------------------------------
  // arms, joints, motors, props, nozzles and spray lines
  // ---------------------------------------------------------------
  function naca(m, p, t, n = 14) {
    const xs = []; for (let i = 0; i <= n; i++) xs.push((1 - Math.cos(Math.PI * i / n)) / 2);
    const s = (x, up) => {
      const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
      let yc = 0, dy = 0;
      if (m > 0) { if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dy = 2 * m / (p * p) * (p - x); } else { yc = m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); dy = 2 * m / ((1 - p) ** 2) * (p - x); } }
      const th = Math.atan(dy);
      return up ? [x - yt * Math.sin(th), yc + yt * Math.cos(th)] : [x + yt * Math.sin(th), yc - yt * Math.cos(th)];
    };
    const pts = []; for (let i = n; i >= 0; i--) pts.push(s(xs[i], true)); for (let i = 1; i < n; i++) pts.push(s(xs[i], false));
    return pts;
  }
  function blade(radius, rootR, chord, twR, twT) {
    const prof = naca(0.04, 0.4, 0.07), N = 16, P = prof.length, pos = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N, r = rootR + (radius - rootR) * k;
      const ch = chord * (0.78 + 0.65 * k - 1.15 * k * k) + 0.008;
      const tw = deg(twR + (twT - twR) * k);
      const cd = V(0, -Math.sin(tw), Math.cos(tw)), td = V(0, Math.cos(tw), Math.sin(tw));
      const o = V(r, 0, -ch * 0.35 * Math.cos(tw));
      for (const [x, y] of prof) { const p = o.clone().addScaledVector(cd, x * ch).addScaledVector(td, y * ch); pos.push(p.x, p.y, p.z); }
    }
    for (let s = 0; s < N; s++) for (let i = 0; i < P; i++) {
      const a = s * P + i, b = s * P + (i + 1) % P, c = (s + 1) * P + i, d = (s + 1) * P + (i + 1) % P;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const bladeG = blade(LAYOUT.propR, 0.07, 0.078, 18, 7);
  const bladeGM = bladeG.clone(); bladeGM.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1));
  { const ix = bladeGM.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } bladeGM.computeVertexNormals(); }

  function blurDisc(r) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    const gr = c.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, 'rgba(110,114,120,0)'); gr.addColorStop(0.14, 'rgba(110,114,120,.32)');
    gr.addColorStop(0.55, 'rgba(140,144,150,.15)'); gr.addColorStop(0.92, 'rgba(170,174,180,.12)');
    gr.addColorStop(0.96, 'rgba(210,214,220,.28)'); gr.addColorStop(1, 'rgba(210,214,220,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9; i++) { c.strokeStyle = `rgba(230,232,236,${0.03 + (i % 3) * 0.02})`; c.lineWidth = 1.5; c.beginPath(); c.arc(128, 128, 30 + i * 11, 0, Math.PI * 2); c.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 72), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
    return m;
  }

  LAYOUT.angles.forEach((a, k) => {
    const d = dirOf(a), side = V(-d.z, 0, d.x);
    const P = (r, y = LAYOUT.armY) => d.clone().multiplyScalar(r).setY(y);
    // arm tube (40 mm) from the frame to the motor mount
    root.add(rod(P(0.2), P(LAYOUT.R - 0.02), 0.02, M.carbon));
    // folding joint sleeve and lever
    root.add(rod(P(0.305), P(0.395), 0.029, M.black, 24));
    const lever = mesh(new THREE.BoxGeometry(0.07, 0.016, 0.022), M.black);
    lever.position.copy(P(0.35, 0.03)); lever.lookAt(P(0.35, 0.03).add(d)); root.add(lever);
    // arm clip (the U-shaped cradle seen along the arms)
    const cp = P(0.44, 0.022);
    [-1, 1].forEach((s) => { root.add(rod(cp.clone().addScaledVector(side, s * 0.022), cp.clone().addScaledVector(side, s * 0.032).add(V(0, 0.05, 0)), 0.006, M.black, 10)); });
    root.add(rod(cp.clone().addScaledVector(side, -0.024), cp.clone().addScaledVector(side, 0.024), 0.008, M.black, 10));
    // motor mount block and motor
    const mp = P(LAYOUT.R);
    const mount = mesh(new THREE.BoxGeometry(0.1, 0.05, 0.075), M.black);
    mount.position.copy(mp).add(V(0, -0.005, 0)); mount.lookAt(mp.clone().add(d).add(V(0, -0.005, 0))); root.add(mount);
    const stator = mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.055, 40), M.motor);
    stator.position.copy(mp).add(V(0, 0.05, 0)); root.add(stator);
    const bell = mesh(new THREE.CylinderGeometry(0.056, 0.065, 0.016, 40), M.black);
    bell.position.copy(mp).add(V(0, 0.085, 0)); root.add(bell);
    const ring = mesh(new THREE.CylinderGeometry(0.0665, 0.0665, 0.006, 40), M.silver);
    ring.position.copy(mp).add(V(0, 0.026, 0)); root.add(ring);
    // folding prop: hub with two hinge blocks and two blades
    const prop = new THREE.Group(); prop.position.copy(mp).add(V(0, 0.103, 0));
    const hub = mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.022, 28), M.black); prop.add(hub);
    const cw = k % 2 === 0;
    [0, Math.PI].forEach((rot) => {
      const g = new THREE.Group(); g.rotation.y = rot;
      const hinge = mesh(new THREE.BoxGeometry(0.05, 0.02, 0.03), M.black); hinge.position.x = 0.045; g.add(hinge);
      const b = mesh(cw ? bladeGM : bladeG, M.blade); g.add(b);
      prop.add(g);
    });
    const blades = prop.children.slice(1).map((g) => g.children[1]);
    const disc = blurDisc(LAYOUT.propR * 1.01); disc.position.copy(prop.position);
    root.add(prop, disc);
    parts.rotors.push({ prop, disc, blades, dir: cw ? -1 : 1, angle: a * Math.PI / 180 + Math.PI / 2, speed: 0 });

    // nozzle: stem below the motor and a dual-outlet Y with green tips
    if (LAYOUT.nozzleArms.includes(a)) {
      const np = P(LAYOUT.R - 0.075, -0.02);
      const stemBottom = np.clone().add(V(0, -0.13, 0));
      root.add(rod(np, stemBottom, 0.008, M.black, 12));
      const body = mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.03, 16), M.nozzle);
      body.position.copy(stemBottom).add(V(0, -0.01, 0)); root.add(body);
      [-1, 1].forEach((s) => {
        const o0 = stemBottom.clone().add(V(0, -0.02, 0));
        const o1 = o0.clone().addScaledVector(side, s * 0.045).add(V(0, -0.035, 0));
        root.add(rod(o0, o1, 0.0065, M.nozzle, 10));
        const tip = mesh(new THREE.CylinderGeometry(0.011, 0.009, 0.02, 14), M.green);
        tip.position.copy(o1).add(V(0, -0.008, 0)); root.add(tip);
        parts.outlets.push({ pos: o1.clone().add(V(0, -0.02, 0)), dir: V(0, -1, 0).addScaledVector(side, s * 0.42).normalize() });
      });
      // clear spray line: tank shoulder -> under the arm -> nozzle stem
      const curve = new THREE.CatmullRomCurve3([
        V(0, -0.1, 0).addScaledVector(d, 0.14), V(0, -0.045, 0).addScaledVector(d, 0.24),
        P(0.45, -0.032), P(0.8, -0.032), P(LAYOUT.R - 0.09, -0.03), np.clone().add(V(0, -0.06, 0)).addScaledVector(side, 0.012),
      ]);
      root.add(mesh(new THREE.TubeGeometry(curve, 80, 0.0055, 10, false), M.hose));
    }
  });

  // GNSS puck on the front-left arm root
  {
    const d = dirOf(-62);
    const puck = mesh(new THREE.CylinderGeometry(0.04, 0.043, 0.02, 36), M.puck, 'gnss');
    puck.position.copy(d.clone().multiplyScalar(0.25)).setY(0.045);
    const mast = mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.03, 12), M.black);
    mast.position.copy(puck.position).add(V(0, -0.024, 0)); root.add(mast);
    const dome = mesh(new THREE.SphereGeometry(0.043, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.puck);
    dome.scale.y = 0.18; dome.position.copy(puck.position).add(V(0, 0.011, 0));
    root.add(puck, dome);
  }

  // ---------------------------------------------------------------
  // radar coverage visuals (schematic): terrain-following cone below,
  // forward obstacle fan ahead (±30° horizontal, ±10° vertical)
  // ---------------------------------------------------------------
  const radar = new THREE.Group(); radar.visible = false;
  {
    // unit-length beams, scaled per shot: cone.scale = distance to canopy, fan.scale = reach
    const g = new THREE.ConeGeometry(Math.tan(deg(14)), 1, 48, 1, true);
    g.translate(0, -0.5, 0);
    const cone = new THREE.Mesh(g, gradMat(THREE, 0x6f9be0, 0.34, 'y', -1, 0));
    cone.position.copy(parts.terrainRadar); cone.renderOrder = 3;
    radar.add(cone);
    const hz = Math.tan(deg(30)), vt = Math.tan(deg(10));
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, vt, -hz, 1, vt, hz, 1, -vt, hz, 1, -vt, -hz], 3));
    fg.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    fg.computeVertexNormals();
    const fan = new THREE.Mesh(fg, gradMat(THREE, 0x6f9be0, 0.3, 'x', 0, 1));
    fan.position.copy(parts.frontRadar); fan.renderOrder = 3;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(fg), new THREE.LineBasicMaterial({ color: 0x9dbbeb, transparent: true, opacity: 0.35, depthWrite: false }));
    fan.add(edges);
    radar.add(fan);
    parts.cone = cone; parts.fan = fan;
    cone.scale.setScalar(1.35); fan.scale.setScalar(3.2);
  }
  root.add(radar);
  parts.radar = radar;

  // ---------------------------------------------------------------
  // modes: parked (props folded fore-aft), spray/hover (rotors spinning)
  // ---------------------------------------------------------------
  let mode = 'parked';
  const SPIN = 34;
  function setMode(m) { mode = m; }
  function update(dt) {
    const target = mode === 'parked' ? 0 : 1;
    parts.rotors.forEach((r) => {
      r.speed += (target - r.speed) * Math.min(1, dt * 2.2);
      if (r.speed > 0.02) r.angle += r.dir * SPIN * r.speed * dt;
      r.prop.rotation.y = r.angle;
      r.disc.material.opacity = Math.min(1, Math.max(0, (r.speed - 0.25) / 0.5)) * 0.6;
      r.blades.forEach((b) => { b.material = r.speed > 0.6 ? M.bladeFade : M.blade; });
    });
  }
  function snap(m) { mode = m; parts.rotors.forEach((r) => { r.speed = m === 'parked' ? 0 : 1; }); update(0); }
  function showRadar(on, coneLen, fanLen) { radar.visible = !!on; if (coneLen) parts.cone.scale.setScalar(coneLen); if (fanLen) parts.fan.scale.setScalar(fanLen); }
  return { group: root, parts, materials: M, setMode, snap, update, showRadar, get mode() { return mode; } };
}

// transparent material whose opacity fades along one axis (for radar beams)
function gradMat(THREE, color, alpha, axis, a0, a1) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { c: { value: new THREE.Color(color) }, a: { value: alpha }, a0: { value: a0 }, a1: { value: a1 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 c; uniform float a, a0, a1; varying vec3 vP;
      void main(){ float t = clamp((vP.${axis} - a0) / (a1 - a0), 0.0, 1.0); float k = ${axis === 'y' ? 't' : '1.0 - t'};
        gl_FragColor = vec4(c, a * k * k); }`,
  });
}

function makeMaterials(THREE) {
  const carbonTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.fillStyle = '#1b1c1f'; c.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
      c.fillStyle = ((x + y) / 8) % 2 ? '#232428' : '#17181a'; c.fillRect(x, y, 8, 8);
    }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 30); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const canopy = new THREE.MeshPhysicalMaterial({ color: 0x1f3fb0, roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.07, flatShading: true });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x131416, roughness: 0.38, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const carbon = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbonTex, roughness: 0.38, metalness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const motor = new THREE.MeshPhysicalMaterial({ color: 0x1a1b1e, roughness: 0.45, metalness: 0.5, clearcoat: 0.3 });
  const tank = new THREE.MeshPhysicalMaterial({ color: 0xedefee, roughness: 0.36, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.2, flatShading: true });
  const blade = new THREE.MeshPhysicalMaterial({ color: 0x151618, roughness: 0.42, metalness: 0.15, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  const bladeFade = blade.clone(); bladeFade.transparent = true; bladeFade.opacity = 0.16; bladeFade.depthWrite = false;
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.9 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xc3c8cf, roughness: 0.25, metalness: 1 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb58f45, roughness: 0.3, metalness: 1 });
  const green = new THREE.MeshPhysicalMaterial({ color: 0x2f9d52, roughness: 0.35, clearcoat: 0.6 });
  const nozzle = new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.4, clearcoat: 0.5 });
  const hose = new THREE.MeshPhysicalMaterial({ color: 0xe6eef2, roughness: 0.12, transparent: true, opacity: 0.5, clearcoat: 1, depthWrite: false });
  const puck = new THREE.MeshPhysicalMaterial({ color: 0xf2f3f4, roughness: 0.3, clearcoat: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x07080a, roughness: 0.05, metalness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.7 });
  return { canopy, black, carbon, motor, tank, blade, bladeFade, rubber, silver, brass, green, nozzle, hose, puck, glass };
}

// ---------------------------------------------------------------------
// spray mist: particles from the eight outlets (world space)
// ---------------------------------------------------------------------
export function createSpray(THREE, count = 1400) {
  const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), life = new Float32Array(count), seedLife = new Float32Array(count);
  for (let i = 0; i < count; i++) life[i] = -1;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'); const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const m = new THREE.PointsMaterial({ size: 0.035, map: tex, transparent: true, opacity: 0.55, depthWrite: false, color: 0xdfe8f2, sizeAttenuation: true });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false;
  let cursor = 0, seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3();
  function update(dt, obj, outlets, on, forward = 0, rate = 900, o = {}) {
    const drag = o.drag ?? 1.6, sp0 = o.speed ?? 2.4, lat = o.lateral ?? 0.9, lifeMin = o.life ?? 0.9;
    obj.updateMatrixWorld();
    const q = new THREE.Quaternion(); obj.getWorldQuaternion(q);
    if (on) {
      const n = Math.floor(rate * dt + rnd());
      for (let k = 0; k < n; k++) {
        const o = outlets[Math.floor(rnd() * outlets.length)];
        tmp.copy(o.pos).applyMatrix4(obj.matrixWorld);
        dir.copy(o.dir).applyQuaternion(q);
        const i = cursor; cursor = (cursor + 1) % count;
        pos[i * 3] = tmp.x; pos[i * 3 + 1] = tmp.y; pos[i * 3 + 2] = tmp.z;
        const sp = sp0 * (0.6 + rnd() * 0.8), spread = lat;
        vel[i * 3] = dir.x * sp + (rnd() - 0.5) * spread;
        vel[i * 3 + 1] = dir.y * sp + (rnd() - 0.5) * spread * 0.4;
        vel[i * 3 + 2] = dir.z * sp + (rnd() - 0.5) * spread;
        seedLife[i] = life[i];
        const j = rnd() * dt;                       // spread births across the step (no banding)
        pos[i * 3] += vel[i * 3] * j; pos[i * 3 + 1] += vel[i * 3 + 1] * j; pos[i * 3 + 2] += vel[i * 3 + 2] * j;
        life[i] = lifeMin * (0.75 + rnd() * 0.5);
      }
    }
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) { pos[i * 3 + 1] = -99; continue; }
      life[i] -= dt;
      const k = 1 - Math.exp(-drag * dt);
      vel[i * 3] += (-forward - vel[i * 3]) * k; vel[i * 3 + 2] *= 1 - k * 0.5; vel[i * 3 + 1] -= 1.6 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    g.attributes.position.needsUpdate = true;
  }
  function reset() { for (let i = 0; i < count; i++) { life[i] = -1; pos[i * 3 + 1] = -99; } seed = 1; g.attributes.position.needsUpdate = true; }
  return { points: pts, update, reset, material: m };
}
