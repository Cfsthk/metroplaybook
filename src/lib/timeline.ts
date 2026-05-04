import type {
  Entity,
  GridPosition,
  MovementSegment,
  Play,
} from '../types/playbook'

export const PLAYER_FRAMES_PER_CELL = 1
export const DISC_FRAMES_PER_CELL = 0.45
export const DEFAULT_TIMELINE_FRAMES = 36
export const PRE_FRAME = -1

export function manhattanDistance(from: GridPosition, to: GridPosition) {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
}

export function getSegmentEndFrame(segment: MovementSegment) {
  return segment.startFrame + segment.duration
}

export function getEntityById(play: Play, entityId: string) {
  return play.entities.find((entity) => entity.id === entityId)
}

export function getEntitySegments(play: Play, entityId: string) {
  return play.segments
    .filter((segment) => segment.entityId === entityId)
    .sort((left, right) => left.startFrame - right.startFrame)
}

export function getEntityPositionAtFrame(
  play: Play,
  entityId: string,
  frame: number,
) {
  const entity = getEntityById(play, entityId)

  if (!entity) {
    return { x: 0, y: 0 }
  }

  const segments = getEntitySegments(play, entityId)
  let currentPosition = entity.basePosition

  for (const segment of segments) {
    if (frame < segment.startFrame) {
      return currentPosition
    }

    const endFrame = getSegmentEndFrame(segment)

    if (frame >= endFrame) {
      currentPosition = segment.to
      continue
    }

    const progress = Math.max(0, Math.min(1, (frame - segment.startFrame) / segment.duration))

    return {
      x: Math.round(segment.from.x + (segment.to.x - segment.from.x) * progress),
      y: Math.round(segment.from.y + (segment.to.y - segment.from.y) * progress),
    }
  }

  return currentPosition
}

export function getMovementDuration(entity: Entity, from: GridPosition, to: GridPosition) {
  const cells = manhattanDistance(from, to)

  if (cells === 0) {
    return 0
  }

  const framesPerCell = entity.role === 'disc' ? DISC_FRAMES_PER_CELL : PLAYER_FRAMES_PER_CELL
  return Math.max(1, Math.ceil(cells * framesPerCell))
}

export function getTimelineFrameCount(play: Play) {
  const furthestFrame = play.segments.reduce(
    (maxFrame, segment) => Math.max(maxFrame, getSegmentEndFrame(segment)),
    0,
  )

  return Math.max(DEFAULT_TIMELINE_FRAMES, furthestFrame + 8)
}

export function buildMovementSegment(
  play: Play,
  entityId: string,
  frame: number,
  target: GridPosition,
) {
  const entity = getEntityById(play, entityId)

  if (!entity) {
    return null
  }

  const from = getEntityPositionAtFrame(play, entityId, frame)
  const duration = getMovementDuration(entity, from, target)

  if (duration === 0) {
    return null
  }

  return {
    id: `${entityId}-${frame}-${target.x}-${target.y}`,
    entityId,
    startFrame: frame,
    duration,
    from,
    to: target,
  } satisfies MovementSegment
}

export function upsertMovementSegment(play: Play, nextSegment: MovementSegment) {
  const retainedSegments = play.segments.filter((segment) => {
    if (segment.entityId !== nextSegment.entityId) {
      return true
    }

    return segment.startFrame < nextSegment.startFrame
  })

  return [...retainedSegments, nextSegment].sort(
    (left, right) => left.startFrame - right.startFrame,
  )
}

export function getFrameLabel(frame: number) {
  if (frame === PRE_FRAME) {
    return 'PRE'
  }

  return frame.toString().padStart(2, '0')
}

export function describeSegment(segment: MovementSegment) {
  return `${segment.from.x},${segment.from.y} -> ${segment.to.x},${segment.to.y}`
}

export function updateEntitySetupPosition(play: Play, entityId: string, target: GridPosition) {
  const earliestSegment = getEntitySegments(play, entityId)[0]

  return {
    ...play,
    entities: play.entities.map((entity) => {
      if (entity.id !== entityId) {
        return entity
      }

      return {
        ...entity,
        basePosition: target,
      }
    }),
    segments: play.segments.map((segment) => {
      if (segment.entityId !== entityId) {
        return segment
      }

      if (!earliestSegment || segment.id !== earliestSegment.id || segment.startFrame !== 0) {
        return segment
      }

      return {
        ...segment,
        from: target,
      }
    }),
  }
}