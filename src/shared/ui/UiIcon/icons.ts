// Application icons. Original Figma SVG assets were not part of the supplied export.
export const iconPaths = {
  search: 'm21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z',
  close: 'm6 6 12 12 M6 18 18 6',
  plus: 'M12 5v14 M5 12h14',
  'chevron-left': 'm15 5-7 7 7 7',
  'chevron-right': 'm9 5 7 7-7 7',
  calendar:
    'M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  'panel-left': 'M9 3v18 M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  'arrow-right': 'M4 12h16 m-6-6 6 6-6 6',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  move: 'M12 2v20 M2 12h20 m-7-7-3-3-3 3 m-4 4-3 3 3 3 m4 4 3 3 3-3 m4-4 3-3-3-3',
  undo: 'M3 10h10a7 7 0 0 1 0 14 M3 10l5-5 M3 10l5 5',
  warning: 'm12 3 10 18H2Z M12 9v5 M12 17h.01',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  save: 'M5 3h12l4 4v14H3V3Z M7 3v6h10V3 M7 21v-8h10v8',
} as const

export type IconName = keyof typeof iconPaths
