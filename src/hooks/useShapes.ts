import { useCallback, useReducer } from 'react'
import type { Shape, RectShape, CircleShape } from '../types/shapes'

type State = {
  shapes: Shape[]
}

type Action =
  | { type: 'add'; shape: Shape }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; patch: Partial<Shape> }
  | { type: 'reorder'; fromIndex: number; toIndex: number }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { shapes: [...state.shapes, action.shape] }
    case 'remove':
      return { shapes: state.shapes.filter((s) => s.id !== action.id) }
    case 'update':
      return {
        shapes: state.shapes.map((s) =>
          s.id === action.id ? (({ ...s, ...(action.patch as any) } as unknown) as Shape) : s,
        ),
      }
    case 'reorder': {
      const shapes = [...state.shapes]
      const [moved] = shapes.splice(action.fromIndex, 1)
      shapes.splice(action.toIndex, 0, moved)
      return { shapes }
    }
    default:
      return state
  }
}

let idCounter = 1
export function genId(prefix = 's') {
  return `${prefix}${idCounter++}`
}

export default function useShapes(initial: Shape[] = []) {
  const [state, dispatch] = useReducer(reducer, { shapes: initial })

  const addRect = useCallback((opts: Partial<RectShape> = {}) => {
    const rect: RectShape = {
      id: genId('r'),
      type: 'rect',
      x: opts.x ?? 100,
      y: opts.y ?? 100,
      width: opts.width ?? 120,
      height: opts.height ?? 80,
      rotation: opts.rotation ?? 0,
  fill: opts.fill ?? undefined,
      stroke: opts.stroke ?? '#000000',
      zIndex: opts.zIndex ?? 0,
    }
    dispatch({ type: 'add', shape: rect })
    return rect
  }, [])

  const addCircle = useCallback((opts: Partial<CircleShape> = {}) => {
    const c: CircleShape = {
      id: genId('c'),
      type: 'circle',
      x: opts.x ?? 200,
      y: opts.y ?? 200,
      radius: opts.radius ?? 50,
      rotation: opts.rotation ?? 0,
  fill: opts.fill ?? undefined,
      stroke: opts.stroke ?? '#000000',
      zIndex: opts.zIndex ?? 0,
    }
    dispatch({ type: 'add', shape: c })
    return c
  }, [])

  const remove = useCallback((id: string) => dispatch({ type: 'remove', id }), [])

  const update = useCallback((id: string, patch: Partial<Shape>) => dispatch({ type: 'update', id, patch }), [])

  const reorder = useCallback((fromIndex: number, toIndex: number) => dispatch({ type: 'reorder', fromIndex, toIndex }), [])

  return { shapes: state.shapes, addRect, addCircle, remove, update, reorder }
}
