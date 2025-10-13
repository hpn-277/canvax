export type ShapeType = 'rect' | 'circle'

export interface BaseShape {
  id: string
  type: ShapeType
  x: number
  y: number
  rotation: number
  fill?: string
  stroke?: string
  zIndex: number
}

export interface RectShape extends BaseShape {
  type: 'rect'
  width: number
  height: number
}

export interface CircleShape extends BaseShape {
  type: 'circle'
  radius: number
}

export type Shape = RectShape | CircleShape
