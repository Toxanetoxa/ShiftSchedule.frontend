import type { MaybeRefOrGetter } from 'vue'
import type { ApiDateRange, CalendarResponse } from './types'
import { replaceEqualDeep, useQuery } from '@tanstack/vue-query'
import { computed, toValue } from 'vue'
import { ApiError, ApiTimeoutError } from '@/shared/api/client'
import { getCalendar } from './api'
import { isCalendarResponse } from './guards'

export const scheduleKeys = {
  calendars: (id: string) => ['schedule', id, 'calendar'] as const,
  calendar: (id: string, range: ApiDateRange) =>
    ['schedule', id, 'calendar', { from: range.from, to: range.to }] as const,
  publication: (id: string, publicationId: string) =>
    ['schedule', id, 'publication', publicationId] as const,
}

export function keepNewestCalendar(previous: unknown, incoming: unknown): unknown {
  if (
    isCalendarResponse(previous) &&
    isCalendarResponse(incoming) &&
    previous.schedule.id.toLowerCase() === incoming.schedule.id.toLowerCase() &&
    previous.range.from === incoming.range.from &&
    previous.range.to === incoming.range.to &&
    previous.schedule.version > incoming.schedule.version
  )
    return previous
  return replaceEqualDeep(previous, incoming)
}

function retryRead(failureCount: number, error: Error): boolean {
  if (failureCount >= 1 || error.name === 'AbortError') return false
  if (error instanceof ApiError)
    return error.status >= 500 || error.status === 408 || error.status === 429
  return error instanceof TypeError || error instanceof ApiTimeoutError
}

export function useCalendarQuery(
  id: MaybeRefOrGetter<string>,
  range: MaybeRefOrGetter<ApiDateRange>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  return useQuery<CalendarResponse, Error>(
    computed(() => {
      const currentId = toValue(id)
      const currentRange = { from: toValue(range).from, to: toValue(range).to }
      return {
        queryKey: scheduleKeys.calendar(currentId, currentRange),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getCalendar(currentId, currentRange, signal),
        enabled: Boolean(currentId) && toValue(enabled),
        staleTime: 0,
        refetchInterval: 5000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        placeholderData: undefined,
        retry: retryRead,
        structuralSharing: keepNewestCalendar,
      }
    }),
  )
}
