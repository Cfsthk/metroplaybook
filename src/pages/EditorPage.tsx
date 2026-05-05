import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FieldGrid } from '../components/FieldGrid'
import { InspectorPanel } from '../components/InspectorPanel'
import { TimelineEditor } from '../components/TimelineEditor'
import {
  PRE_FRAME,
  buildMovementSegment,
  getTimelineFrameCount,
  getFrameLabel,
  updateEntitySetupPosition,
  upsertMovementSegment,
} from '../lib/timeline'
import { loadPlaybookState, loadPlaybookStateAsync, savePlaybookState, savePlaybookStateAsync } from '../lib/storage'
import type { GridPosition, PlaybookState } from '../types/playbook'

export function EditorPage() {
  const { playbookId = '', playId = '' } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState<PlaybookState>(() => loadPlaybookState())
  const [isPlaysetListOpen, setIsPlaysetListOpen] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState('o1')
  const [playheadFrame, setPlayheadFrame] = useState(PRE_FRAME)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [_statusMessage, setStatusMessage] = useState('Select a frame, then drag a token or click a cell to place movement.')
  const [editingFrame, setEditingFrame] = useState<number | null>(null)
  const [editingDescription, setEditingDescription] = useState('')
  const [editingThought, setEditingThought] = useState<{ entityId: string; frame: number } | null>(null)
  const [editingThoughtText, setEditingThoughtText] = useState('')
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [renderFrame, setRenderFrame] = useState<number>(PRE_FRAME)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const frameCountRef = useRef(36)
  const playStartRef = useRef<{ time: number; frame: number } | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialStateRef = useRef(state)

  // Sync initial state from cloud on mount — only applies if user hasn't made local changes yet
  useEffect(() => {
    loadPlaybookStateAsync().then((cloudState) => {
      setState((prev) => prev === initialStateRef.current ? cloudState : prev)
    }).catch(() => {})
  }, [])

  // Debounced save: write to localStorage immediately, push to cloud after 1.5s idle
  useEffect(() => {
    savePlaybookState(state)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSyncStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      savePlaybookStateAsync(state)
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'))
    }, 1500)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [state])

  const playbook = state.playbooks.find((item) => item.id === playbookId)
  const play = playbook?.plays.find((item) => item.id === playId)

  useEffect(() => {
    if (!playbook || !play) {
      navigate('/')
    }
  }, [navigate, play, playbook])

  useEffect(() => {
    if (!play) {
      return
    }

    frameCountRef.current = getTimelineFrameCount(play)
  }, [play])

  // Delete selected segment on Delete/Backspace key
  useEffect(() => {
    if (!selectedSegmentId) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      e.preventDefault()
      setState((currentState) => ({
        playbooks: currentState.playbooks.map((pb) => {
          if (pb.id !== playbookId) return pb
          return {
            ...pb,
            plays: pb.plays.map((pl) => {
              if (pl.id !== playId) return pl
              return { ...pl, segments: pl.segments.filter((s) => s.id !== selectedSegmentId) }
            }),
          }
        }),
      }))
      setSelectedSegmentId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedSegmentId, playbookId, playId])

  // Sync renderFrame to playheadFrame when not playing
  useEffect(() => {
    if (!isPlaying) setRenderFrame(playheadFrame)
  }, [playheadFrame, isPlaying])

  // Smooth rAF-based playback — updates renderFrame at 60fps for sub-pixel token movement
  useEffect(() => {
    if (!isPlaying) {
      playStartRef.current = null
      return
    }

    const frameCount = frameCountRef.current
    const mspf = 380 / playbackSpeed
    const startFrame = playheadFrame === PRE_FRAME ? 0 : playheadFrame
    playStartRef.current = { time: performance.now(), frame: startFrame }
    let rafId: number

    const tick = (now: number) => {
      const ps = playStartRef.current
      if (!ps) return

      const rawFrame = ps.frame + (now - ps.time) / mspf
      const clampedFrame = Math.min(rawFrame, frameCount - 1)

      setRenderFrame(clampedFrame)
      setPlayheadFrame(Math.min(Math.floor(clampedFrame), frameCount - 1))

      if (clampedFrame >= frameCount - 1) {
        setIsPlaying(false)
        setPlayheadFrame(frameCount - 1)
        setRenderFrame(frameCount - 1)
        return
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playbackSpeed])

  useEffect(() => {
    if (isPlaying) {
      setStatusMessage(`Previewing ${play.name} from ${getFrameLabel(playheadFrame)} at ${playbackSpeed.toFixed(1)}x speed.`)
      return
    }

    const selectedEntity = play?.entities.find((entity) => entity.id === selectedEntityId)

    if (selectedEntity) {
      const frameLabel = getFrameLabel(playheadFrame)
      setStatusMessage(
        playheadFrame === PRE_FRAME
          ? `${selectedEntity.label} is in setup mode. Move them now to define the starting shape before frame 00.`
          : `Frame ${frameLabel}: ${selectedEntity.label} is ready for the next route segment.`,
      )
    }
  }, [isPlaying, play, playheadFrame, playbackSpeed, selectedEntityId])

  if (!playbook || !play) {
    return null
  }

  const frameCount = getTimelineFrameCount(play)

  const updateMovement = (target: GridPosition) => {
    if (playheadFrame === PRE_FRAME) {
      setState((currentState) => ({
        playbooks: currentState.playbooks.map((currentPlaybook) => {
          if (currentPlaybook.id !== playbook.id) {
            return currentPlaybook
          }

          return {
            ...currentPlaybook,
            updatedAt: new Date().toISOString(),
            plays: currentPlaybook.plays.map((currentPlay) => {
              if (currentPlay.id !== play.id) {
                return currentPlay
              }

              return updateEntitySetupPosition(currentPlay, selectedEntityId, target)
            }),
          }
        }),
      }))

      setStatusMessage(`Updated the setup position for ${selectedEntityId}. Playback will begin from this structure at frame 00.`)
      return
    }

    const nextSegment = buildMovementSegment(play, selectedEntityId, playheadFrame, target)

    if (!nextSegment) {
      setStatusMessage('That move does not change position, so no new segment was added.')
      return
    }

    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) {
          return currentPlaybook
        }

        return {
          ...currentPlaybook,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => {
            if (currentPlay.id !== play.id) {
              return currentPlay
            }

            return {
              ...currentPlay,
              segments: upsertMovementSegment(currentPlay, nextSegment),
            }
          }),
        }
      }),
    }))

    setPlayheadFrame(nextSegment.startFrame + nextSegment.duration)
    setStatusMessage(
      `Added ${nextSegment.duration} frame${nextSegment.duration === 1 ? '' : 's'} for ${selectedEntityId} starting at frame ${nextSegment.startFrame}.`,
    )
  }

  const stepFrame = (direction: -1 | 1) => {
    setIsPlaying(false)
    setPlayheadFrame((currentFrame) => Math.max(PRE_FRAME, Math.min(frameCount - 1, currentFrame + direction)))
  }

  const updateEntityAvatar = async (entityId: string, file: File) => {
    const avatarUrl = await readFileAsDataUrl(file)

    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) {
          return currentPlaybook
        }

        const existing = currentPlaybook.imageLibrary ?? []
        const imageLibrary = existing.includes(avatarUrl) ? existing : [avatarUrl, ...existing]

        return {
          ...currentPlaybook,
          imageLibrary,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => ({
            ...currentPlay,
            entities: currentPlay.entities.map((entity) => {
              if (entity.id !== entityId) return entity
              return { ...entity, avatarUrl }
            }),
          })),
        }
      }),
    }))

    setStatusMessage(`Updated the field icon for ${entityId} across all plays in this playset.`)
  }

  const selectEntityAvatarFromLibrary = (entityId: string, url: string) => {
    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) return currentPlaybook
        return {
          ...currentPlaybook,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => ({
            ...currentPlay,
            entities: currentPlay.entities.map((entity) => {
              if (entity.id !== entityId) return entity
              return { ...entity, avatarUrl: url }
            }),
          })),
        }
      }),
    }))
    setStatusMessage(`Applied stored icon to ${entityId} across all plays in this playset.`)
  }

  const clearEntityAvatar = (entityId: string) => {
    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) {
          return currentPlaybook
        }

        return {
          ...currentPlaybook,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => ({
            ...currentPlay,
            entities: currentPlay.entities.map((entity) => {
              if (entity.id !== entityId) return entity
              return { ...entity, avatarUrl: undefined }
            }),
          })),
        }
      }),
    }))

    setStatusMessage(`Removed the field icon for ${entityId}.`)
  }

  const clearAllFrames = () => {    if (play.segments.length === 0) {
      setStatusMessage('There are no motion frames to clear in this play.')
      return
    }

    const confirmed = window.confirm('Clear all existing frames for this play? PRE setup positions will be kept.')

    if (!confirmed) {
      return
    }

    setIsPlaying(false)
    setPlayheadFrame(PRE_FRAME)
    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) {
          return currentPlaybook
        }

        return {
          ...currentPlaybook,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => {
            if (currentPlay.id !== play.id) {
              return currentPlay
            }

            return {
              ...currentPlay,
              segments: [],
            }
          }),
        }
      }),
    }))

    setStatusMessage('Cleared all motion frames for this play. PRE setup positions were kept.')
  }

  const updateFrameDescription = (frame: number, description: string) => {
    setState((currentState) => ({
      playbooks: currentState.playbooks.map((currentPlaybook) => {
        if (currentPlaybook.id !== playbook.id) return currentPlaybook
        return {
          ...currentPlaybook,
          updatedAt: new Date().toISOString(),
          plays: currentPlaybook.plays.map((currentPlay) => {
            if (currentPlay.id !== play.id) return currentPlay
            const existing = currentPlay.frameDescriptions ?? {}
            const trimmed = description.trim()
            const updated = trimmed
              ? { ...existing, [String(frame)]: trimmed }
              : Object.fromEntries(Object.entries(existing).filter(([k]) => k !== String(frame)))
            return { ...currentPlay, frameDescriptions: updated }
          }),
        }
      }),
    }))
  }

  const activeDescription = (() => {
    const descriptions = play.frameDescriptions ?? {}
    const keys = Object.keys(descriptions)
      .map(Number)
      .filter((k) => k <= playheadFrame)
      .sort((a, b) => b - a)
    return keys.length > 0 ? (descriptions[String(keys[0])] ?? '') : ''
  })()

  const handleFrameHeaderClick = (frame: number) => {
    setIsPlaying(false)
    setPlayheadFrame(frame)
    setEditingFrame(frame)
    setEditingDescription(play.frameDescriptions?.[String(frame)] ?? '')
  }

  const handleOpenThought = (entityId: string) => {
    if (isPlaying) return
    const key = `${entityId}:${playheadFrame}`
    setEditingThought({ entityId, frame: playheadFrame })
    setEditingThoughtText(play.entityMessages?.[key] ?? '')
  }

  const saveEntityThought = () => {
    if (!editingThought) return
    const { entityId, frame } = editingThought
    const key = `${entityId}:${frame}`
    setState((currentState) => ({
      playbooks: currentState.playbooks.map((pb) => {
        if (pb.id !== playbook.id) return pb
        return {
          ...pb,
          updatedAt: new Date().toISOString(),
          plays: pb.plays.map((p) => {
            if (p.id !== play.id) return p
            const existing = p.entityMessages ?? {}
            const trimmed = editingThoughtText.trim()
            const updated = trimmed
              ? { ...existing, [key]: trimmed }
              : Object.fromEntries(Object.entries(existing).filter(([k]) => k !== key))
            return { ...p, entityMessages: updated }
          }),
        }
      }),
    }))
    setEditingThought(null)
  }

  return (
    <div className="editor-layout app-shell">
      <aside className="editor-sidebar panel">
        <div className="section-header">
          <Link className="editor-home-link" to="/">
            <h2>METRO Playbook</h2>
          </Link>
        </div>

        <section className="system-card playset-panel">
          <button
            type="button"
            className="playset-toggle"
            onClick={() => setIsPlaysetListOpen((value) => !value)}
            aria-expanded={isPlaysetListOpen}
          >
            <span className="playset-heading">PLAYSETS</span>
            <span className="playset-toggle-icon" aria-hidden="true">
              {isPlaysetListOpen ? '−' : '+'}
            </span>
          </button>

          {isPlaysetListOpen ? (
            <div className="play-list playset-list">
              {playbook.plays.map((playOption) => (
                <Link
                  key={playOption.id}
                  className={`play-link${playOption.id === play.id ? ' active' : ''}`}
                  to={`/playbook/${playbook.id}/play/${playOption.id}`}
                >
                  <strong>{playOption.name}</strong>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="system-card">
          <header>
            <div>
              <p className="eyebrow">Playback</p>
              <h3>Preview controls</h3>
            </div>
          </header>
          <div className="pill-row">
            {[0.5, 1, 1.5].map((speed) => (
              <button
                key={speed}
                type="button"
                className={speed === playbackSpeed ? 'button' : 'ghost-button'}
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </section>

        <section className="system-card description-panel">
          <header>
            <div>
              <p className="eyebrow">Frame Instruction</p>
              <h3>Description</h3>
            </div>
          </header>
          <div className="description-display">
            {activeDescription && <p>{activeDescription}</p>}
          </div>
          {editingFrame !== null && !isPlaying && (
            <div className="description-edit">
              <p className="eyebrow">Frame {getFrameLabel(editingFrame)}</p>
              <textarea
                className="description-textarea"
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                placeholder="Add an instruction for this frame…"
                rows={3}
              />
              <div className="description-edit-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    updateFrameDescription(editingFrame, editingDescription)
                    setEditingFrame(null)
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setEditingFrame(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <InspectorPanel
          play={play}
          selectedEntityId={selectedEntityId}
          imageLibrary={playbook.imageLibrary ?? []}
          onUploadAvatar={updateEntityAvatar}
          onSelectFromLibrary={selectEntityAvatarFromLibrary}
          onClearAvatar={clearEntityAvatar}
        />
      </aside>

      <main className="editor-main">
        {/* Mobile-only description bar at top */}
        <div className="mobile-description-bar">
          {activeDescription || '\u00a0'}
        </div>

        <section className="toolbar panel">
          <div className="toolbar-top">
            <h2>{play.name}</h2>
            <div className="toolbar-actions">
              {syncStatus === 'saving' && <span className="sync-status saving">Saving…</span>}
              {syncStatus === 'saved' && <span className="sync-status saved">✓ Saved</span>}
              {syncStatus === 'error' && <span className="sync-status error">⚠ Offline</span>}
              <button type="button" className="ghost-button" onClick={() => stepFrame(-1)}>
                Prev frame
              </button>
              <button type="button" className="ghost-button" onClick={() => stepFrame(1)}>
                Next frame
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={clearAllFrames}
                disabled={play.segments.length === 0}
              >
                Clear frames
              </button>
              <button type="button" className="ghost-button" onClick={() => setPlayheadFrame(PRE_FRAME)}>
                Restart
              </button>
              <button
                type="button"
                className="button"
                onClick={() => {
                  setEditingFrame(null)
                  setEditingThought(null)
                  if (!isPlaying && playheadFrame === PRE_FRAME) {
                    setPlayheadFrame(0)
                  }

                  setIsPlaying((value) => !value)
                }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>

          <div className="field-and-timeline">
            <FieldGrid
              play={play}
              selectedEntityId={selectedEntityId}
              playheadFrame={playheadFrame}
              renderFrame={renderFrame}
              isPlaying={isPlaying}
              editingThought={editingThought}
              editingThoughtText={editingThoughtText}
              onSelectEntity={setSelectedEntityId}
              onPlaceEntity={updateMovement}
              onOpenThought={handleOpenThought}
              onThoughtTextChange={setEditingThoughtText}
              onSaveThought={saveEntityThought}
              onCancelThought={() => setEditingThought(null)}
            />

            <TimelineEditor
              play={play}
              frameCount={frameCount}
              playheadFrame={playheadFrame}
              selectedEntityId={selectedEntityId}
              editingFrame={editingFrame}
              selectedSegmentId={selectedSegmentId}
              onSelectFrame={(frame) => {
                setIsPlaying(false)
                setPlayheadFrame(frame)
              }}
              onSelectEntity={(entityId) => {
                setSelectedEntityId(entityId)
                setIsPlaying(false)
              }}
              onSelectSegment={setSelectedSegmentId}
              onFrameHeaderClick={handleFrameHeaderClick}
            />
          </div>
        </section>

        {/* Mobile-only controls bar at bottom */}
        <div className="mobile-controls-bar">
          <button type="button" className="ghost-button" onClick={() => stepFrame(-1)}>
            ◀ Prev
          </button>
          <button type="button" className="ghost-button" onClick={() => stepFrame(1)}>
            Next ▶
          </button>
          <button type="button" className="ghost-button" onClick={() => setPlayheadFrame(PRE_FRAME)}>
            Restart
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setEditingThought(null)
              if (!isPlaying && playheadFrame === PRE_FRAME) setPlayheadFrame(0)
              setIsPlaying((v) => !v)
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>

      </main>
    </div>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Could not read the selected image.'))
    }

    reader.onerror = () => reject(reader.error ?? new Error('Could not read the selected image.'))
    reader.readAsDataURL(file)
  })
}