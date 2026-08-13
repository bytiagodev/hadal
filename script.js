const DEPTH_MAX = 10935;
const PX_PER_METRE = 5;

function depthToY(depth) {
  return depth * PX_PER_METRE;
}

function renderCreatures() {
  const ocean = document.querySelector('.ocean');
  CREATURES.forEach(creature => {
    const el = document.createElement('div');
    el.className = 'creature';
    el.dataset.id = creature.id;
    el.dataset.zone = creature.zone;
    el.style.top = depthToY(creature.depth) + 'px';
    el.style.left = (15 + Math.random() * 70) + '%';
    el.textContent = creature.name;
    ocean.appendChild(el);
  });
}

function renderZones() {
  const ocean = document.querySelector('.ocean');
  ZONES.forEach(zone => {
    const el = document.createElement('div');
    el.className = 'zone-boundary';
    el.dataset.zone = zone.name.toLowerCase();
    el.style.top = depthToY(zone.depth) + 'px';
    el.innerHTML = `<span class="zone-name">${zone.name}</span><span class="zone-copy">${zone.copy}</span>`;
    ocean.appendChild(el);
  });
}

function renderLandmarks() {
  const ocean = document.querySelector('.ocean');
  LANDMARKS.forEach(landmark => {
    const el = document.createElement('div');
    el.className = 'landmark';
    el.style.top = depthToY(landmark.depth) + 'px';
    el.innerHTML = landmark.copy.split('\n\n').map(p => `<p>${p}</p>`).join('');
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

renderCreatures();
renderZones();
renderLandmarks();
tick();
