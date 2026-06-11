# UI Contract: 3D Scene Manager (WebGL Layer)

This document defines the interface of the `SceneManager` class, which bridges the DOM/GSAP thread with Three.js.

---

## Class: `SceneManager`

Coordinates scenes, cameras, renderers, and animations.

### Methods

#### 1. `init(canvasElement)`
Initializes the Three.js viewport context.
* **Arguments**:
  - `canvasElement` (HTMLCanvasElement): The `<canvas>` element to mount.
* **Returns**: `void`
* **Behavior**:
  - Sets up the WebGLRenderer (antialias, shadow maps, alpha = true).
  - Initializes the perspective camera.
  - Mounts scene lights (Ambient + Directional).
  - Starts on-demand event listeners (resize, visibility).

#### 2. `loadGroupView(groupCode)`
Renders flag planes representing the teams in a selected group.
* **Arguments**:
  - `groupCode` (string): Group letter (A to L).
* **Returns**: `Promise<void>`
* **Behavior**:
  - Clear existing meshes.
  - Calls `FlagFactory` to fetch team flags.
  - Positions flags in a 3D circle grid layout.
  - Triggers a GSAP entry fade/scale animation.

#### 3. `transitionToBracket()`
Pans camera through the knockout bracket.
* **Arguments**: None
* **Returns**: `Promise<void>`
* **Behavior**:
  - Renders the elimination bracket structure.
  - Performs camera dolly and rotation through nodes (Round of 32 -> Round of 16 -> Final) via a GSAP Timeline.
  - Disables rendering once transition completes.

#### 4. `highlightFlag(teamCode)`
Focuses, rotates, and highlights a team's 3D flag.
* **Arguments**:
  - `teamCode` (string): ISO team code (e.g. `MEX`).
* **Returns**: `void`
* **Behavior**:
  - Finds the flag mesh.
  - Uses GSAP to animate scale and rotation properties.
  - Temporarily sets the shader "wind frequency" to a high multiplier for a dramatic waving effect.
