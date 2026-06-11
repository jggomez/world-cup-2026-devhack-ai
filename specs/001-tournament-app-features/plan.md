# Implementation Plan: World Cup Tournament App — Core Features with 3D Visualizations

**Branch**: `001-tournament-app-features` | **Date**: 2026-06-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-tournament-app-features/spec.md`

## Summary

The World Cup 2026 Web App features a highly interactive UI showcasing 12 group standings (Groups A–L) and a full knockout bracket starting from the Round of 32 (16avos). To make the experience premium, we will integrate **Three.js** to render waving 3D flags with dynamic SVG-to-Canvas textures, a camera panning transition across bracket stages, GSAP timeline orchestrations, and interactive 3D sticker cards using a clean architecture that separates 3D rendering managers from the core UI.

## Technical Context

**Language/Version**: JavaScript (ES6+, client-side)  
**Primary Dependencies**: Three.js (R160+), GSAP (GreenSock), Firebase App Hosting / SDK, Tailwind CSS  
**Storage**: Firestore (matches, standings, team profiles, predictions), LocalStorage (for offline sticker/UI state cache)  
**Testing**: Vitest + Playwright (for E2E interface and WebGL canvas verification)  
**Target Platform**: Modern Web Browsers (Mobile & Desktop) with WebGL2 support, falling back to static Tailwind SVG flag icons.  
**Project Type**: Single Page Web Application (SPA)  
**Performance Goals**: Core Web Vitals optimized: LCP under 2.5 seconds, INP under 200ms, stable 60fps rendering during animations.  
**Constraints**: Canvas rendering active only during interactions/transitions to conserve battery/GPU; Texture sizing capped at 256x256.  
**Scale/Scope**: 12 Groups (A to L), 48 National Teams, 104 Matches total, Round of 32 down to the Final.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle 1**: Clean Separation of Concerns (WebGL/Three.js code isolated in separate classes/factories, leaving DOM layer clean).
- **Principle 2**: Accessibility & Reliability (Fallback to static flags/2D components if WebGL2 is unsupported or failed to load).
- **Principle 3**: Performance First (Texture compression, on-demand render loops).

All core requirements are met. No deviations or complexity bypasses are registered.

## Project Structure

### Documentation (this feature)

```text
specs/001-tournament-app-features/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
```

### Source Code (repository root)

```text
src/
├── domain/                      # Domain logic
│   └── entities/                # Core entities (Match, Team, Standings, Sticker)
├── infrastructure/              # API and DB services
│   ├── ai/                      # Firebase AI Logic & Agent integrations
│   └── db/                      # Firestore listeners and queries
├── ui/                          # Frontend presentation layer
│   ├── components/              # 2D Tailwind components (standings tables, search)
│   ├── animations/              # 3D Animation Layer (WebGL)
│   │   ├── SceneManager.js      # Coordinates scenes, cameras, renderers
│   │   ├── FlagFactory.js       # Builds 3D plane meshes with wave vertex shaders
│   │   └── InteractionManager.js# Bridges DOM clicks/hovers to 3D triggers
│   └── views/                   # Main screens (Dashboard, Prediction, Sticker, Search)
├── resources/                   # Static mock data & assets
└── tests/                       # Automated tests (Unit, E2E)
```

**Structure Decision**: Clean Architecture with separated `ui/animations/` module representing the 3D presentation layer. This isolates WebGL dependencies from the DOM UI component hierarchy.

## Complexity Tracking

*No current violations.*
