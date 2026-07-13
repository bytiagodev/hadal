const DEPTH_MAX = 10935;
const PX_PER_METRE = 5;

const state = {
  depth: 0
};

function getDepth() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const raw = (window.scrollY / scrollable) * DEPTH_MAX;
  return Math.min(raw, DEPTH_MAX);
}

function tick() {
  requestAnimationFrame(tick);
  state.depth = getDepth();
  console.log(state.depth.toFixed(1) + 'm');
}

tick();