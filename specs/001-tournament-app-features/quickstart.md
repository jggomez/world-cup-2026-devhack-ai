# Developer Quickstart: World Cup 2026 3D & AI Web Application

This document guides developers through setting up, running, and testing the Three.js and Firebase AI Logic layers.

---

## 1. Setup

### Dependencies Installation
Install three.js, gsap, and their type definitions:
```bash
npm install three gsap
```

### Fallback Setup
By default, the UI will fall back to static flags using standard SVG elements if WebGL2 is not supported. Verify WebGL availability with:
```javascript
import { WebGL } from 'three/addons/capabilities/WebGL.js';

if (!WebGL.isWebGL2Available()) {
    console.warn("WebGL2 not available. Falling back to static SVG flags.");
    // Run static SVG flag rendering path
}
```

---

## 2. Rendering the 3D Flag Mesh

Use `PlaneGeometry` with a custom shader material to achieve realistic flag movement:

```javascript
import * as THREE from 'three';

const geometry = new THREE.PlaneGeometry(3, 2, 30, 20); // dense segment count

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uTexture: { value: null } // Load CanvasTexture here
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      // wave equation
      pos.z = sin(pos.x * 2.0 + uTime * 3.0) * 0.15 * sin(pos.y * 1.5 + uTime * 2.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `
});
```

---

## 3. Running Tests

### E2E Tests with WebGL
To execute E2E visual verification and test DOM integrations:
```bash
npx playwright test
```
*Note: Make sure your test environment headful runner has hardware acceleration enabled.*
