import React, { useEffect, useRef, useState } from 'react'
import type { Shape, RectShape, CircleShape } from '../types/shapes'

type PreviewRect = {
	type: 'rect'
	x: number
	y: number
	width: number
	height: number
	rotation: number
	fill?: string
	stroke?: string
}

type PreviewCircle = {
	type: 'circle'
	x: number
	y: number
	radius: number
	rotation: number
	fill?: string
	stroke?: string
}

type DraftShape = PreviewRect | PreviewCircle

type Props = {
	shapes: Shape[]
	// called when user clicks/selects existing shape
	onSelect?: (id: string | null) => void
	// drawing tool
	tool?: 'select' | 'rect' | 'circle'
	// called when a drawn shape should be committed (pointerup)
	onCommitShape?: (shape: DraftShape) => void
	// called to update an existing shape (e.g., resize)
	onUpdate?: (id: string, patch: Partial<Shape>) => void
	width?: number
	height?: number
}

type RenderRect = Pick<RectShape, 'type' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'fill' | 'stroke'>
type RenderCircle = Pick<CircleShape, 'type' | 'x' | 'y' | 'radius' | 'rotation' | 'fill' | 'stroke'>

function drawRect(ctx: CanvasRenderingContext2D, s: RenderRect) {
	ctx.save()
	ctx.translate(s.x, s.y)
	ctx.rotate((s.rotation * Math.PI) / 180)
	if (s.fill) ctx.fillStyle = s.fill
	ctx.strokeStyle = s.stroke || '#000'
	if (s.fill) ctx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height)
	ctx.strokeRect(-s.width / 2, -s.height / 2, s.width, s.height)
	ctx.restore()
}

function drawCircle(ctx: CanvasRenderingContext2D, s: RenderCircle) {
	ctx.save()
	ctx.translate(s.x, s.y)
	ctx.rotate((s.rotation * Math.PI) / 180)
	ctx.strokeStyle = s.stroke || '#000'
	ctx.beginPath()
	ctx.arc(0, 0, s.radius, 0, Math.PI * 2)
	ctx.stroke()
	ctx.restore()
}

export default function CanvasEditor({ shapes, onSelect, tool = 'select', onCommitShape, onUpdate, width = 800, height = 600 }: Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const [selected, setSelected] = useState<string | null>(null)
	const [isDrawing, setIsDrawing] = useState(false)
	const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
	const [preview, setPreview] = useState<DraftShape | null>(null)
	const [resizing, setResizing] = useState<
		| null
		| {
			shapeId: string
			handleIndex: number // 0..7 as defined in getRectHandles
			rotationRad: number
			oppositeWorld: { x: number; y: number }
		}
	>(null)
	const [dragging, setDragging] = useState<
		| null
		| {
			shapeId: string
			startPointer: { x: number; y: number }
			startShapePos: { x: number; y: number }
		}
	>(null)

	function angleToCursor(angleRad: number): CanvasCursor {
		// Normalize to [0, 2π)
		let a = angleRad % (Math.PI * 2)
		if (a < 0) a += Math.PI * 2
		const deg = (a * 180) / Math.PI
		// Map to nearest axis/diagonal (every 45deg)
		if ((deg >= 337.5 && deg < 360) || (deg >= 0 && deg < 22.5) || (deg >= 157.5 && deg < 202.5)) return 'ew-resize'
		if ((deg >= 67.5 && deg < 112.5) || (deg >= 247.5 && deg < 292.5)) return 'ns-resize'
		if ((deg >= 22.5 && deg < 67.5) || (deg >= 202.5 && deg < 247.5)) return 'nwse-resize'
		return 'nesw-resize'
	}

	type CanvasCursor = 'default' | 'pointer' | 'crosshair' | 'move' | 'ns-resize' | 'ew-resize' | 'nwse-resize' | 'nesw-resize'

	function getRectHandles(sel: Extract<Shape, { type: 'rect' }>) {
		const w = sel.width
		const h = sel.height
		const halfW = w / 2
		const halfH = h / 2
		const localPts = [
			{ x: -halfW, y: -halfH },
			{ x: 0, y: -halfH },
			{ x: halfW, y: -halfH },
			{ x: halfW, y: 0 },
			{ x: halfW, y: halfH },
			{ x: 0, y: halfH },
			{ x: -halfW, y: halfH },
			{ x: -halfW, y: 0 },
		]
		const rot = (sel.rotation * Math.PI) / 180
		const cos = Math.cos(rot)
		const sin = Math.sin(rot)
		return localPts.map((p) => {
			const worldX = sel.x + p.x * cos - p.y * sin
			const worldY = sel.y + p.x * sin + p.y * cos
			const angle = Math.atan2(worldY - sel.y, worldX - sel.x)
			return { x: worldX, y: worldY, cursor: angleToCursor(angle) as CanvasCursor }
		})
	}

	function getRectOppositeLocal(sel: Extract<Shape, { type: 'rect' }>, handleIndex: number) {
		const halfW = sel.width / 2
		const halfH = sel.height / 2
		switch (handleIndex) {
			case 0: return { x: halfW, y: halfH } // TL opposite BR
			case 1: return { x: 0, y: halfH } // T opposite B
			case 2: return { x: -halfW, y: halfH } // TR opposite BL
			case 3: return { x: -halfW, y: 0 } // R opposite L
			case 4: return { x: -halfW, y: -halfH } // BR opposite TL
			case 5: return { x: 0, y: -halfH } // B opposite T
			case 6: return { x: halfW, y: -halfH } // BL opposite TR
			case 7: return { x: halfW, y: 0 } // L opposite R
			default: return { x: 0, y: 0 }
		}
	}

	function getCircleHandles(sel: Extract<Shape, { type: 'circle' }>) {
		const rot = (sel.rotation * Math.PI) / 180
		const points = [] as { x: number; y: number; cursor: CanvasCursor }[]
		for (let i = 0; i < 8; i++) {
			const a = rot + (i * Math.PI) / 4
			const x = sel.x + Math.cos(a) * sel.radius
			const y = sel.y + Math.sin(a) * sel.radius
			points.push({ x, y, cursor: angleToCursor(a) })
		}
		return points
	}

	// single render effect: draws shapes, preview, and selection in the right order
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')!
		ctx.clearRect(0, 0, canvas.width, canvas.height)

		// draw in z-order (array order)
		// console.log('shapes to draw:', shapes);
		shapes.forEach((s) => {
			console.log('drawing shape', s);
			if (s.type === 'rect') drawRect(ctx, s)
			else drawCircle(ctx, s)
		})

		// draw preview on top if present
		if (preview) {
			ctx.save()
			ctx.globalAlpha = 0.8
			if (preview.type === 'rect') drawRect(ctx, preview)
			if (preview.type === 'circle') drawCircle(ctx, preview)
			ctx.restore()
		}

		// draw selection if present
		if (selected) {
			const sel = shapes.find((x) => x.id === selected)
			if (sel) {
				ctx.save()
				ctx.strokeStyle = 'rgba(0,0,0,0.6)'
				ctx.lineWidth = 2
				if (sel.type === 'rect') {
					const w = sel.width
					const h = sel.height
					ctx.translate(sel.x, sel.y)
					ctx.rotate((sel.rotation * Math.PI) / 180)

					// 8 resize handles: corners and midpoints (in local, rotated space)
					const halfW = w / 2
					const halfH = h / 2
					const handlePoints = [
						{ x: -halfW, y: -halfH }, // top-left
						{ x: 0, y: -halfH }, // top-center
						{ x: halfW, y: -halfH }, // top-right
						{ x: halfW, y: 0 }, // mid-right
						{ x: halfW, y: halfH }, // bottom-right
						{ x: 0, y: halfH }, // bottom-center
						{ x: -halfW, y: halfH }, // bottom-left
						{ x: -halfW, y: 0 }, // mid-left
					]
					handlePoints.forEach((p) => {
						ctx.beginPath()
						ctx.fillStyle = '#fff'
						ctx.strokeStyle = '#000'
						ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
						ctx.fill()
						ctx.stroke()
					})
				} else {
					// 8 handles around the circle, evenly spaced (every 45 degrees), respecting rotation
					ctx.translate(sel.x, sel.y)
					ctx.rotate((sel.rotation * Math.PI) / 180)
					const r = sel.radius
					for (let i = 0; i < 8; i++) {
						const angle = (i * Math.PI) / 4 // 0,45,90,...,315 degrees
						const px = Math.cos(angle) * r
						const py = Math.sin(angle) * r
						ctx.beginPath()
						ctx.fillStyle = '#fff'
						ctx.strokeStyle = '#000'
						ctx.arc(px, py, 5, 0, Math.PI * 2)
						ctx.fill()
						ctx.stroke()
					}
				}
				ctx.restore()
			}
		}
	}, [shapes, selected, preview])

	// basic hit testing (bounding box for rect, circle distance for circle)
	function hitTest(x: number, y: number) {
		for (let i = shapes.length - 1; i >= 0; i--) {
			const s = shapes[i]
			if (s.type === 'rect') {
				// for simplicity, use axis-aligned bounds (no rotation hit-test yet)
				const left = s.x - s.width / 2
				const right = s.x + s.width / 2
				const top = s.y - s.height / 2
				const bottom = s.y + s.height / 2
				if (x >= left && x <= right && y >= top && y <= bottom) return s.id
			} else {
				const dx = x - s.x
				const dy = y - s.y
				if (dx * dx + dy * dy <= s.radius * s.radius) return s.id
			}
		}
		return null
	}

	function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
		const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		if (tool === 'rect' || tool === 'circle') {
			// begin drawing
			setIsDrawing(true)
			setStartPoint({ x, y })
			setPreview(
				tool === 'rect'
					? { type: 'rect', x, y, width: 0, height: 0, rotation: 0, stroke: '#000' }
					: { type: 'circle', x, y, radius: 0, rotation: 0, stroke: '#000' },
			)
			return
		}

		// If we have a selected shape, check if a handle is pressed to start resizing
		if (selected) {
			const sel = shapes.find((s) => s.id === selected)
			if (sel) {
				const hitRadius = 8
				if (sel.type === 'rect') {
					const handles = getRectHandles(sel)
					for (let i = 0; i < handles.length; i++) {
						const h = handles[i]
						const dx = x - h.x
						const dy = y - h.y
						if (dx * dx + dy * dy <= hitRadius * hitRadius) {
							const rotationRad = (sel.rotation * Math.PI) / 180
							const oppLocal = getRectOppositeLocal(sel, i)
							const cos = Math.cos(rotationRad)
							const sin = Math.sin(rotationRad)
							const oppWorld = { x: sel.x + oppLocal.x * cos - oppLocal.y * sin, y: sel.y + oppLocal.x * sin + oppLocal.y * cos }
							setResizing({ shapeId: sel.id, handleIndex: i, rotationRad, oppositeWorld: oppWorld })
							return
						}
					}
				} else if (sel.type === 'circle') {
					const handles = getCircleHandles(sel)
					for (let i = 0; i < handles.length; i++) {
						const h = handles[i]
						const dx = x - h.x
						const dy = y - h.y
						if (dx * dx + dy * dy <= hitRadius * hitRadius) {
							const rotationRad = (sel.rotation * Math.PI) / 180
							setResizing({ shapeId: sel.id, handleIndex: i, rotationRad, oppositeWorld: { x: sel.x, y: sel.y } })
							return
						}
					}
				}

				// If we clicked on the selected shape (not on a handle), start dragging
				const hitId = hitTest(x, y)
				if (hitId === selected) {
					setDragging({
						shapeId: selected,
						startPointer: { x, y },
						startShapePos: { x: sel.x, y: sel.y },
					})
					return
				}
			}
		}

		const hit = hitTest(x, y)
		setSelected(hit)
		onSelect?.(hit)
	}

	function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
		const canvas = canvasRef.current
		if (!canvas) return
		const rect = canvas.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		// Dragging logic when moving a selected shape
		if (dragging) {
			const dx = x - dragging.startPointer.x
			const dy = y - dragging.startPointer.y
			const newX = dragging.startShapePos.x + dx
			const newY = dragging.startShapePos.y + dy
			onUpdate?.(dragging.shapeId, { x: newX, y: newY })
			return
		}

		// Resizing logic when dragging a handle on a rectangle
		if (resizing) {
			const sel = shapes.find((s) => s.id === resizing.shapeId)
			if (sel && sel.type === 'rect') {
				// transform pointer and opposite world point to local space of the rect
				const cos = Math.cos(resizing.rotationRad)
				const sin = Math.sin(resizing.rotationRad)
				const px = x - sel.x
				const py = y - sel.y
				const localX = px * cos + py * sin
				const localY = -px * sin + py * cos
				const oppPx = resizing.oppositeWorld.x - sel.x
				const oppPy = resizing.oppositeWorld.y - sel.y
				const oppLocalX = oppPx * cos + oppPy * sin
				const oppLocalY = -oppPx * sin + oppPy * cos

				// compute new local center as midpoint between dragged local point and fixed opposite local point
				let centerLocalX = (localX + oppLocalX) / 2
				let centerLocalY = (localY + oppLocalY) / 2
				let newHalfW = sel.width / 2
				let newHalfH = sel.height / 2

				switch (resizing.handleIndex) {
					case 0: // TL
					case 2: // TR
					case 4: // BR
					case 6: { // BL
						newHalfW = Math.max(Math.abs(localX - oppLocalX) / 2, 1)
						newHalfH = Math.max(Math.abs(localY - oppLocalY) / 2, 1)
						break
					}
					case 1: // top
					case 5: { // bottom
						centerLocalX = 0
						newHalfH = Math.max(Math.abs(localY - oppLocalY) / 2, 1)
						newHalfW = sel.width / 2
						break
					}
					case 3: // right
					case 7: { // left
						centerLocalY = 0
						newHalfW = Math.max(Math.abs(localX - oppLocalX) / 2, 1)
						newHalfH = sel.height / 2
						break
					}
				}

				// transform center back to world space
				const worldCX = sel.x + centerLocalX * cos - centerLocalY * sin
				const worldCY = sel.y + centerLocalX * sin + centerLocalY * cos

				onUpdate?.(sel.id, { x: worldCX, y: worldCY, width: newHalfW * 2, height: newHalfH * 2 })
			} else if (sel && sel.type === 'circle') {
				// Keep center fixed; compute new radius from center to pointer
				const dx = x - sel.x
				const dy = y - sel.y
				const newRadius = Math.max(1, Math.sqrt(dx * dx + dy * dy))
				onUpdate?.(sel.id, { radius: newRadius })
			}
			return
		}

		// When drawing, update preview
		if (isDrawing && startPoint) {
			if (tool === 'rect') {
				const dx = x - startPoint.x
				const dy = y - startPoint.y
				const w = Math.abs(dx)
				const h = Math.abs(dy)
				const cx = startPoint.x + dx / 2
				const cy = startPoint.y + dy / 2
				setPreview({ type: 'rect', x: cx, y: cy, width: w, height: h, rotation: 0, fill: '', stroke: '#000' })
			} else if (tool === 'circle') {
				const dx = x - startPoint.x
				const dy = y - startPoint.y
				const r = Math.sqrt(dx * dx + dy * dy)
				setPreview({ type: 'circle', x: startPoint.x, y: startPoint.y, radius: r, rotation: 0, fill: '#f58', stroke: '#000' })
			}
			return
		}

		// Not drawing: update cursor when hovering handles or body of selected shape
		let cursor: CanvasCursor = 'default'
		if (selected) {
			const sel = shapes.find((s) => s.id === selected)
			if (sel) {
				const handles = sel.type === 'rect' ? getRectHandles(sel) : getCircleHandles(sel)
				const hitRadius = 8
				let overHandle = false
				for (const h of handles) {
					const dx = x - h.x
					const dy = y - h.y
					if (dx * dx + dy * dy <= hitRadius * hitRadius) {
						cursor = h.cursor
						overHandle = true
						break
					}
				}
				// If not over a handle but over the shape body, show move cursor
				if (!overHandle && hitTest(x, y) === selected) {
					cursor = 'move'
				}
			}
		}
		canvas.style.cursor = cursor
	}

	function handlePointerUp() {
		const canvas = canvasRef.current
		if (canvas) canvas.style.cursor = 'default'
		if (dragging) {
			setDragging(null)
			return
		}
		if (resizing) {
			setResizing(null)
			return
		}
		if (isDrawing && preview) {
			setIsDrawing(false)
			setStartPoint(null)
			// commit
			onCommitShape?.(preview)
			setPreview(null)
		}
	}

	return (
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			style={{ border: '1px solid #ddd', touchAction: 'none' }}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		/>
	)
}
