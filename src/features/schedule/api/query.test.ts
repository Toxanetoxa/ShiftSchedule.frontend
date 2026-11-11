import type { ApiDateRange, CalendarResponse } from './types'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { ApiTimeoutError } from '@/shared/api/client'
import { getCalendar } from './api'
import { keepNewestCalendar, useCalendarQuery } from './query'

vi.mock('./api', () => ({ getCalendar: vi.fn() }))

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'
const initialRange = { from: '2026-11-09', to: '2026-11-11' }
const clients: QueryClient[] = []

function calendar(id = firstId, range: ApiDateRange = initialRange, version = 1): CalendarResponse {
  const dates = [
    range.from,
    new Date(Date.parse(`${range.from}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10),
  ]
  return {
    schedule: { id, name: 'График', timeZone: 'Europe/Moscow', version },
    range,
    employees: [],
    shiftTemplates: [],
    shifts: [],
    coverage: dates.map((date) => ({ date, shiftCount: 0, covered: false })),
  }
}

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  vi.mocked(getCalendar).mockReset()
})

describe('calendar query', () => {
  it('retries a timed-out read once and then exposes the actionable error', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })
    clients.push(client)
    const failure = new ApiTimeoutError()
    vi.mocked(getCalendar).mockRejectedValue(failure)
    let query!: ReturnType<typeof useCalendarQuery>
    mount(
      defineComponent({
        setup() {
          query = useCalendarQuery(firstId, initialRange)
          return () => h('div')
        },
      }),
      { global: { plugins: [[VueQueryPlugin, { queryClient: client }]] } },
    )

    await vi.waitFor(() => expect(query.isError.value).toBe(true))
    expect(getCalendar).toHaveBeenCalledTimes(2)
    expect(query.error.value).toBe(failure)
  })
  it('tracks range and schedule refs without displaying the previous range during a new request', async () => {
    const id = ref(firstId)
    const range = ref<ApiDateRange>({ ...initialRange })
    const client = new QueryClient()
    clients.push(client)
    let query!: ReturnType<typeof useCalendarQuery>
    vi.mocked(getCalendar).mockResolvedValueOnce(calendar())
    mount(
      defineComponent({
        setup() {
          query = useCalendarQuery(id, range)
          return () => h('div')
        },
      }),
      {
        global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
      },
    )
    await vi.waitFor(() => expect(query.data.value?.range.from).toBe('2026-11-09'))

    let resolveNext!: (value: CalendarResponse) => void
    vi.mocked(getCalendar).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveNext = resolve
      }),
    )
    range.value = { from: '2026-11-11', to: '2026-11-13' }
    await nextTick()
    await flushPromises()

    expect(query.data.value).toBeUndefined()
    expect(getCalendar).toHaveBeenLastCalledWith(
      firstId,
      { from: '2026-11-11', to: '2026-11-13' },
      expect.any(AbortSignal),
    )
    resolveNext(calendar(firstId, range.value))
    await vi.waitFor(() => expect(query.data.value?.range.from).toBe('2026-11-11'))

    vi.mocked(getCalendar).mockResolvedValueOnce(calendar(secondId, range.value))
    id.value = secondId
    await vi.waitFor(() => expect(query.data.value?.schedule.id).toBe(secondId))
    expect(getCalendar).toHaveBeenLastCalledWith(secondId, range.value, expect.any(AbortSignal))
  })

  it('does not fetch until its reactive enabled condition becomes true', async () => {
    const client = new QueryClient()
    clients.push(client)
    const enabled = ref(false)
    vi.mocked(getCalendar).mockResolvedValue(calendar())
    mount(
      defineComponent({
        setup() {
          useCalendarQuery(
            () => firstId,
            () => initialRange,
            enabled,
          )
          return () => h('div')
        },
      }),
      {
        global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
      },
    )
    await flushPromises()
    expect(getCalendar).not.toHaveBeenCalled()
    enabled.value = true
    await vi.waitFor(() => expect(getCalendar).toHaveBeenCalledTimes(1))
  })

  it('keeps a newer version for the same calendar key but does not carry it across ranges or schedules', () => {
    const accepted = calendar(firstId, initialRange, 9)
    expect(keepNewestCalendar(accepted, calendar(firstId, initialRange, 8))).toBe(accepted)
    expect(keepNewestCalendar(accepted, calendar(firstId, initialRange, 10))).toMatchObject({
      schedule: { version: 10 },
    })
    const nextRange = calendar(firstId, { from: '2026-11-11', to: '2026-11-13' }, 1)
    expect(keepNewestCalendar(accepted, nextRange)).toEqual(nextRange)
    const nextSchedule = calendar(secondId, initialRange, 1)
    expect(keepNewestCalendar(accepted, nextSchedule)).toEqual(nextSchedule)
  })
})
