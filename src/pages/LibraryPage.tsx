import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { loadPlaybookState, loadPlaybookStateAsync, savePlaybookState, savePlaybookStateAsync } from '../lib/storage'
import type { PlaybookState } from '../types/playbook'

const FAVORITES_STORAGE_KEY = 'ultimate-frisbee-play-favorites'

export function LibraryPage() {
  const [state, setState] = useState<PlaybookState>(() => loadPlaybookState())
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [favoritePlayIds, setFavoritePlayIds] = useState<string[]>(() => {
    const rawFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY)

    if (!rawFavorites) {
      return []
    }

    try {
      return JSON.parse(rawFavorites) as string[]
    } catch {
      return []
    }
  })

  const initialStateRef = useRef(state)

  useEffect(() => {
    loadPlaybookStateAsync().then((cloudState) => {
      setState((prev) => prev === initialStateRef.current ? cloudState : prev)
    }).catch(() => {})
  }, [])

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

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoritePlayIds))
  }, [favoritePlayIds])

  const renamePlay = (playbookId: string, playId: string, currentName: string) => {
    const nextName = window.prompt('Rename play', currentName)?.trim()

    if (!nextName || nextName === currentName) {
      return
    }

    setState((currentState) => ({
      playbooks: currentState.playbooks.map((playbook) => {
        if (playbook.id !== playbookId) {
          return playbook
        }

        return {
          ...playbook,
          updatedAt: new Date().toISOString(),
          plays: playbook.plays.map((play) => {
            if (play.id !== playId) {
              return play
            }

            return {
              ...play,
              name: nextName,
            }
          }),
        }
      }),
    }))
  }

  const deletePlay = (playbookId: string, playId: string, playName: string) => {
    const confirmed = window.confirm(`Delete ${playName}?`)

    if (!confirmed) {
      return
    }

    setState((currentState) => ({
      playbooks: currentState.playbooks.map((playbook) => {
        if (playbook.id !== playbookId) {
          return playbook
        }

        return {
          ...playbook,
          updatedAt: new Date().toISOString(),
          plays: playbook.plays.filter((play) => play.id !== playId),
        }
      }),
    }))
  }

  const toggleFavorite = (playId: string) => {
    setFavoritePlayIds((currentFavorites) => {
      if (currentFavorites.includes(playId)) {
        return currentFavorites.filter((id) => id !== playId)
      }

      return [...currentFavorites, playId]
    })
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  return (
    <div className="library-layout app-shell">
      <main className="library-main">
        <h1 className="library-title">
          METRO Playbook
          {syncStatus !== 'idle' && (
            <span className={`sync-status ${syncStatus}`}>
              {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'saved' ? '✓ Saved' : '⚠ Offline'}
            </span>
          )}
        </h1>

        <section className="section-header">
          <label className="search-shell" aria-label="Search plays">
            <input
              className="search-input"
              type="search"
              placeholder="Search play name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="button"
            onClick={() => {
              const timestamp = new Date().toISOString()
              setState((currentState) => ({
                playbooks: currentState.playbooks.map((playbook, index) => {
                  if (index !== 0) {
                    return playbook
                  }
                  return {
                    ...playbook,
                    updatedAt: timestamp,
                    plays: [
                      ...playbook.plays,
                      {
                        ...playbook.plays[0],
                        id: `play-${Date.now()}`,
                        name: `New Play ${playbook.plays.length + 1}`,
                        notes: '',
                        segments: [],
                        frameDescriptions: {},
                        entityMessages: {},
                      },
                    ],
                  }
                }),
              }))
            }}
          >
            Add play
          </button>
        </section>

        <div className="playbook-list">
          {state.playbooks.map((playbook) => {
            const filteredPlays = playbook.plays.filter((play) => {
              if (!normalizedQuery) {
                return true
              }

              return play.name.toLowerCase().includes(normalizedQuery)
            })

            return (
            <section key={playbook.id} className="playbook-card panel active compact-card">
              <div className="play-list">
                {filteredPlays.map((play) => (
                  <article key={play.id} className="play-card">
                    <header>
                      <h3>{play.name}</h3>
                      <div className="play-card-actions">
                        <button
                          type="button"
                          className={`icon-button star-button${favoritePlayIds.includes(play.id) ? ' active' : ''}`}
                          onClick={() => toggleFavorite(play.id)}
                          aria-label={`Favorite ${play.name}`}
                        >
                          ★
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => renamePlay(playbook.id, play.id, play.name)}
                          aria-label={`Rename ${play.name}`}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => deletePlay(playbook.id, play.id, play.name)}
                          aria-label={`Delete ${play.name}`}
                        >
                          Delete
                        </button>
                        <Link className="button" to={`/playbook/${playbook.id}/play/${play.id}`}>
                          Open
                        </Link>
                      </div>
                    </header>
                  </article>
                ))}
                {filteredPlays.length === 0 ? <p className="empty-message">No play matches this search.</p> : null}
              </div>
            </section>
          )})}
        </div>
      </main>
    </div>
  )
}