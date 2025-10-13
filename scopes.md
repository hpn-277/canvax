# Canvas Editor — Implementation Plan

This document is a scoped, actionable plan to implement a Canva-like editor in this repository. It breaks the work down into milestones, tasks, acceptance criteria, and testing/quality gates. Each task is written as a markdown checkbox you can toggle when completed.

## Goal / Contract
- Inputs: user mouse/touch events and UI controls
- Outputs: an interactive canvas where users can add, select, move, resize, rotate, and delete rectangle and circle elements. A selection-mode button toggles selection interaction.
- Error modes: invalid transforms (nan/inf), out-of-bounds moves, overlapping UI controls; the app should clamp or ignore invalid values and keep UI responsive.
- Success criteria: basic editing features (add/move/resize/rotate/delete/select) work for both mouse and touch, selection shows bounding box and rotate/resize handles, stack order (bring forward / send backward) works, and unit/smoke tests validate core behaviors.

## Assumptions
- We'll implement a single-page app using the existing Vite + React TypeScript project in this workspace.
- We'll use the native HTML5 Canvas API (2D context) for rendering and implement interaction (hit testing, transforms, handles) in React. This means writing a small interaction layer for selection, dragging, resizing, rotating, and rendering shapes. Fabric.js or Konva are alternatives, but native Canvas keeps the dependency surface minimal and gives full control.
- Minimal UI: toolbar with Add Rectangle, Add Circle, Selection Mode (toggle), Bring Forward, Send Backward, Delete, and a properties panel (later).

## Tech choices (recommendation)
- React + TypeScript (already in project)
- Native HTML5 Canvas 2D API for drawing + small utility modules for hit-testing and transforms (no external canvas renderer dependency required)
- Simple state management via React useState/useReducer (no heavy library)
- Optional: zod or TypeScript types for element validation

## High-level milestones
1. Project scaffolding & dependencies
2. Canvas + shapes rendering
3. Add / Delete shapes UI
4. Selection mode and selection button
5. Move / drag
6. Resize & rotate with handles (Transformer)
7. Layer / z-index management
8. Mouse & touch interaction polish
9. Tests, lint, build checks, and documentation
10. Optional improvements & follow-ups

---

## Tasks (toggle as you finish)

### 1 — Project setup
- [ ] (No external canvas library) Ensure project dependencies are up-to-date. We will not add `konva` or `react-konva` — the editor will use the native Canvas API.
- [ ] Create a `src/components/CanvasEditor.tsx` component (main canvas host) that wraps an HTMLCanvasElement and coordinates rendering and interactions.
- [ ] Create small `src/components/Toolbar.tsx` for Add Rectangle, Add Circle, Selection Mode toggle, Delete, Bring Forward, Send Backward.
- [ ] Wire components in `src/App.tsx`.

Acceptance criteria
- The app builds and runs (dev server) with no runtime errors after installing deps.

### 2 — Shape model and types
- [ ] Define a TypeScript type for design elements (id, type: 'rect'|'circle', x, y, width, height, radius, rotation, fill, stroke, isLocked, zIndex).
- [ ] Implement a small generator for unique IDs and initial default shape properties.

Acceptance criteria
- Types compile; adding a shape creates a valid model instance.

### 3 — Render shapes on canvas
- [ ] Render rectangles and circles from the model using the Canvas 2D API (context2D). Implement modular draw functions like `drawRect(ctx, shape)` and `drawCircle(ctx, shape)`.
- [ ] Ensure shapes use model transforms (x, y, rotation) and z-order from model; redraw the full scene on state changes.

Acceptance criteria
- Adding shapes results in visible shapes on canvas at expected positions and sizes.

### 4 — Selection mode & selection button
- [ ] Add a Selection Mode toggle button in the toolbar.
- [ ] When selection mode is ON, clicking a shape selects it (sets selectedId in state) and shows selection bounding box (Konva.Transformer or custom overlay).
- [ ] Support multi-select modifier (optional): Shift+Click to select multiple shapes (stretch goal).

Acceptance criteria
- Clicking a shape when Selection Mode is active highlights it and displays resize/rotate handles.

### 5 — Move (drag)
- [ ] Make shapes draggable when selected or when selection mode is active (configurable).
- [ ] Update model position on drag end; support keyboard nudges (arrow keys) to move by 1/10 px increments.

Acceptance criteria
- Dragging updates the visual position and underlying model; undo/redo is optional.

### 6 — Resize & rotate with handles
- [ ] Implement a Transformer-like overlay: draw selection bounding boxes and handles (small squares/circles) in a separate overlay layer (either on the same canvas or on a transparent canvas/HTML layer above) and handle pointer interactions for resizing and rotating.
- [ ] Constrain minimum width/height and prevent negative sizes.
- [ ] For circles, map width/height to radius and keep the circle visually correct when resizing/rotating.

Acceptance criteria
- Using handles changes size and rotation; model updates reflect the transform precisely.

### 7 — Delete shape(s)
- [ ] Implement Delete button to remove selected shape(s) from model.
- [ ] Support Delete key on keyboard to remove selection.

Acceptance criteria
- Deleted items disappear and are removed from state.

### 8 — Layer management (z-order)
- [ ] Implement Bring Forward and Send Backward actions in the toolbar that update element zIndex or reorder array.
- [ ] Reflect z-order visually (stacking) immediately.

Acceptance criteria
- Reordering updates drawing order; bring forward sends shape one step up, send backward sends one step down.

### 9 — Mouse & touch interactions polish
- [ ] Ensure touch events (tap, drag) perform selection and drag.
- [ ] Improve hit-testing area: add small padding for easier touch selection.
- [ ] Clamp shapes to canvas boundaries or add scrolling/viewport support.

Acceptance criteria
- Interactions are smooth on touch devices (basic checks on mobile/touch emulator).

### 10 — Tests and quality gates
- [ ] Add unit tests for model functions (createShape, updateShape, reorderShapes) using vitest (or existing test runner).
- [ ] Add a small end-to-end smoke test that mounts the `CanvasEditor` and simulates adding and selecting a shape.
- [ ] Run TypeScript build, lint (if present), and tests as pre-commit or CI checks (optional).

Acceptance criteria
- Tests pass locally; build step succeeds.

### 11 — Documentation & README
- [ ] Document how to run the dev server, commands to install dependencies, and where to find main components (`CanvasEditor`, `Toolbar`).

Acceptance criteria
- README updated with new instructions.

---

## Edge cases & design considerations
- Minimum/maximum sizes and rotations (clamp values).
- Overlapping shapes: selection preference (top-most by z-order under pointer).
- Precision: store transforms in floats but format UI to friendly numbers.
- Performance: if many shapes are present, consider virtualization or optimization of redraw.

## Suggested file-level changes (high-level)
- package.json: no canvas-specific dependency required; keep dependencies minimal.
- src/components/CanvasEditor.tsx: new file hosting an HTMLCanvasElement; handle drawing, pointer events, hit-testing, selection overlay, and transforms.
- src/components/Toolbar.tsx: new file with control buttons and keyboard handlers.
- src/utils/draw.ts: helper functions for drawing shapes to a CanvasRenderingContext2D (e.g., drawRect, drawCircle, drawSelectionBox).
- src/utils/hitTest.ts: hit-testing helpers for pointer -> shape detection, point-in-rotated-rect, distance-to-circle, and z-order tie-breaking.
- src/types/shapes.ts: types and helper utilities for shapes.
- src/hooks/useShapes.ts: hook or useReducer for shape state management and actions (add/update/remove/reorder).
- src/components/SelectionOverlay.tsx: optional overlay for handles if you choose to draw handles in DOM instead of canvas.

## Minimal acceptance test scenarios
1. Add rectangle -> rectangle appears in center -> select -> resize -> rotated -> delete -> no errors.
2. Add circle -> dragged to new position -> bring forward/backward -> stacking changes.
3. Selection mode OFF -> clicking does not select (safe-mode), Selection Mode ON -> clicking selects.

## Quality gates checklist (for you to run)
- Build: npm run dev / npm run build (PASS/FAIL)
- Type check: tsc --noEmit (PASS/FAIL)
- Tests: npm test or vitest (PASS/FAIL)
- Manual smoke: Add/Select/Drag/Resize/Delete basic scenario (PASS/FAIL)

## Timeline (rough)
- Day 0.5 — install deps, render canvas and shapes
- Day 1 — selection, drag
- Day 0.5 — resize & rotation
- Day 0.5 — delete and layer controls
- Day 0.5 — touch polish and tests

## Next steps (concrete)
1. I will scaffold `src/components/CanvasEditor.tsx` and `src/components/Toolbar.tsx` that use the native Canvas API with minimal UI and wiring. (If you'd like, I can implement these next.)
2. If you want multi-select or grouping, mark that as a follow-up and I'll add it.

---

If you want, I can now implement the first milestone: install dependencies and add a minimal `CanvasEditor` and `Toolbar` with add-rectangle/add-circle and selection mode. Reply "Implement milestone 1" or ask for changes to this plan.
