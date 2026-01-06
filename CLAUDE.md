# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canvax is a canvas-based drawing editor (Canva-like) built with React, TypeScript, and the native HTML5 Canvas 2D API. Users can create, select, move, resize, and manipulate rectangles and circles on an interactive canvas.

**Core Philosophy**: Minimal dependencies - uses native Canvas 2D API instead of libraries like Konva or Fabric.js for full rendering control.

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (TypeScript compilation + Vite build)
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### State Management Pattern

The app uses a **reducer pattern** with React hooks for shape management. All shape state lives in `useShapes` hook, which provides:
- Actions: `add`, `remove`, `update`, `reorder`
- Helper factories: `addRect()`, `addCircle()` with defaults
- Unique ID generation via `genId(prefix)`

### Canvas Rendering Architecture

**Single-pass rendering** in CanvasEditor's useEffect:
1. Clear canvas
2. Draw all shapes in z-order (array order)
3. Draw preview shape (if drawing)
4. Draw selection handles (if shape selected)

All shapes are rendered to a single canvas element - no DOM-based shape objects.

### Coordinate System

**All shapes use center-based coordinates:**
- Rectangles: `x, y` is the center, with `width` and `height`
- Circles: `x, y` is the center, with `radius`
- Rotation: applied around the shape's center point

**Transform workflow:**
1. `ctx.translate(x, y)` - move to shape center
2. `ctx.rotate(rotation)` - rotate around center
3. Draw shape in local space (e.g., rect from `-width/2, -height/2`)

### Resize Handle System

**8-handle layout** for both rectangles and circles:
- Rectangle: 4 corners + 4 edge midpoints
- Circle: 8 evenly-spaced points on circumference (every 45°)

**Resize algorithm** (rectangles):
- Tracks opposite corner/edge as fixed anchor point
- Transforms pointer and anchor to local (rotated) space
- Computes new dimensions from local coordinates
- Transforms new center back to world space
- Updates shape via `onUpdate` callback

**Cursor feedback**: Handles compute rotation-aware cursors (`ns-resize`, `ew-resize`, `nwse-resize`, `nesw-resize`) based on handle angle.

### Interaction Model

**Three interaction modes** (controlled by `tool` prop):
- `'select'`: Click to select, drag handles to resize
- `'rect'`: Click-drag to draw rectangle preview, commit on pointer up
- `'circle'`: Click-drag to draw circle preview, commit on pointer up

**Hit testing**:
- Rectangles: Axis-aligned bounding box (rotation not factored in hit test)
- Circles: Distance-based (pointer within radius)
- Z-order: Tests shapes from top to bottom (reverse array order)

### Component Responsibilities

**App.tsx** (Orchestration layer):
- Manages global state via `useShapes()`
- Handles tool selection
- Coordinates between CanvasEditor and Toolbar
- Implements shape lifecycle: commit draws, update resizes, delete selected

**CanvasEditor.tsx** (Rendering + interaction):
- Owns canvas element and 2D context
- Handles all pointer events (down/move/up)
- Manages drawing state (preview, selection, resizing)
- Renders shapes, handles, and previews
- Calls parent callbacks: `onSelect`, `onCommitShape`, `onUpdate`

**Toolbar.tsx** (UI controls):
- Provides tool/action buttons
- Emits events to parent (tool changes, delete, reorder)

**useShapes.ts** (State management):
- Reducer-based state with typed actions
- Shape factory functions with defaults
- ID generation (auto-incrementing counter)

### Type System

**Discriminated union** for shapes:
```typescript
type Shape = RectShape | CircleShape

interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
}

interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
}
```

TypeScript can narrow shape types via `type` property for type-safe operations.

## Key Implementation Details

### Drawing Functions

Located in `CanvasEditor.tsx`:
- `drawRect(ctx, shape)` - renders rectangle with center-based coords
- `drawCircle(ctx, shape)` - renders circle with center-based coords

Both handle transforms (translate, rotate) and styling (fill, stroke).

### Handle Computation

- `getRectHandles(shape)` - computes 8 world-space handle positions for rectangle
- `getCircleHandles(shape)` - computes 8 world-space handle positions for circle
- `getRectOppositeLocal(shape, handleIndex)` - finds opposite anchor point in local space
- `angleToCursor(angleRad)` - maps handle angle to appropriate resize cursor

### Layer Management

Z-order is determined by **array position** in shapes array:
- Earlier in array = behind
- Later in array = in front
- `reorder(fromIndex, toIndex)` swaps positions

## Implementation Plan

See `scopes.md` for the original implementation plan with milestones and acceptance criteria. The project follows a phased approach from scaffolding through testing.

## Code Patterns to Follow

**When adding new shape types:**
1. Extend the Shape discriminated union in `types/shapes.ts`
2. Add factory function in `useShapes.ts`
3. Add draw function in `CanvasEditor.tsx`
4. Add hit test logic in `hitTest()`
5. Add handle computation if resizable

**When modifying resize logic:**
- Resizing uses opposite corner/edge as anchor
- All computations in local (rotated) space
- Transform results back to world space
- Minimum size constraints applied in local space

**When working with canvas rendering:**
- Always `ctx.save()` before transforms
- Always `ctx.restore()` after to reset state
- Render order matters: shapes → preview → selection

- Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

- Use Context7 to check up-to-date docs when needed for implementing new libraries or frameworks, or adding features using them.