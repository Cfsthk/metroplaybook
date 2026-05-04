import { Fragment, useEffect, useState } from 'react'
import { getEntityPositionAtFrame } from '../lib/timeline'
import type { Entity, GridPosition, Play } from '../types/playbook'

interface FieldGridProps {
  play: Play
  selectedEntityId: string
  playheadFrame: number
  isPlaying: boolean
  editingThought: { entityId: string; frame: number } | null
  editingThoughtText: string
  onSelectEntity: (entityId: string) => void
  onPlaceEntity: (position: GridPosition) => void
  onOpenThought: (entityId: string) => void
  onThoughtTextChange: (text: string) => void
  onSaveThought: () => void
  onCancelThought: () => void
}

export function FieldGrid({
  play,
  selectedEntityId,
  playheadFrame,
  isPlaying,
  editingThought,
  editingThoughtText,
  onSelectEntity,
  onPlaceEntity,
  onOpenThought,
  onThoughtTextChange,
  onSaveThought,
  onCancelThought,
}: FieldGridProps) {
  const endZoneDepth = 4
  const [draggingEntityId, setDraggingEntityId] = useState<string | null>(null)
  const [hoverCell, setHoverCell] = useState<GridPosition | null>(null)

  const cells = Array.from({ length: play.field.width * play.field.height }, (_, index) => {
    const x = index % play.field.width
    const y = Math.floor(index / play.field.width)

    return { x, y }
  })

    const selectedPosition = selectedEntityId
    ? getEntityPositionAtFrame(play, selectedEntityId, playheadFrame)
    : null
  const hoverCells = hoverCell ? getPreviewCells(hoverCell, play.field.width, play.field.height) : []
  const activeEntityId = draggingEntityId ?? selectedEntityId

  useEffect(() => {
    const clearDrag = () => {
      setDraggingEntityId(null)
      setHoverCell(null)
    }

    window.addEventListener('pointerup', clearDrag)

    return () => window.removeEventListener('pointerup', clearDrag)
  }, [])

  const commitPlacement = (position: GridPosition) => {
    if (isPlaying) {
      return
    }

    onPlaceEntity(position)
    setDraggingEntityId(null)
    setHoverCell(null)
  }

  return (
    <section className="field-panel">
      <div className="field-wrapper">
        <div
          className="field-grid"
          style={{
            ['--field-columns' as string]: play.field.width,
            ['--field-rows' as string]: play.field.height,
            gridTemplateColumns: `repeat(${play.field.width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${play.field.height}, minmax(0, 1fr))`,
            aspectRatio: `${play.field.width} / ${play.field.height}`,
          }}
        >
          <div
            className="end-zone-line end-zone-line-top"
            style={{ top: `calc(1rem + (${endZoneDepth} / ${play.field.height}) * (100% - 2rem))` }}
            aria-hidden="true"
          />
          <div
            className="end-zone-line end-zone-line-bottom"
            style={{ top: `calc(1rem + (${play.field.height - endZoneDepth} / ${play.field.height}) * (100% - 2rem))` }}
            aria-hidden="true"
          />

          {cells.map((cell) => {
            const isHot = selectedPosition?.x === cell.x && selectedPosition?.y === cell.y
            const isHover = hoverCells.some((previewCell) => previewCell.x === cell.x && previewCell.y === cell.y)

            return (
              <button
                key={`${cell.x}-${cell.y}`}
                type="button"
                className={`cell-button${isHot ? ' hot playhead' : ''}${isHover ? ' hover' : ''}`}
                onClick={() => {
                  if (!draggingEntityId) {
                    commitPlacement(cell)
                  }
                }}
                onPointerEnter={() => {
                  if (draggingEntityId) {
                    setHoverCell(cell)
                  }
                }}
                onPointerUp={() => {
                  if (draggingEntityId) {
                    commitPlacement(cell)
                  }
                }}
                aria-label={`Move selected entity to column ${cell.x + 1}, row ${cell.y + 1}`}
              />
            )
          })}

          <div className="entity-layer">
            {play.entities.map((entity) => {
              const pos = getEntityPositionAtFrame(play, entity.id, playheadFrame)
              const message = (play.entityMessages ?? {})[`${entity.id}:${playheadFrame}`] ?? ''
              const isEditingThis = editingThought?.entityId === entity.id

              return (
                <Fragment key={entity.id}>
                  <EntityToken
                    entity={entity}
                    position={pos}
                    selected={entity.id === selectedEntityId}
                    disabled={isPlaying}
                    onClick={() => {
                      onSelectEntity(entity.id)
                      onOpenThought(entity.id)
                    }}
                    onPointerDown={() => {
                      if (isPlaying) return
                      onSelectEntity(entity.id)
                      setDraggingEntityId(entity.id)
                      setHoverCell(pos)
                    }}
                  />
                  {(message || isEditingThis) && (
                    <div
                      className="thought-bubble-anchor"
                      style={{
                        left: `calc((${pos.x} + 1) * (100% / var(--field-columns)))`,
                        top: `calc((${pos.y} + 1) * (100% / var(--field-rows)))`,
                      }}
                    >
                      {isEditingThis ? (
                        <div className="thought-bubble thought-bubble--edit">
                          <textarea
                            className="thought-textarea"
                            value={editingThoughtText}
                            onChange={(e) => onThoughtTextChange(e.target.value)}
                            placeholder="Add a thought…"
                            rows={2}
                            autoFocus
                          />
                          <div className="thought-bubble-actions">
                            <button type="button" className="button" onClick={onSaveThought} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem' }}>Save</button>
                            <button type="button" className="ghost-button" onClick={onCancelThought} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="thought-bubble">
                          <p>{message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function getPreviewCells(position: GridPosition, fieldWidth: number, fieldHeight: number) {
  return [
    position,
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y + 1 },
    { x: position.x + 1, y: position.y + 1 },
  ].filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < fieldWidth && cell.y < fieldHeight)
}

interface EntityTokenProps {
  entity: Entity
  position: GridPosition
  selected: boolean
  disabled: boolean
  onClick: () => void
  onPointerDown: () => void
}

function EntityToken({ entity, position, selected, disabled, onClick, onPointerDown }: EntityTokenProps) {
  return (
    <button
      type="button"
      className={`token ${entity.role}${selected ? ' selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      style={{
        left: `calc((${position.x} + 1) * (100% / var(--field-columns)))`,
        top: `calc((${position.y} + 1) * (100% / var(--field-rows)))`,
        background: entity.color,
      }}
      aria-label={`Select ${entity.label}`}
    >
      {entity.avatarUrl ? (
        <img className="token-avatar" src={entity.avatarUrl} alt={entity.label} draggable={false} />
      ) : (
        <span className="token-label">{entity.shortLabel}</span>
      )}
    </button>
  )
}