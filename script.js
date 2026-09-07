const DEPTH_MAX = 10935;
const PX_PER_METRE = 5;

function depthToY(depth) {
  return depth * PX_PER_METRE;
}

const SCALE_EXP = 0.45;
let SCALE_LO = 0;
let SCALE_HI = 1;

function initScale() {
  const spread = CREATURES.map((c) => Math.pow(c.lengthM, SCALE_EXP));
  SCALE_LO = Math.min.apply(null, spread);
  SCALE_HI = Math.max.apply(null, spread);
}

function creatureBox(creature, vw) {
  const gmax = Math.min(291, vw * 0.388);
  const gmin = Math.max(58, gmax * 0.27);
  const t = (Math.pow(creature.lengthM, SCALE_EXP) - SCALE_LO) / (SCALE_HI - SCALE_LO);
  const g = gmin + t * (gmax - gmin);
  const ar = Math.sqrt(creature.iw / creature.ih);
  let w = g * ar;
  let h = g / ar;
  const clamp = Math.min(1, creature.iw / w, creature.ih / h);
  return { w: Math.round(w * clamp), h: Math.round(h * clamp) };
}

const LAYOUT_SEED = 20260813;
const LAYOUT_GAP = 18;

function seeded(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function layoutCreatures() {
  const vw = document.documentElement.clientWidth;
  const rand = seeded(LAYOUT_SEED);
  const placed = [];
  const ordered = CREATURES.slice().sort((a, b) => a.depth - b.depth);

  ordered.forEach((creature) => {
    const box = creatureBox(creature, vw);
    const y = depthToY(creature.depth);
    const near = placed.filter(
      (p) => !(p.y + p.h + LAYOUT_GAP < y - LAYOUT_GAP || p.y - LAYOUT_GAP > y + box.h + LAYOUT_GAP)
    );

    const limit = Math.max(1, vw - box.w);
    const step = Math.max(8, limit / 40);
    const prefer = rand() * limit;
    const offset = rand() * step;
    const candidates = [];
    for (let x = offset; x <= limit; x += step) candidates.push(x);
    candidates.push(0, limit);
    candidates.sort((a, b) => Math.abs(a - prefer) - Math.abs(b - prefer));

    let chosen = candidates[0];
    let least = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const x = candidates[i];
      let worst = 0;
      for (let j = 0; j < near.length; j++) {
        const p = near[j];
        const overlap = Math.min(x + box.w, p.x + p.w) - Math.max(x, p.x);
        if (overlap > 0) worst = Math.max(worst, overlap / Math.min(box.w, p.w));
      }
      if (worst === 0) { chosen = x; least = 0; break; }
      if (worst < least) { chosen = x; least = worst; }
    }

    placed.push({ x: chosen, y: y, w: box.w, h: box.h });

    const el = document.querySelector('.creature[data-id="' + creature.id + '"]');
    if (!el) return;
    el.style.left = Math.round(chosen) + "px";
    el.style.width = box.w + "px";
    const img = el.querySelector("img");
    img.style.width = box.w + "px";
    img.style.height = box.h + "px";
  });
}

const DRIFT_SEED = 71204221;
const DRIFT_MIN_DURATION = 8;
const DRIFT_MAX_DURATION = 20;

function assignDriftTiming() {
  const rand = seeded(DRIFT_SEED);

  CREATURES.forEach((creature) => {
    const el = document.querySelector('.creature[data-id="' + creature.id + '"]');
    if (!el) return;

    const duration = DRIFT_MIN_DURATION + rand() * (DRIFT_MAX_DURATION - DRIFT_MIN_DURATION);
    const delay = -rand() * duration;

    el.style.setProperty("--drift-duration", duration.toFixed(2) + "s");
    el.style.setProperty("--drift-delay", delay.toFixed(2) + "s");
  });
}

function renderCreatures() {
  const ocean = document.querySelector(".ocean");
  CREATURES.forEach((creature) => {
    const el = document.createElement("div");
    el.className = "creature";
    if (creature.bio) {
      el.classList.add("is-bio");
    }
    el.dataset.id = creature.id;
    el.dataset.zone = creature.zone;
    el.style.top = depthToY(creature.depth) + "px";
    const img = document.createElement("img");
    img.src = `creatures/${creature.zone}-${creature.id}.webp`;
    img.alt = creature.name;
    img.loading = "lazy";
    el.appendChild(img);
    ocean.appendChild(el);
  });
}

function renderZones() {
  const ocean = document.querySelector(".ocean");
  ZONES.forEach((zone) => {
    const el = document.createElement("div");
    el.className = "zone-boundary";
    el.dataset.zone = zone.name.toLowerCase();
    el.style.top = depthToY(zone.depth) + "px";
    el.innerHTML = `<span class="zone-name">${zone.name}</span><span class="zone-copy">${zone.copy}</span>`;
    ocean.appendChild(el);
  });
}

function renderLandmarks() {
  const ocean = document.querySelector(".ocean");
  LANDMARKS.forEach((landmark) => {
    const el = document.createElement("div");
    el.className = "landmark";
    el.style.top = depthToY(landmark.depth) + "px";
    el.innerHTML = landmark.copy
      .split("\n\n")
      .map((p) => `<p>${p}</p>`)
      .join("");
    ocean.appendChild(el);
  });
}

const state = {
  depth: 0,
};

const COLOUR_STOPS = [
  { depth: 0, r: 142, g: 207, b: 223 },
  { depth: 200, r: 46, g: 125, b: 158 },
  { depth: 1000, r: 18, g: 43, b: 69 },
  { depth: 4000, r: 7, g: 15, b: 30 },
  { depth: 6000, r: 3, g: 6, b: 14 },
  { depth: 10935, r: 1, g: 2, b: 4 },
];

function getColour(depth) {
  for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
    const a = COLOUR_STOPS[i];
    const b = COLOUR_STOPS[i + 1];
    if (depth >= a.depth && depth <= b.depth) {
      const t = (depth - a.depth) / (b.depth - a.depth);
      return {
        r: Math.round(a.r + t * (b.r - a.r)),
        g: Math.round(a.g + t * (b.g - a.g)),
        b: Math.round(a.b + t * (b.b - a.b)),
      };
    }
  }
  return COLOUR_STOPS[COLOUR_STOPS.length - 1];
}

function getPressure(depth) {
  return 1 + depth / 10;
}

function getTemperature(depth) {
  if (depth <= 200) {
    return 20 - (depth / 200) * 16;
  } else if (depth <= 1000) {
    return 4 - ((depth - 200) / 800) * 1;
  } else {
    return 3 - ((depth - 1000) / 9935) * 1.5;
  }
}

function getLight(depth) {
  if (depth >= 1000) return 0;
  return Math.round(100 * Math.exp(-depth / 150));
}

function getDepth() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const raw = (window.scrollY / scrollable) * DEPTH_MAX;
  return Math.min(raw, DEPTH_MAX);
}

function tick() {
  requestAnimationFrame(tick);
  state.depth = getDepth();
  const col = getColour(state.depth);
  document.body.style.background = `rgb(${col.r}, ${col.g}, ${col.b})`;
  document.getElementById("hud-depth").textContent =
    Math.round(state.depth) + "\u2009m";
  document.getElementById("hud-pressure").textContent =
    getPressure(state.depth).toFixed(1) + "\u2009atm";
  document.getElementById("hud-temp").textContent =
    getTemperature(state.depth).toFixed(1) + "\u2009°C";
  document.getElementById("hud-light").textContent =
    getLight(state.depth) + "\u2009%";
}

initScale();
renderCreatures();
layoutCreatures();
assignDriftTiming();
window.addEventListener("resize", layoutCreatures);
renderZones();
renderLandmarks();
tick();