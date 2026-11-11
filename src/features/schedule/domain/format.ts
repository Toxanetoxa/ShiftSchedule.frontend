import type { ShiftInput } from './types'

export function formatMinutes(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60

  return remainder ? `${hours} ч ${remainder} мин` : `${hours} ч`
}

export function formatShiftTime(shift: ShiftInput): string {
  return `${shift.startTime}–${shift.endTime}`
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
