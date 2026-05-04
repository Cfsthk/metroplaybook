import type { Entity, PlaybookState } from '../types/playbook'

function offense(id: number, x: number, y: number): Entity {
  return {
    id: `o${id}`,
    label: `Offense ${id}`,
    shortLabel: `O${id}`,
    role: 'offense',
    color: '#ff7c20',
    basePosition: { x, y },
  }
}

function defense(id: number, x: number, y: number): Entity {
  return {
    id: `d${id}`,
    label: `Defense ${id}`,
    shortLabel: `D${id}`,
    role: 'defense',
    color: '#0f4c81',
    basePosition: { x, y },
  }
}

export const sampleState: PlaybookState = {
  playbooks: [
    {
      id: 'sideline-system',
      name: 'Sideline System',
      teamName: 'Harbor Point',
      description: 'Structured pull plays and continuation options for red-zone entries.',
      updatedAt: '2026-04-27T12:00:00.000Z',
      owner: 'Coach',
      collaborators: 6,
      plays: [
        {
          id: 'ho-reset',
          name: 'Horizontal Reset 1',
          notes:
            'Click a timeline frame, then click a grid square to route the selected player. Disc movement uses a faster time scale than player movement.',
          field: { width: 14, height: 24 },
          entities: [
            offense(1, 5, 3),
            offense(2, 8, 5),
            offense(3, 4, 8),
            offense(4, 10, 8),
            offense(5, 5, 12),
            offense(6, 8, 14),
            offense(7, 6, 18),
            defense(1, 5, 4),
            defense(2, 8, 6),
            defense(3, 4, 9),
            defense(4, 10, 9),
            defense(5, 5, 13),
            defense(6, 8, 15),
            defense(7, 6, 19),
            {
              id: 'disc',
              label: 'Disc',
              shortLabel: 'D',
              role: 'disc',
              color: '#f3d27a',
              basePosition: { x: 5, y: 3 },
            },
          ],
          segments: [
            {
              id: 'o2-0-7-11',
              entityId: 'o2',
              startFrame: 0,
              duration: 5,
              from: { x: 8, y: 5 },
              to: { x: 11, y: 7 },
            },
            {
              id: 'disc-2-7-11',
              entityId: 'disc',
              startFrame: 2,
              duration: 2,
              from: { x: 5, y: 3 },
              to: { x: 11, y: 7 },
            },
            {
              id: 'o5-4-16-7',
              entityId: 'o5',
              startFrame: 4,
              duration: 6,
              from: { x: 5, y: 12 },
              to: { x: 7, y: 16 },
            },
          ],
        },
        {
          id: 'split-iso',
          name: 'Split Isolation',
          notes: 'Use this for late-stall sideline possessions and weak-side continuation.',
          field: { width: 14, height: 24 },
          entities: [
            offense(1, 4, 4),
            offense(2, 9, 4),
            offense(3, 4, 9),
            offense(4, 9, 9),
            offense(5, 4, 14),
            offense(6, 9, 14),
            offense(7, 7, 19),
            defense(1, 4, 5),
            defense(2, 9, 5),
            defense(3, 4, 10),
            defense(4, 9, 10),
            defense(5, 4, 15),
            defense(6, 9, 15),
            defense(7, 7, 20),
            {
              id: 'disc',
              label: 'Disc',
              shortLabel: 'D',
              role: 'disc',
              color: '#f3d27a',
              basePosition: { x: 4, y: 4 },
            },
          ],
          segments: [],
        },
      ],
    },
  ],
}