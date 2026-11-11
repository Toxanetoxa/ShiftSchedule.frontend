import type { ApiDateRange } from '@schedule/api/types'
import type { CalendarView, DateRange, IsoDate, ScheduleDate } from './types'
import { isIsoDate } from './format'

function dateAtNoon(date: IsoDate): Date {
  if (!isIsoDate(date)) throw new Error('Укажите существующую дату.')
  return new Date(`${date}T12:00:00Z`)
}

export function addCalendarDays(date: IsoDate, days: number): IsoDate {
  const value = dateAtNoon(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function todayInZone(timeZone = 'Europe/Moscow'): IsoDate {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function calendarRange(view: CalendarView, activeDate: IsoDate): ApiDateRange {
  const date = dateAtNoon(activeDate)
  if (view === 'week') {
    const from = addCalendarDays(activeDate, -(date.getUTCDay() + 6) % 7)
    return { from, to: addCalendarDays(from, 7) }
  }
  const from = `${activeDate.slice(0, 7)}-01`
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  return { from, to: date.toISOString().slice(0, 10) }
}

export function calendarDates(range: ApiDateRange, today = todayInZone()): ScheduleDate[] {
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' })
  const dates: ScheduleDate[] = []
  for (let date = range.from; date < range.to; date = addCalendarDays(date, 1)) {
    const value = dateAtNoon(date)
    dates.push({
      date,
      weekdayLabel: weekday.format(value),
      dayLabel: String(value.getUTCDate()),
      isToday: date === today,
    })
    if (dates.length > 62) throw new Error('Диапазон не может превышать 62 дня.')
  }
  return dates
}

export function calendarRangeLabel(view: CalendarView, range: ApiDateRange): string {
  if (view === 'month')
    return new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(dateAtNoon(range.from))
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `${formatter.format(dateAtNoon(range.from))} — ${formatter.format(dateAtNoon(addCalendarDays(range.to, -1)))}`
}

export function adjacentPeriod(
  view: CalendarView,
  activeDate: IsoDate,
  direction: number,
): IsoDate {
  if (view === 'week') return addCalendarDays(activeDate, direction * 7)
  const date = dateAtNoon(activeDate)
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + direction)
  return date.toISOString().slice(0, 10)
}

export function monthPublicationRange(activeDate: IsoDate): DateRange {
  const range = calendarRange('month', activeDate)
  return { startDate: range.from, endDate: range.to }
}
