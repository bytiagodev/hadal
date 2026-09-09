const DEPTH_MAX = 10935;
const OCEAN_HEIGHT = 54675; // 10935m at 5px per metre

// Derived from the fixed ocean height, not scrollHeight, so absolutely
// positioned children can never feed back into the mapping.
function scrollSpan() {
  return Math.max(1, OCEAN_HEIGHT - window.innerHeight);
}

// The half-viewport offset is what makes the mapping honest: content at
// depth D sits mid-screen at the moment the HUD reads D.
function depthToY(depth) {
  return (depth / DEPTH_MAX) * scrollSpan() + window.innerHeight / 2;
}

function getDepth() {
  return Math.min((window.scrollY / scrollSpan()) * DEPTH_MAX, DEPTH_MAX);
}

function formatDepth(depth) {
  return Math.round(depth).toLocaleString("en-GB");
}

function seeded(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SCALE_EXP = 0.45;
let SCALE_LO = 0;
let SCALE_HI = 1;

function initScale() {
  const spread = CREATURES.map((c) => Math.pow(c.lengthM, SCALE_EXP));
  SCALE_LO = Math.min.apply(null, spread);
  SCALE_HI = Math.max.apply(null, spread);
}

// Geometric mean of width and height, so every creature with the same g
// covers the same area whatever its shape. The eye compares area, not length.
function creatureBox(creature, vw) {
  const gmax = Math.min(291, vw * 0.388);
  const gmin = Math.max(58, gmax * 0.27);
  const t =
    (Math.pow(creature.lengthM, SCALE_EXP) - SCALE_LO) / (SCALE_HI - SCALE_LO);
  const g = gmin + t * (gmax - gmin);
  const ar = Math.sqrt(creature.iw / creature.ih);
  let w = g * ar;
  let h = g / ar;
  const clamp = Math.min(1, creature.iw / w, creature.ih / h);
  return { w: Math.round(w * clamp), h: Math.round(h * clamp) };
}

const els = new Map();

const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
      imageObserver.unobserve(img);
    });
  },
  { rootMargin: "900px 0px" }
);

// Forty-three simultaneously animated layers is the difference between
// smooth and not on a mid-range phone.
const driftObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-onscreen", entry.isIntersecting);
    });
  },
  { rootMargin: "200px 0px" }
);

function renderCreatures() {
  const ocean = document.querySelector(".ocean");
  const frag = document.createDocumentFragment();

  CREATURES.forEach((creature) => {
    const el = document.createElement("figure");
    el.className = "creature";
    el.dataset.id = creature.id;
    el.dataset.zone = creature.zone;
    el.dataset.side = "left";
    el.tabIndex = 0;

    const img = document.createElement("img");
    const src = "creatures/" + creature.zone + "-" + creature.id + ".webp";
    img.alt = creature.alt;

    // drop-shadow follows the sprite's alpha, but only once there are pixels
    // to read. Applied before decode, the browser takes the shadow from the
    // layout box and caches that rectangle, so the glow waits for decode.
    img.decoding = "async";

    if (creature.bio) {
      img.addEventListener("load", () => {
        const glow = () => el.classList.add("is-bio");
        if (img.decode) img.decode().then(glow, glow);
        else glow();
      });
    }

    if (creature.depth === 0) {
      img.src = src;
      img.fetchPriority = "high";
    } else {
      img.dataset.src = src;
      img.loading = "lazy";
      imageObserver.observe(img);
    }

    const card = document.createElement("figcaption");
    card.className = "creature-card";
    card.innerHTML =
      '<span class="creature-name"></span>' +
      '<span class="creature-fact"></span>' +
      '<span class="creature-depth"></span>';
    card.querySelector(".creature-name").textContent = creature.name;
    card.querySelector(".creature-fact").textContent = creature.fact;
    card.querySelector(".creature-depth").textContent =
      formatDepth(creature.depth) + "\u2009m";

    el.appendChild(img);
    el.appendChild(card);
    frag.appendChild(el);
    els.set(creature.id, el);
    driftObserver.observe(el);
  });

  ocean.appendChild(frag);
}

const LAYOUT_SEED = 20260813;
const LAYOUT_GAP = 18;

function layoutCreatures() {
  const vw = document.documentElement.clientWidth;
  const rand = seeded(LAYOUT_SEED);
  const placed = markerRects.slice();
  const ordered = CREATURES.slice().sort((a, b) => a.depth - b.depth);

  ordered.forEach((creature) => {
    const box = creatureBox(creature, vw);
    const y = depthToY(creature.depth) - box.h / 2;
    const near = placed.filter(
      (p) =>
        !(
          p.y + p.h + LAYOUT_GAP < y - LAYOUT_GAP ||
          p.y - LAYOUT_GAP > y + box.h + LAYOUT_GAP
        )
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
        const overlap =
          Math.min(x + box.w, p.x + p.w) - Math.max(x, p.x);
        if (overlap > 0) worst = Math.max(worst, overlap / Math.min(box.w, p.w));
      }
      if (worst === 0) {
        chosen = x;
        least = 0;
        break;
      }
      if (worst < least) {
        chosen = x;
        least = worst;
      }
    }

    placed.push({ x: chosen, y: y, w: box.w, h: box.h });

    const el = els.get(creature.id);
    if (!el) return;
    el.style.left = Math.round(chosen) + "px";
    el.style.top = Math.round(y) + "px";
    el.style.width = box.w + "px";
    el.dataset.side = chosen + box.w / 2 > vw / 2 ? "right" : "left";
    const img = el.querySelector("img");
    img.style.width = box.w + "px";
    img.style.height = box.h + "px";
  });

  nudgeMarkers(placed.slice(markerRects.length));
}

// Where a wide animal shares a depth with a marker and no horizontal slot
// exists, the label moves and the animal keeps its depth. A label may sit
// beside the line it names; an animal may not sit at the wrong depth.
const NUDGE_GAP = 20;
const NUDGE_MAX = 260;

function nudgeMarkers(creatureRects) {
  markers.forEach((marker, i) => {
    const r = markerRects[i];
    if (!r) return;
    let shift = 0;

    creatureRects.forEach((c) => {
      const box = { y: r.y + shift, h: r.h };
      const overlapX =
        Math.min(c.x + c.w, r.x + r.w) - Math.max(c.x, r.x);
      const overlapY =
        Math.min(c.y + c.h, box.y + box.h) - Math.max(c.y, box.y);
      if (overlapX <= 0 || overlapY <= 0) return;

      const up = box.y + box.h - c.y + NUDGE_GAP;
      const down = c.y + c.h - box.y + NUDGE_GAP;
      shift += Math.abs(up) <= Math.abs(down) ? -up : down;
    });

    shift = Math.max(-NUDGE_MAX, Math.min(NUDGE_MAX, shift));
    markerRects[i] = { x: r.x, y: r.y + shift, w: r.w, h: r.h };
    marker.el.style.setProperty("--nudge", Math.round(shift) + "px");
  });
}

const DRIFT_SEED = 71204221;
const DRIFT_MIN_DURATION = 8;
const DRIFT_MAX_DURATION = 20;

function assignDriftTiming() {
  const rand = seeded(DRIFT_SEED);
  CREATURES.forEach((creature) => {
    const el = els.get(creature.id);
    if (!el) return;
    const duration =
      DRIFT_MIN_DURATION + rand() * (DRIFT_MAX_DURATION - DRIFT_MIN_DURATION);
    const delay = -rand() * duration;
    el.style.setProperty("--drift-duration", duration.toFixed(2) + "s");
    el.style.setProperty("--drift-delay", delay.toFixed(2) + "s");
  });
}

const markers = [];

function renderZones() {
  const ocean = document.querySelector(".ocean");
  ZONES.forEach((zone) => {
    const el = document.createElement("section");
    el.className = "zone";
    el.dataset.zone = zone.name.toLowerCase();
    el.dataset.ink = zone.depth < 150 ? "dark" : "light";

    const inner = document.createElement("div");
    inner.className = "zone-inner";

    const depth = document.createElement("span");
    depth.className = "zone-depth";
    depth.textContent = formatDepth(zone.depth) + "\u2009m";

    // Split for tracking; screen readers get the whole word from the hidden span.
    const heading = document.createElement("h2");
    heading.className = "zone-name";
    heading.innerHTML = '<span class="visually-hidden"></span>';
    heading.querySelector("span").textContent = zone.name + " zone";
    const letters = document.createElement("span");
    letters.className = "zone-letters";
    letters.setAttribute("aria-hidden", "true");
    zone.name
      .toUpperCase()
      .split("")
      .forEach((ch) => {
        const s = document.createElement("span");
        s.textContent = ch;
        letters.appendChild(s);
      });
    heading.appendChild(letters);

    const copy = document.createElement("p");
    copy.className = "zone-copy";
    copy.textContent = zone.copy;

    inner.appendChild(depth);
    inner.appendChild(heading);
    inner.appendChild(copy);
    el.appendChild(inner);
    ocean.appendChild(el);
    markers.push({ el: el, depth: zone.depth });
  });
}

function renderLandmarks() {
  const ocean = document.querySelector(".ocean");
  LANDMARKS.forEach((landmark) => {
    const el = document.createElement("section");
    el.className =
      "landmark" + (landmark.depth === DEPTH_MAX ? " landmark--floor" : "");

    const inner = document.createElement("div");
    inner.className = "landmark-inner";

    const depth = document.createElement("span");
    depth.className = "landmark-depth";
    depth.textContent = formatDepth(landmark.depth) + "\u2009m";
    inner.appendChild(depth);

    landmark.copy.split("\n\n").forEach((para) => {
      const p = document.createElement("p");
      p.textContent = para;
      inner.appendChild(p);
    });

    el.appendChild(inner);
    ocean.appendChild(el);
    markers.push({ el: el, depth: landmark.depth });
  });
}

// Centred on their depth, except the surface marker, which would otherwise
// sit halfway down the opening screen.
function positionMarkers() {
  markers.forEach((marker) => {
    if (marker.depth === 0) {
      marker.el.style.top = "0px";
      marker.el.style.transform = "translateY(var(--nudge, 0px))";
      return;
    }
    marker.el.style.top = Math.round(depthToY(marker.depth)) + "px";
    marker.el.style.transform = "translateY(calc(-50% + var(--nudge, 0px)))";
  });
}

// Marker text sits directly on the water, and ink over a bright sprite fails
// no matter what, so the layout keeps sprites out from behind the words.
const MARKER_MARGIN = 16;
let markerRects = [];

function measureMarkers() {
  markerRects = markers.map((marker) => {
    const el = marker.el;
    const inner = el.firstElementChild;
    const elTop =
      marker.depth === 0 ? 0 : depthToY(marker.depth) - el.offsetHeight / 2;
    return {
      x: inner.offsetLeft - MARKER_MARGIN,
      y: elTop + inner.offsetTop - MARKER_MARGIN,
      w: inner.offsetWidth + MARKER_MARGIN * 2,
      h: inner.offsetHeight + MARKER_MARGIN * 2,
    };
  });
}

const COLOUR_STOPS = [
  { depth: 0, r: 142, g: 207, b: 223 },
  { depth: 200, r: 22, g: 71, b: 97 },
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
  if (depth <= 200) return 20 - (depth / 200) * 16;
  if (depth <= 1000) return 4 - ((depth - 200) / 800) * 1;
  return 3 - ((depth - 1000) / 9935) * 1.5;
}

function getLight(depth) {
  if (depth >= 1000) return 0;
  return Math.round(100 * Math.exp(-depth / 150));
}

const readouts = {
  depth: document.getElementById("hud-depth"),
  pressure: document.getElementById("hud-pressure"),
  temp: document.getElementById("hud-temp"),
  light: document.getElementById("hud-light"),
};

// Writes only what changed; unchanged strings and colours still cost a
// style recalculation.
const last = { colour: "", depth: "", pressure: "", temp: "", light: "" };

function write(key, node, value) {
  if (last[key] === value) return;
  last[key] = value;
  node.textContent = value;
}

function tick() {
  requestAnimationFrame(tick);

  const depth = getDepth();
  const col = getColour(depth);
  const colour = "rgb(" + col.r + ", " + col.g + ", " + col.b + ")";
  if (colour !== last.colour) {
    last.colour = colour;
    document.body.style.background = colour;
  }

  write("depth", readouts.depth, formatDepth(depth) + "\u2009m");
  write("pressure", readouts.pressure, getPressure(depth).toFixed(1) + "\u2009atm");
  write("temp", readouts.temp, getTemperature(depth).toFixed(1) + "\u2009°C");
  write("light", readouts.light, getLight(depth) + "\u2009%");
}

// Hover is handled in CSS. Touch needs a real toggle, because a tap that
// only triggers :hover leaves the card stuck open.
function initCards() {
  document.addEventListener("click", (event) => {
    const node = event.target;
    const target = node && node.closest ? node.closest(".creature") : null;
    document.querySelectorAll(".creature.is-open").forEach((el) => {
      if (el !== target) el.classList.remove("is-open");
    });
    if (target) target.classList.toggle("is-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document
      .querySelectorAll(".creature.is-open")
      .forEach((el) => el.classList.remove("is-open"));
  });
}

let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    positionMarkers();
    measureMarkers();
    layoutCreatures();
  }, 120);
}

initScale();
renderCreatures();
renderZones();
renderLandmarks();
positionMarkers();
measureMarkers();
layoutCreatures();
assignDriftTiming();
initCards();
window.addEventListener("resize", onResize);
tick();
