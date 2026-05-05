import { PRE_FRAME, describeSegment, getEntitySegments, getFrameLabel } from '../lib/timeline'
import type { Play } from '../types/playbook'

interface TimelineEditorProps {
  play: Play
  frameCount: number
  playheadFrame: number
  selectedEntityId: string
  editingFrame: number | null
  selectedSegmentId: string | null
  onSelectFrame: (frame: number) => void
  onSelectEntity: (entityId: string) => void
  onSelectSegment: (id: string | null) => void
  onFrameHeaderClick: (frame: number) => void
}

export function TimelineEditor({
  play,
  frameCount,
  playheadFrame,
  selectedEntityId,
  editingFrame,
  selectedSegmentId,
  onSelectFrame,
  onSelectEntity,
  onSelectSegment,
  onFrameHeaderClick,
}: TimelineEditorProps) {
  const frames = [PRE_FRAME, ...Array.from({ length: frameCount }, (_, frame) => frame)]

  return (
    <div className="timeline-panel">
      <div className="timeline-scroll">
        <div className="timeline-grid" style={{ ['--frame-count' as string]: frames.length }}>
          <div className="timeline-header">
            <div className="timeline-label">Entity</div>
            {frames.map((frame) => {
              const hasNote = !!play.frameDescriptions?.[String(frame)]
              const isEditing = editingFrame === frame
              const classes = [
                'timeline-frame-label',
                frame === PRE_FRAME ? 'setup' : '',
                isEditing ? 'editing' : '',
                hasNote ? 'has-note' : '',
              ].filter(Boolean).join(' ')
              return (
                <button
                  key={frame}
                  type="button"
                  className={classes}
                  title={`${hasNote ? 'Edit' : 'Add'} instruction for ${getFrameLabel(frame)}`}
                  onClick={() => onFrameHeaderClick(frame)}
                >
                  {getFrameLabel(frame)}
                </button>
              )
            })}
          </div>

          {play.entities.map((entity) => {
            const segments = getEntitySegments(play, entity.id)

            return (
              <div key={entity.id} className="timeline-row">
                <button
                  type="button"
                  className={`timeline-label${selectedEntityId === entity.id ? ' active' : ''}`}
                  onClick={() => onSelectEntity(entity.id)}
                >
                  {entity.shortLabel}
                </button>

                {frames.map((frame) => {
                  const activeSegment = segments.find((segment) => {
                    return frame >= segment.startFrame && frame < segment.startFrame + segment.duration
                  })
                  const isSetupFrame = frame === PRE_FRAME
                  const isSelectedSegment = !!activeSegment && activeSegment.id === selectedSegmentId

                  const classes = [
                    'timeline-cell',
                    isSetupFrame ? 'setup' : '',
                    activeSegment ? 'filled' : '',
                    playheadFrame === frame ? 'current' : '',
                    isSelectedSegment ? 'segment-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <button
                      key={`${entity.id}-${frame}`}
                      type="button"
                      className={classes}
                      style={{
                        background: isSetupFrame ? `${entity.color}26` : activeSegment ? entity.color : undefined,
                        opacity: activeSegment ? 0.92 : 1,
                      }}
                      title={
                        isSetupFrame
                          ? `Edit setup position for ${entity.label}`
                          : activeSegment
                            ? `${describeSegment(activeSegment)} — click to select, Del to delete`
                            : `Go to frame ${frame}`
                      }
                      onClick={() => {
                        if (activeSegment) {
                          onSelectSegment(activeSegment.id === selectedSegmentId ? null : activeSegment.id)
                        } else {
                          onSelectSegment(null)
                        }
                        onSelectFrame(frame)
                      }}
                    >
                      {isSetupFrame ? 'S' : activeSegment ? frame - activeSegment.startFrame + 1 : ''}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="timeline-caption">
        <span>
          Setup happens in <code>PRE</code> before frame <code>00</code> starts.
        </span>
        <span>
          Player timing uses <code>1 grid = 1 frame</code>.
        </span>
        <span>
          Disc timing uses a faster multiplier for passes and swings.
        </span>
      </div>
    </div>
  )
}