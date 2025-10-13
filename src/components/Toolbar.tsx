type Props = {
	tool: 'select' | 'rect' | 'circle'
	onSetTool: (t: 'select' | 'rect' | 'circle') => void
	onDelete: () => void
	onBringForward: () => void
	onSendBackward: () => void
}

export default function Toolbar({ tool, onSetTool, onDelete, onBringForward, onSendBackward }: Props) {
	return (
		<div style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'center' }}>
			{/* Tool selection */}
			<button onClick={() => onSetTool('select')} style={{ fontWeight: tool === 'select' ? 'bold' : 'normal' }}>
				Select
			</button>
			<button onClick={() => onSetTool('rect')} style={{ fontWeight: tool === 'rect' ? 'bold' : 'normal' }}>
				Draw Rect
			</button>
			<button onClick={() => onSetTool('circle')} style={{ fontWeight: tool === 'circle' ? 'bold' : 'normal' }}>
				Draw Circle
			</button>
			<button onClick={onDelete}>Delete</button>
			<button onClick={onBringForward}>Bring Forward</button>
			<button onClick={onSendBackward}>Send Backward</button>
		</div>
	)
}
