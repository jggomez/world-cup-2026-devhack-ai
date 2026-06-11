# Research Notes: 3D Flag Rendering and Optimization in WebGL

This document resolves the technical research, choices, and implementation patterns for integrating Three.js, waving shaders, and dynamic SVG-to-Canvas textures into the World Cup 2026 Web Application.

---

## Decision 1: Waving Flag Simulation — Shader vs JavaScript CPU

### Options Considered
1. **CPU Modification:** Mutating the `position` attribute of a `THREE.PlaneGeometry` in the `requestAnimationFrame` loop.
2. **GPU Vertex Shader:** Writing a custom GLSL vertex shader that updates vertex heights ($y$ or $z$) based on a time uniform.

### Decision & Rationale
We chose **Option 2: GPU Vertex Shader**.
- **Performance:** Modifying geometry vertices in JS requires rewriting the vertex buffer and re-uploading it to the GPU every frame. This causes high CPU usage and hurts the frame rate, especially on mobile browsers.
- **Visual Smoothness:** A vertex shader computes wave deformations in parallel directly on the GPU, keeping CPU usage minimal. A simple sine-wave noise function in GLSL delivers realistic wind-waving dynamics at 60fps.

---

## Decision 2: Dynamic SVG-to-Canvas Texture Loading

### Options Considered
1. **Direct SVG Image Loading:** Loading SVG files as image tags and directly converting to `THREE.Texture`.
2. **Dynamic Canvas Rasterization:** Parsing SVGs, rendering them to a 2D HTML `<canvas>` with defined dimensions (256x256), and using `THREE.CanvasTexture`.

### Decision & Rationale
We chose **Option 2: Dynamic Canvas Rasterization**.
- **Texture Scaling & Quality:** WebGL requires textures to be rasterized. Direct SVGs loaded via `<img>` tags sometimes fail to report proper dimensions or suffer from cross-origin security restrictions in WebGL.
- **Memory Optimization:** Pre-rasterizing SVGs to 256x256-pixel canvas contexts allows us to scale textures down to prevent GPU memory bloat, maintaining a Fast LCP (under 2.5s).

---

## Decision 3: On-Demand Rendering vs Continuous Loop

### Options Considered
1. **Continuous Loop:** Running `requestAnimationFrame` non-stop to render the scene.
2. **On-Demand Loop (Play/Pause):** Stopping the loop when animations complete, and restarting it only when interaction triggers.

### Decision & Rationale
We chose **Option 2: On-Demand Loop**.
- **Battery & Core Web Vitals:** A continuous loop keeps the GPU active constantly, causing battery drain on mobile devices and degrading Interaction to Next Paint (INP).
- **Triggers:** The loop runs during transitions (e.g., swapping group stage to bracket) and stops when camera movements or flag animations settle.

---

## Decision 4: WebGL2 Fallback Strategy

### Options Considered
1. **CSS 3D Fallback:** Using CSS 3D transforms.
2. **Static Tailwind/SVG Fallback:** Gracefully degrading to simple Tailwind flag tags if WebGL context creation fails.

### Decision & Rationale
We chose **Option 2: Static Tailwind/SVG Fallback**.
- **Robustness:** Ensures the application is 100% functional on devices without WebGL support.
