---
name: algorithmic-art
description: Creating algorithmic art using p5.js with seeded randomness and interactive parameter exploration. Use this when users request creating art using code, generative art, algorithmic art, flow fields, or particle systems. Create original algorithmic art rather than copying existing artists' work to avoid copyright violations.
license: Complete terms in LICENSE.txt
---

Algorithmic art is a computational aesthetic movement expressed through code. Each piece begins as a philosophy — a worldview about how systems behave — then becomes living code.

Output: one `SKILL.md` philosophy file + one self-contained `viewer.html` artifact.

---

## PHASE 1: ALGORITHMIC PHILOSOPHY

Before writing a single line of code, write a philosophy. This is a manifesto for a generative aesthetic movement — not a spec, not a description of what the code will do. It describes *how the world behaves* in this system.

### How to Write the Philosophy

**Name the movement** (1–2 words): "Organic Turbulence" / "Quantum Harmonics" / "Emergent Stillness"

**Write 4–6 paragraphs** covering:
- What computational process drives this system? (noise, recursion, physics, cellular automata, trigonometry, graph theory…)
- What is the relationship between order and disorder in this system?
- How does time or iteration change the system's state?
- What emerges that wasn't explicitly programmed?
- What makes each seeded variation feel distinct yet part of the same family?

### Guidelines

- **No redundancy.** Each idea appears once. Don't repeat noise theory, particle dynamics, or randomness principles.
- **One craftsmanship statement.** State once, clearly, that this algorithm should feel like the product of deep expertise — finely tuned, not randomly assembled. Don't repeat it.
- **Leave implementation room.** Be specific about the computational direction, vague about exact implementation. The philosophy guides; code decides.
- **Avoid the particle-flow default.** The obvious interpretation is always particles following a flow field. Push past it. Consider: recursive subdivision, constraint satisfaction, reaction-diffusion, strange attractors, cellular automata, Voronoi relaxation, L-systems, wave interference, topology.

### Philosophy Examples

**"Stochastic Crystallization"**
Random points seed a Voronoi tessellation. Over time, a Lloyd's relaxation algorithm pushes cells apart until equilibrium — each cell finding its territory through negotiation with neighbors. Color emerges from cell size, neighbor count, and distance from center. The tension between randomness (initial placement) and determinism (relaxation rules) produces tiling that feels both inevitable and unique. Every seed reveals a different mineral structure from the same geological process.

**"Recursive Whispers"**
Branching structures subdivide according to golden ratio constraints, each fork slightly perturbed by noise. Line weight diminishes with recursion depth. At deep levels, branches become suggestion rather than structure — the eye fills in what the algorithm trails off. Self-similarity across scales creates the uncanny feeling of infinite depth in finite space. The system knows when to stop: a threshold below which detail would become indistinguishable from texture.

**"Reaction Equilibrium"**
Two chemical species diffuse across a grid, each inhibiting the other's growth at close range while activating it at distance. Turing's insight — that instability in a stable system generates pattern — plays out over thousands of iterations. Stripes, spots, and labyrinthine networks emerge from the same equations with different diffusion rates. The parameter space is a map of biological morphology: adjust the ratio and watch leopard spots become zebra stripes.

*(These are condensed. Your philosophy should be 4–6 full paragraphs.)*

---

## PHASE 2: CONCEPTUAL SEED

Before implementing, identify the quiet conceptual thread from the user's request.

This is **not** a literal translation. It's a subtle reference embedded in parameters, behaviors, and emergence — felt intuitively by someone who knows the subject, invisible to everyone else. Think of a jazz musician quoting a melody through harmonic implication: only those listening closely catch it, but everyone feels the depth.

Ask: *What does this subject know about systems, time, tension, equilibrium, or structure that can become an algorithmic truth in this piece?*

---

## PHASE 3: P5.JS IMPLEMENTATION

### Step 0: Read the Template

Before writing HTML, read `templates/viewer.html`. Use it as the **literal starting point** — copy its structure, keep its branding, replace only the algorithm and parameters.

**Keep exactly:**
- Layout (header, sidebar, canvas area)
- Anthropic colors and fonts (Poppins, Lora)
- Seed section (display, prev/next/random/jump)
- Actions section (reset, download)

**Replace entirely:**
- The p5.js algorithm
- The `params` object
- The parameter UI controls in the sidebar
- The `initializeSystem()` body
- The Colors section (include only if the art needs adjustable colors)

---

### Technical Requirements

**Seeded randomness — always:**
```javascript
randomSeed(params.seed);
noiseSeed(params.seed);
```
Same seed must always produce identical output. This is non-negotiable.

**Parameter design — ask the right questions:**
```javascript
let params = {
  seed: 12345,
  // Ask: What quantities control this system?
  // - How many? (counts)
  // - How fast? (speeds, rates)
  // - How far? (distances, radii, scales)
  // - How likely? (probabilities, thresholds)
  // - What ratio? (proportions between competing forces)
  // - When does behavior change? (bifurcation points)
};
const defaultParams = JSON.parse(JSON.stringify(params));
```

Parameters should emerge from the philosophy, not from a generic menu. A reaction-diffusion system needs feed rate and kill rate. A recursive branching system needs branch angle and depth limit. Don't use flow field parameters for a crystallization algorithm.

**Data-driven reset — always use this pattern:**
```javascript
function resetParameters() {
  Object.assign(params, defaultParams);
  // Sync every slider/input from params, not by ID
  document.querySelectorAll('[data-param]').forEach(el => {
    const key = el.dataset.param;
    el.value = params[key];
    const display = document.getElementById(key + '-value');
    if (display) display.textContent = params[key];
  });
  initializeSystem();
}
```

And in HTML, tag every control with `data-param`:
```html
<input type="range" data-param="noiseScale" id="noiseScale" ...>
```

This means `resetParameters()` never needs to be updated when parameters change.

---

### Algorithm Archetypes

Choose based on the philosophy — not by default. Never default to particles + flow field unless the philosophy genuinely calls for it.

| Philosophy type | Consider |
|---|---|
| Organic / growth | Reaction-diffusion, DLA, L-systems, Eden model |
| Mathematical beauty | Strange attractors (Lorenz, Clifford), Lissajous, rose curves |
| Order from disorder | Cellular automata (Game of Life variants), annealing |
| Field / force | Vector fields, electrostatic simulation, gravity wells |
| Structure / tiling | Voronoi + Lloyd relaxation, Penrose tiling, Wang tiles |
| Recursive / fractal | IFS, recursive subdivision, space-filling curves |
| Wave / interference | Superimposed sine fields, Chladni patterns, ripple interference |
| Particle / flow | Flow fields — only when this is genuinely the right fit |

**Performance budget:**
- Static (no animation): use `noLoop()` after first draw. Can afford more complexity.
- Animated: target 30fps minimum. Test with `frameRate()`. If dropping below 20fps, reduce particle count or switch to a typed array.
- For heavy systems (10k+ particles), use a flat `Float32Array` instead of an object array.

---

### Craftsmanship Requirements

Every parameter should be tuned with purpose. Every emergent behavior should feel inevitable in retrospect. This is not random noise dressed up as art — it is controlled variance refined into aesthetic truth.

Specifically:
- **Color harmony**: Build palettes from HSB relationships, not arbitrary hex values. Analogous, complementary, or triadic — commit to a logic.
- **Composition**: Even in a random system, seed selection and parameter defaults should favor visual balance. The center of mass matters.
- **Edge behavior**: What happens at canvas boundaries? Wrap, reflect, fade, or die — choose deliberately.
- **Temporal arc**: If animated, the system should have a beginning, middle, and evolved state. Not infinite identical loop.

---

### Output Format

1. **Philosophy** — 4–6 paragraphs as a `.md` file
2. **Single HTML artifact** — built from `templates/viewer.html`, self-contained, works immediately in claude.ai or any browser

---

## INTERACTIVE ARTIFACT REQUIREMENTS

### Sidebar Structure

```
[Title + subtitle]

Seed
  [number input — current seed]
  [← Prev] [Next →]
  [↻ Random]

Parameters
  [controls specific to THIS algorithm]

Colors (optional — only if adjustable)
  [color pickers]

Actions
  [Reset]  [Download PNG]
```

### Seed controls — always include, never modify:
```javascript
function previousSeed() { params.seed = Math.max(1, params.seed - 1); updateSeedDisplay(); initializeSystem(); }
function nextSeed()     { params.seed = params.seed + 1; updateSeedDisplay(); initializeSystem(); }
function randomSeedAndUpdate() { params.seed = Math.floor(Math.random() * 999999) + 1; updateSeedDisplay(); initializeSystem(); }
function updateSeed()   { 
  const v = parseInt(document.getElementById('seed-input').value);
  if (v > 0) { params.seed = v; initializeSystem(); }
}
function updateSeedDisplay() { document.getElementById('seed-input').value = params.seed; }
```

### Download — always include:
```javascript
function downloadPNG() {
  const link = document.createElement('a');
  link.download = `seed-${params.seed}.png`;
  link.href = document.querySelector('canvas').toDataURL();
  link.click();
}
```

---

## FINAL CHECK

Before delivering, answer these five questions. If any answer is no, fix it first.

1. Does the algorithm express the philosophy, or does it just use the philosophy's vocabulary?
2. Does the same seed always produce identical output?
3. Are the default parameters tuned to produce a visually strong result out of the box?
4. Does `resetParameters()` use the data-driven pattern (not hardcoded IDs)?
5. Is there at least one thing in this piece that couldn't have come from a generic "generative art" prompt?