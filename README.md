![Hadal](banner.png)

# Hadal

`DEPTH 10,935 m` `ANIMALS 43` `ZONES 5` `DEPENDENCIES 0`

A scroll-driven descent from the ocean surface to the floor of the Challenger Deep.

The page acts as the ocean. Scroll position maps to real depth. Light fades zone by zone, 43 real animals appear at the depths they actually live, and a fixed instrument panel reports live depth, pressure, temperature, and remaining light. The deeper you go, the emptier it gets.

Built with HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

---

## The mapping

Everything else in the project hangs off three lines.

```js
scrollSpan() = OCEAN_HEIGHT - window.innerHeight     // 54675 - viewport
depthToY(d)  = (d / 10935) * scrollSpan() + window.innerHeight / 2
getDepth()   = min(scrollY / scrollSpan() * 10935, 10935)
```

`OCEAN_HEIGHT` is 54,675px, which is 10,935m at 5px per metre. The half-viewport offset is what keeps the mapping honest: content at depth D sits in the middle of the screen at the exact moment the instrument panel reads D. Placing it at `depth * 5px` instead drifts, and the error grows with viewport height, so a taller window reads the Titanic dozens of metres off.

---

## Two problems worth solving

**Contrast.** The background travels from bright cyan at the surface to near-black in the trench, so no fixed text colour survives the full ramp. Interpolating the text colour with depth does not help either, because every colour ramp has a crossing point where the text and the water match. The answer turned out to be two different ones. The instrument panel and the creature captions sit on an opaque housing at `#0a0f11`, which holds a 10.9:1 contrast ratio for the amber text and 16:1 for the body ink at every depth, measured, with nothing to tune. The zone markers and landmark captions sit on the water itself, which only works because the 200m colour stop was darkened until amber clears 5.6:1 from Twilight down. The surface marker is the one place neither approach fits: amber on bright cyan measures 1.02:1, so it runs dark ink instead.

**Scale.** The dataset spans 556:1, from a 25 metre blue whale to a 4.5 centimetre amphipod. Standard size buckets could not carry that range. Scaling purely by length also looked wrong, because the eye compares rendered area rather than length: sized that way, a 2.5 metre ocean sunfish and a 4.5 metre great white land within 9% of the same area on screen, despite the shark being nearly twice as long. Size is now derived from the geometric mean of width and height, with each crop's own aspect ratio divided back out, so every creature at a given step covers the same area whatever its shape. Positions are laid out by a seeded collision sweep, so the scatter is arbitrary but identical on every visit.

---

## Structure

| File | What it holds |
| --- | --- |
| `index.html` | Document shell and the instrument panel markup |
| `style.css` | Two materials: water and housing |
| `script.js` | Depth mapping, sizing, layout, and render loop |
| `data.js` | 43 creatures, 5 zone boundaries, and 5 landmarks |
| `creatures/` | 43 WebP sprites, 1.07MB total |

---

## Where the data stops

The depths listed are typical depths for each species, not their absolute maximums. The temperature curve is a labelled approximation across three segments, while the depths and the facts are verified. The creature visuals are illustrations, not photographs.

The drift animation is disabled under `prefers-reduced-motion` and only runs for creatures currently on screen. Every creature can be reached with the Tab key to read what it is.

Other things I have built live at [bytiago.com](https://bytiago.com/).
