import { Link } from 'react-router-dom'
import type { Playbook } from '../types/playbook'

interface LibrarySidebarProps {
  playbooks: Playbook[]
}

export function LibrarySidebar({ playbooks }: LibrarySidebarProps) {
  const playCount = playbooks.reduce((count, playbook) => count + playbook.plays.length, 0)

  return (
    <aside className="library-sidebar panel">
      <section className="hero-card">
        <p className="eyebrow">Ultimate Frisbee</p>
        <h1>Design plays with a field and a timeline.</h1>
        <p>
          Build a full playbook, route cutters frame by frame, and hand off disc motion on the same timeline.
        </p>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <span className="eyebrow">Playbooks</span>
          <strong>{playbooks.length}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Plays</span>
          <strong>{playCount}</strong>
        </article>
        <article className="stat-card">
          <span className="eyebrow">Sync</span>
          <strong>Ready</strong>
        </article>
      </section>

      <section>
        <div className="section-header">
          <div>
            <p className="eyebrow">Jump Back In</p>
            <h2 className="panel-title">Recent plays</h2>
          </div>
        </div>
        <div className="play-list">
          {playbooks.flatMap((playbook) =>
            playbook.plays.slice(0, 2).map((play) => (
              <Link
                key={`${playbook.id}-${play.id}`}
                className="play-link"
                to={`/playbook/${playbook.id}/play/${play.id}`}
              >
                <strong>{play.name}</strong>
              </Link>
            )),
          )}
        </div>
      </section>
    </aside>
  )
}