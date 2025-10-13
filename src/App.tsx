import { useState } from 'react'
import './App.css'
import CanvasEditor from './components/CanvasEditor'
import Toolbar from './components/Toolbar'
import useShapes from './hooks/useShapes'

function App() {
  const { shapes, addRect, addCircle, remove, reorder } = useShapes([])
  const [selectMode] = useState(true)
  const [tool, setTool] = useState<'select' | 'rect' | 'circle'>('select')
  const [selected, setSelected] = useState<string | null>(null)

  function handleDelete() {
    if (selected) remove(selected)
    setSelected(null)
  }

  // bring forward / send backward simple implementations will be added later
  function handleBringForward() {
    if (!selected) return
    const idx = shapes.findIndex((s) => s.id === selected)
    if (idx === -1) return
    const to = Math.min(shapes.length - 1, idx + 1)
    if (to !== idx) reorder(idx, to)
  }
  function handleSendBackward() {
    if (!selected) return
    const idx = shapes.findIndex((s) => s.id === selected)
    if (idx === -1) return
    const to = Math.max(0, idx - 1)
    if (to !== idx) reorder(idx, to)
  }

  return (
    <div style={{ padding: 16 }}>
      <Toolbar tool={tool} onSetTool={setTool} onDelete={handleDelete} onBringForward={handleBringForward} onSendBackward={handleSendBackward} />
      <div style={{ marginTop: 12 }}>
        <CanvasEditor
          shapes={shapes}
          onSelect={(id) => {
            if (!selectMode) return
            setSelected(id)
          }}
          // drawing callbacks
          onCommitShape={(shape) => {
            // shape will be partial; use addRect/addCircle depending on type
            if ((shape as any).type === 'rect') {
              addRect({
                x: (shape as any).x,
                y: (shape as any).y,
                width: (shape as any).width,
                height: (shape as any).height,
              } as any)
            } else if ((shape as any).type === 'circle') {
              addCircle({ x: (shape as any).x, y: (shape as any).y, radius: (shape as any).radius } as any)
            }
          }}
          tool={tool}
        />
      </div>
    </div>
  )
}

export default App
