# Ultimate Frisbee Playbook

An editor-first web app for building an ultimate frisbee playbook with a grid field, per-entity movement timeline, and basic playback.

## Current Scope

- Playbook library view with multiple saved plays
- Play editor with field grid and clickable timeline
- Player movement timing based on `1 grid cell = 1 frame`
- Faster disc movement timing for passes and swings
- Local browser autosave
- Supabase-ready client scaffold for hosted auth and storage
- GitHub Pages deployment workflow

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Environment

Copy `.env.example` to `.env` and set these values when you are ready to connect cloud storage:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BASE_PATH` if you need to override the GitHub Pages asset base path manually

Until Supabase is configured, the app uses local browser storage so you can keep iterating on the editor safely.

## Editor Model

- Each play has entities, a field size, and movement segments.
- Each movement segment stores a `startFrame`, `duration`, `from`, and `to` position.
- The timeline UI is derived from those segments rather than storing duplicate frame data.
- Clicking a timeline frame changes the playhead, and clicking the field creates the next movement segment for the selected player or disc.

## Deployment

The repository includes a GitHub Actions workflow for GitHub Pages deployment from the `main` branch.

Before using hosted data, add the Supabase environment variables in the GitHub repository settings so the Pages build can connect to your project.
