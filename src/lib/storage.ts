import { sampleState } from './sampleData'
import { supabase } from './supabase'
import type { PlaybookState } from '../types/playbook'

const STORAGE_KEY = 'ultimate-frisbee-playbook-state'
const SUPABASE_ROW_ID = 'main'
const TARGET_FIELD_WIDTH = 14
const TARGET_FIELD_HEIGHT = 24

export function loadPlaybookState() {
  const rawState = window.localStorage.getItem(STORAGE_KEY)

  if (!rawState) {
    return normalizePlaybookState(sampleState)
  }

  try {
    return normalizePlaybookState(JSON.parse(rawState) as PlaybookState)
  } catch {
    return sampleState
  }
}

export function savePlaybookState(state: PlaybookState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Load from Supabase if configured, falling back to localStorage. */
export async function loadPlaybookStateAsync(): Promise<PlaybookState> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('playbook_states')
        .select('data')
        .eq('id', SUPABASE_ROW_ID)
        .single()
      if (!error && data?.data) {
        const remote = data.data as PlaybookState
        // Only use Supabase data if it actually has content; otherwise keep local data
        if (remote.playbooks && remote.playbooks.length > 0) {
          const normalized = normalizePlaybookState(remote)
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
          return normalized
        }
      }
    } catch (err) {
      console.warn('Supabase load failed, using local data:', err)
    }
  }
  return loadPlaybookState()
}

/** Save to localStorage immediately and to Supabase in the background. */
export async function savePlaybookStateAsync(state: PlaybookState): Promise<void> {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  if (supabase) {
    try {
      await supabase
        .from('playbook_states')
        .upsert({ id: SUPABASE_ROW_ID, data: state, updated_at: new Date().toISOString() })
    } catch (err) {
      console.warn('Supabase save failed, data kept locally:', err)
    }
  }
}

function normalizePlaybookState(state: PlaybookState) {
  return {
    playbooks: state.playbooks.map((playbook) => ({
      ...playbook,
      plays: playbook.plays.map((play) => {
        const verticalPlay =
          play.field.height >= play.field.width
            ? play
            : {
                ...play,
                field: {
                  width: play.field.height,
                  height: play.field.width,
                },
                entities: play.entities.map((entity) => ({
                  ...entity,
                  basePosition: {
                    x: entity.basePosition.y,
                    y: entity.basePosition.x,
                  },
                })),
                segments: play.segments.map((segment) => ({
                  ...segment,
                  from: {
                    x: segment.from.y,
                    y: segment.from.x,
                  },
                  to: {
                    x: segment.to.y,
                    y: segment.to.x,
                  },
                })),
              }

        if (
          verticalPlay.field.width === TARGET_FIELD_WIDTH &&
          verticalPlay.field.height === TARGET_FIELD_HEIGHT
        ) {
          return verticalPlay
        }

        return {
          ...verticalPlay,
          field: {
            width: TARGET_FIELD_WIDTH,
            height: TARGET_FIELD_HEIGHT,
          },
          entities: verticalPlay.entities.map((entity) => ({
            ...entity,
            basePosition: scalePosition(
              entity.basePosition,
              verticalPlay.field.width,
              verticalPlay.field.height,
            ),
          })),
          segments: verticalPlay.segments.map((segment) => ({
            ...segment,
            from: scalePosition(
              segment.from,
              verticalPlay.field.width,
              verticalPlay.field.height,
            ),
            to: scalePosition(
              segment.to,
              verticalPlay.field.width,
              verticalPlay.field.height,
            ),
          })),
        }
      }),
    })),
  } satisfies PlaybookState
}

function scalePosition(
  position: { x: number; y: number },
  sourceWidth: number,
  sourceHeight: number,
) {
  return {
    x: scaleAxis(position.x, sourceWidth, TARGET_FIELD_WIDTH),
    y: scaleAxis(position.y, sourceHeight, TARGET_FIELD_HEIGHT),
  }
}

function scaleAxis(value: number, sourceSize: number, targetSize: number) {
  if (sourceSize <= 1) {
    return 0
  }

  const scaledValue = Math.round((value / (sourceSize - 1)) * (targetSize - 1))
  return Math.max(0, Math.min(targetSize - 1, scaledValue))
}