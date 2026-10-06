import type { Sheet } from '../types/sheet'

export const getActiveSheets = (sheets: Sheet[]): Sheet[] => sheets.filter((s) => !s.deletedAt)

export const getStarredSheets = (sheets: Sheet[]): Sheet[] =>
  getActiveSheets(sheets).filter((s) => s.isStarred)

export const getTrashedSheets = (sheets: Sheet[]): Sheet[] => sheets.filter((s) => s.deletedAt)

export const getRecentSheets = (sheets: Sheet[]): Sheet[] =>
  [...getActiveSheets(sheets)].sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
  )
