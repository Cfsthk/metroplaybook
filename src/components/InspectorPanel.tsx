import { useState, type ChangeEvent } from 'react'
import type { Play } from '../types/playbook'

interface InspectorPanelProps {
  play: Play
  selectedEntityId: string
  imageLibrary: string[]
  onUploadAvatar: (entityId: string, file: File) => void
  onClearAvatar: (entityId: string) => void
  onSelectFromLibrary: (entityId: string, url: string) => void
}

export function InspectorPanel({
  play,
  selectedEntityId,
  imageLibrary,
  onUploadAvatar,
  onClearAvatar,
  onSelectFromLibrary,
}: InspectorPanelProps) {
  const [showLibrary, setShowLibrary] = useState(false)
  const entity = play.entities.find((item) => item.id === selectedEntityId) ?? play.entities[0]

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    onUploadAvatar(entity.id, file)
    event.target.value = ''
  }

  return (
    <aside className="inspector-panel panel">
      <section className="system-card">
        <header>
          <div>
            <p className="eyebrow">Player Icon</p>
            <h3>Photo on the field</h3>
          </div>
        </header>
        <div className="avatar-controls">
          <div className="avatar-preview" style={{ background: entity.color }}>
            {entity.avatarUrl ? (
              <img src={entity.avatarUrl} alt={entity.label} />
            ) : (
              <span>{entity.shortLabel}</span>
            )}
          </div>
          <div className="legend-list">
            <label className="button upload-button">
              Upload picture
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
            {imageLibrary.length > 0 && (
              <button
                type="button"
                className="ghost-button"
                onClick={() => setShowLibrary((v) => !v)}
              >
                {showLibrary ? 'Close library' : 'Browse pictures'}
              </button>
            )}
            <button
              type="button"
              className="ghost-button"
              onClick={() => onClearAvatar(entity.id)}
              disabled={!entity.avatarUrl}
            >
              Remove picture
            </button>
          </div>
        </div>
        {showLibrary && (
          <div className="image-library">
            <p className="eyebrow image-library-label">Saved pictures</p>
            <div className="image-library-grid">
              {imageLibrary.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className={`image-library-item${entity.avatarUrl === url ? ' active' : ''}`}
                  onClick={() => {
                    onSelectFromLibrary(entity.id, url)
                    setShowLibrary(false)
                  }}
                >
                  <img src={url} alt={`Saved picture ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </aside>
  )
}