export type EntityRole = 'offense' | 'defense' | 'disc'

export interface GridPosition {
  x: number
  y: number
}

export interface Entity {
  id: string
  label: string
  shortLabel: string
  role: EntityRole
  color: string
  basePosition: GridPosition
  avatarUrl?: string
}

export interface MovementSegment {
  id: string
  entityId: string
  startFrame: number
  duration: number
  from: GridPosition
  to: GridPosition
}

export interface FieldDimensions {
  width: number
  height: number
}

export interface Play {
  id: string
  name: string
  notes: string
  field: FieldDimensions
  entities: Entity[]
  segments: MovementSegment[]
  frameDescriptions?: Record<string, string>
  entityMessages?: Record<string, string>
}

export interface Playbook {
  id: string
  name: string
  teamName: string
  description: string
  updatedAt: string
  owner: string
  collaborators: number
  imageLibrary?: string[]
  plays: Play[]
}

export interface PlaybookState {
  playbooks: Playbook[]
}