// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHMIC ART — GENERATOR REFERENCE
//
// This file is a reference for p5.js best practices and structural patterns.
// It is NOT a template to copy. It is NOT a menu of options to pick from.
//
// Use it to understand:
//   - How to structure a system (params, init, draw, classes)
//   - How to write performant code for different system sizes
//   - How different algorithm families express themselves in code
//   - When to use noLoop() vs animated draw()
//
// Your algorithm should emerge from your philosophy, not from this file.
// ═══════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────
// SECTION 1: PARAMS & SEED PATTERN
// ─────────────────────────────────────────────────────────────────────────
//
// Always define params as a plain object with all tuneable values.
// Always deep-clone it to defaultParams immediately.
// Always call randomSeed + noiseSeed at the top of initializeSystem().

let params = {
    seed: 12345,
    // ... your parameters here
  };
  const defaultParams = JSON.parse(JSON.stringify(params));
  
  function initializeSystem() {
    randomSeed(params.seed);  // must come first
    noiseSeed(params.seed);   // must come first
    background(250, 249, 245);
    // ... build your system
  }
  
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2: STATIC VS ANIMATED
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Static art (renders once, no loop):
  //   → Call noLoop() at end of setup() or end of first draw()
  //   → Can afford much more complexity (10k+ elements, deep recursion)
  //   → Redraw only when params change (call redraw() or reinitialize)
  //
  // Animated art (runs continuously):
  //   → Must hit 30fps minimum — test with frameRate() in draw()
  //   → For <1000 objects: standard class array is fine
  //   → For 1000–10000 objects: use flat Float32Array (see Section 4)
  //   → For >10000 objects: use a shader or rethink the algorithm
  //
  // Choosing:
  //   → Does the beauty live in a single frame? → static
  //   → Does the beauty live in watching it evolve? → animated
  //   → When in doubt, static is safer and richer
  
  function setup() {
    createCanvas(1200, 1200);
    initializeSystem();
    noLoop(); // static — remove for animated
  }
  
  function draw() {
    // For static: this runs once then stops
    // For animated: this runs every frame — keep it fast
  }
  
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3: ALGORITHM FAMILIES WITH CODE PATTERNS
  // ─────────────────────────────────────────────────────────────────────────
  
  // ── 3A: FLOW FIELD (particles following a noise vector field) ──
  // Use when: the philosophy is about invisible forces, drift, accumulation
  // Characteristic feel: organic lines, density maps, flowing paths
  
  function flowFieldExample() {
    const scl = 10;
    const cols = floor(width / scl);
    const rows = floor(height / scl);
    const field = new Array(cols * rows);
  
    // Build field once
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const angle = noise(x * 0.005, y * 0.005) * TWO_PI * 2;
        field[y * cols + x] = createVector(cos(angle), sin(angle));
      }
    }
  
    // Sample field for a position
    function sample(px, py) {
      const xi = constrain(floor(px / scl), 0, cols - 1);
      const yi = constrain(floor(py / scl), 0, rows - 1);
      return field[yi * cols + xi];
    }
  }
  
  
  // ── 3B: REACTION-DIFFUSION (Turing pattern / Gray-Scott model) ──
  // Use when: the philosophy is about chemical competition, biological form
  // Characteristic feel: spots, stripes, labyrinths
  
  function reactionDiffusionSetup(w, h) {
    // Two grids: A (activator) and B (inhibitor)
    let gridA = new Float32Array(w * h).fill(1);
    let gridB = new Float32Array(w * h).fill(0);
    let nextA = new Float32Array(w * h);
    let nextB = new Float32Array(w * h);
  
    // Seed a small region with B
    const cx = floor(w / 2), cy = floor(h / 2);
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -5; dx <= 5; dx++)
        gridB[(cy + dy) * w + (cx + dx)] = 1;
  
    // Parameters (tune these for different patterns)
    const dA = 1.0;   // diffusion rate A
    const dB = 0.5;   // diffusion rate B
    const f  = 0.055; // feed rate  — vary for spots vs stripes
    const k  = 0.062; // kill rate  — vary for spots vs stripes
  
    function step() {
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const a = gridA[i], b = gridB[i];
          const laplaceA = gridA[i-1] + gridA[i+1] + gridA[i-w] + gridA[i+w] - 4 * a;
          const laplaceB = gridB[i-1] + gridB[i+1] + gridB[i-w] + gridB[i+w] - 4 * b;
          const reaction = a * b * b;
          nextA[i] = constrain(a + dA * laplaceA - reaction + f * (1 - a), 0, 1);
          nextB[i] = constrain(b + dB * laplaceB + reaction - (k + f) * b, 0, 1);
        }
      }
      [gridA, nextA] = [nextA, gridA];
      [gridB, nextB] = [nextB, gridB];
    }
  
    return { gridA, gridB, step, w, h };
  }
  
  
  // ── 3C: STRANGE ATTRACTOR (Clifford / De Jong) ──
  // Use when: the philosophy is about hidden order in chaotic systems
  // Characteristic feel: delicate traced paths, infinite detail at edges
  
  function cliffordAttractor(a, b, c, d, iterations) {
    // Parameters a,b,c,d each in roughly [-3, 3] — tune per seed
    let x = 0, y = 0;
    for (let i = 0; i < iterations; i++) {
      const nx = sin(a * y) + c * cos(a * x);
      const ny = sin(b * x) + d * cos(b * y);
      x = nx; y = ny;
      // Map x,y (range ~[-2,2]) to canvas coordinates and plot
      const px = map(x, -2.5, 2.5, 0, width);
      const py = map(y, -2.5, 2.5, 0, height);
      stroke(255, 255, 255, 3); // very low alpha — density builds naturally
      point(px, py);
    }
  }
  
  
  // ── 3D: VORONOI + LLOYD RELAXATION (crystallization / territory) ──
  // Use when: the philosophy is about space-filling, negotiation, equilibrium
  // Characteristic feel: organic tiling, cell structures, territory maps
  
  function lloydRelaxation(points, iterations) {
    // points: array of {x, y}
    // Each iteration: assign each pixel to nearest point, move point to centroid
    for (let iter = 0; iter < iterations; iter++) {
      const sums = points.map(() => ({ sx: 0, sy: 0, count: 0 }));
  
      // Sample the canvas (use step > 1 for performance)
      const step = 4;
      for (let py = 0; py < height; py += step) {
        for (let px = 0; px < width; px += step) {
          let best = 0, bestDist = Infinity;
          for (let i = 0; i < points.length; i++) {
            const d = (px - points[i].x) ** 2 + (py - points[i].y) ** 2;
            if (d < bestDist) { bestDist = d; best = i; }
          }
          sums[best].sx += px;
          sums[best].sy += py;
          sums[best].count++;
        }
      }
  
      // Move each point to centroid of its region
      for (let i = 0; i < points.length; i++) {
        if (sums[i].count > 0) {
          points[i].x = sums[i].sx / sums[i].count;
          points[i].y = sums[i].sy / sums[i].count;
        }
      }
    }
    return points;
  }
  
  
  // ── 3E: RECURSIVE SUBDIVISION (L-systems / branching) ──
  // Use when: the philosophy is about self-similarity, growth, hierarchy
  // Characteristic feel: tree forms, fractal geometry, organic structures
  
  function branch(x, y, angle, length, depth) {
    if (depth === 0 || length < 1) return;
  
    const x2 = x + cos(angle) * length;
    const y2 = y + sin(angle) * length;
  
    strokeWeight(map(depth, 0, 8, 0.5, 3));
    line(x, y, x2, y2);
  
    const spread = PI / 5 + noise(x * 0.01, y * 0.01) * PI / 8;
    const decay  = 0.68 + noise(depth, x * 0.005) * 0.04;
  
    branch(x2, y2, angle - spread, length * decay, depth - 1);
    branch(x2, y2, angle + spread, length * decay, depth - 1);
  }
  
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4: PERFORMANCE PATTERNS
  // ─────────────────────────────────────────────────────────────────────────
  
  // ── Flat typed array for large particle systems (>2000 particles) ──
  // Instead of: particles.push(new Particle())  ← slow for large N
  // Use flat arrays indexed by particle id
  
  function createParticleSystem(N) {
    return {
      x:   new Float32Array(N),
      y:   new Float32Array(N),
      vx:  new Float32Array(N),
      vy:  new Float32Array(N),
      age: new Float32Array(N),
      N
    };
  }
  
  function updateParticles(sys) {
    for (let i = 0; i < sys.N; i++) {
      sys.x[i]  += sys.vx[i];
      sys.y[i]  += sys.vy[i];
      sys.age[i]++;
      if (sys.age[i] > 200 || sys.x[i] < 0 || sys.x[i] > width) {
        sys.x[i] = random(width);
        sys.y[i] = random(height);
        sys.age[i] = 0;
      }
    }
  }
  
  
  // ── Off-screen buffer for expensive backgrounds ──
  // Render the background layer once to a graphics buffer, composite on top
  
  let bgBuffer;
  
  function createBackgroundBuffer() {
    bgBuffer = createGraphics(width, height);
    bgBuffer.background(10, 8, 20);
    // ... expensive background rendering here
    // bgBuffer never needs to be redrawn unless params change
  }
  
  // In draw():
  //   image(bgBuffer, 0, 0); // fast composite
  //   // ... draw particles on top
  
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5: COLOR PATTERNS
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Use HSB mode for palette construction — it makes color logic legible.
  // Switch back to RGB if mixing with hex values from params.
  
  function buildPalette_analogous(hue, count) {
    colorMode(HSB, 360, 100, 100, 100);
    return Array.from({ length: count }, (_, i) => {
      return color(
        (hue + i * (40 / count)) % 360,
        65 + random(-10, 10),
        85 + random(-10, 10)
      );
    });
  }
  
  function buildPalette_complementary(hue) {
    colorMode(HSB, 360, 100, 100, 100);
    return [
      color(hue,        70, 85),
      color(hue,        30, 95), // tint
      color((hue + 180) % 360, 70, 80), // complement
      color((hue + 180) % 360, 30, 95), // complement tint
    ];
  }
  
  // Map a value (0–1) to a gradient between two colors
  function lerpColor2(c1, c2, t) {
    return lerpColor(c1, c2, t);
  }
  
  // Map velocity or energy to color temperature (cool → warm)
  function velocityColor(speed, maxSpeed) {
    colorMode(HSB, 360, 100, 100, 100);
    const h = map(speed, 0, maxSpeed, 220, 20); // blue → orange
    const s = map(speed, 0, maxSpeed, 40, 90);
    return color(h, s, 90, 60);
  }
  
  
  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6: COMMON UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
  
  // Wrap position to canvas edges (toroidal space)
  function wrapEdges(x, y) {
    return {
      x: (x + width)  % width,
      y: (y + height) % height
    };
  }
  
  // Reflect velocity at canvas edges (bouncing)
  function reflectEdges(pos, vel, margin = 0) {
    if (pos.x < margin || pos.x > width  - margin) vel.x *= -1;
    if (pos.y < margin || pos.y > height - margin) vel.y *= -1;
  }
  
  // Hash a seed string to a number (for text-based seeds)
  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return Math.abs(h);
  }
  
  // Smooth step (ease in/out between 0 and 1)
  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }
  
  // Map with clamping
  function mapClamped(v, inMin, inMax, outMin, outMax) {
    return constrain(map(v, inMin, inMax, outMin, outMax), outMin, outMax);
  }