import type {
  ApiDateRange,
  ApiShift,
  CalendarResponse,
  NormalizedShift,
  PublicationResponse,
  PublishRequest,
  SaveCellsRequest,
} from '@schedule/api/types'
import type { ShiftInput } from '@schedule/domain/types'
import type { VueWrapper } from '@vue/test-utils'
import { configuredScheduleId } from '@schedule/api/api'
import { scheduleKeys } from '@schedule/api/query'
import { addCalendarDays } from '@schedule/domain/calendar'
import { cellKey } from '@schedule/domain/types'
import {
  CellActionPopover,
  DateActionPopover,
  ScheduleHeader,
  ShiftTemplatePanel,
} from '@schedule/ui'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import App from '@/App.vue'

const annaId = '00000000-0000-4000-8000-000000000201'
const borisId = '00000000-0000-4000-8000-000000000202'
const templateId = '00000000-0000-4000-8000-000000000101'
const publicationId = '00000000-0000-4000-8000-000000000401'
const originalLocation = window.location.href
const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
const apps: { wrapper: VueWrapper; client: QueryClient }[] = []

interface RequestRecord {
  method: string
  url: URL
  body?: SaveCellsRequest | PublishRequest
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(async () => {
  for (const app of [...apps]) await unmountApp(app)
  vi.restoreAllMocks()
  if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
  else Reflect.deleteProperty(window, 'matchMedia')
  window.history.replaceState(null, '', originalLocation)
})

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalized(workDate: string, input: ShiftInput, id: string): NormalizedShift {
  const endDate = addCalendarDays(workDate, input.endDayOffset)
  const startsAt = new Date(`${workDate}T${input.startTime}:00+03:00`)
    .toISOString()
    .replace('.000Z', 'Z')
  const endsAt = new Date(`${endDate}T${input.endTime}:00+03:00`)
    .toISOString()
    .replace('.000Z', 'Z')
  return {
    ...input,
    id,
    startsAt,
    endsAt,
    durationMinutes: (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000,
    label: input.sourceTemplateId ? 'Утро' : 'Своя смена',
    colorKey: input.sourceTemplateId ? 'morning' : 'custom',
  }
}

function calendar(range: ApiDateRange, version: number, shifts: ApiShift[]): CalendarResponse {
  const visible = shifts.filter(
    (shift) => shift.workDate >= range.from && shift.workDate < range.to,
  )
  const coverage = []
  for (let date = range.from; date < range.to; date = addCalendarDays(date, 1)) {
    const shiftCount = visible.filter((shift) => shift.workDate === date).length
    coverage.push({ date, shiftCount, covered: shiftCount > 0 })
  }
  return {
    schedule: {
      id: configuredScheduleId,
      name: 'Рабочий график',
      timeZone: 'Europe/Moscow',
      version,
    },
    range: { ...range },
    employees: [
      { id: annaId, fullName: 'Анна Смирнова' },
      { id: borisId, fullName: 'Борис Волков' },
    ].map((employee) => ({
      ...employee,
      positionTitle: 'Агент',
      avatarUrl: null,
      isActive: true,
      scheduledMinutes: visible
        .filter((shift) => shift.employeeId === employee.id)
        .reduce((sum, shift) => sum + shift.durationMinutes, 0),
    })),
    shiftTemplates: [
      {
        id: templateId,
        name: 'Утро',
        startTime: '07:00',
        endTime: '15:00',
        endDayOffset: 0,
        durationMinutes: 480,
        colorKey: 'morning',
      },
    ],
    shifts: structuredClone(visible),
    coverage,
  }
}

function createServer() {
  const requests: RequestRecord[] = []
  let initialRange: ApiDateRange | undefined
  let version = 1
  let shifts: ApiShift[] = []
  let publication: PublicationResponse | undefined
  let nextCalendarResponse: Promise<Response | undefined> | undefined
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const url = new URL(String(input), 'http://localhost')
    const request: RequestRecord = {
      method: options?.method ?? 'GET',
      url,
      body: options?.body
        ? (JSON.parse(String(options.body)) as SaveCellsRequest | PublishRequest)
        : undefined,
    }
    requests.push(request)
    if (request.method === 'GET' && url.pathname.endsWith('/calendar')) {
      const range = { from: url.searchParams.get('from')!, to: url.searchParams.get('to')! }
      if (!initialRange) {
        initialRange = range
        shifts = [
          {
            employeeId: borisId,
            workDate: range.from,
            ...normalized(
              range.from,
              { startTime: '09:00', endTime: '17:00', endDayOffset: 0, sourceTemplateId: null },
              '00000000-0000-4000-8000-000000000302',
            ),
          },
        ]
      }
      const pendingResponse = nextCalendarResponse
      nextCalendarResponse = undefined
      const response = await pendingResponse
      return response ?? json(calendar(range, version, shifts))
    }
    if (request.method === 'PATCH' && url.pathname.endsWith('/cells')) {
      const body = request.body as SaveCellsRequest
      version++
      const changedCells = body.changes.map((change) => {
        shifts = shifts.filter(
          (shift) => shift.employeeId !== change.employeeId || shift.workDate !== change.workDate,
        )
        const shift = change.shift
          ? normalized(change.workDate, change.shift, '00000000-0000-4000-8000-000000000301')
          : null
        if (shift)
          shifts.push({ employeeId: change.employeeId, workDate: change.workDate, ...shift })
        return { employeeId: change.employeeId, workDate: change.workDate, shift }
      })
      return json({ version, changedCells })
    }
    if (request.method === 'POST' && url.pathname.endsWith('/publications')) {
      const body = request.body as PublishRequest
      const range = { from: body.from, to: body.to }
      const { shiftTemplates: _templates, ...snapshot } = calendar(range, version, shifts)
      publication = {
        id: publicationId,
        scheduleId: configuredScheduleId,
        range,
        sourceVersion: version,
        publishedAt: '2026-11-11T12:00:00Z',
        snapshot: { ...snapshot, schemaVersion: 1 },
      }
      const { snapshot: _snapshot, ...metadata } = publication
      return json(metadata, 201)
    }
    if (
      request.method === 'GET' &&
      url.pathname.endsWith(`/publications/${publicationId}`) &&
      publication
    )
      return json(publication)
    throw new Error(`Unexpected API request: ${request.method} ${url}`)
  })
  return {
    requests,
    deferCalendar(): (response?: Response) => void {
      let complete!: (response?: Response) => void
      nextCalendarResponse = new Promise((resolve) => {
        complete = resolve
      })
      return complete
    },
    range(): ApiDateRange {
      if (!initialRange) throw new Error('Calendar has not loaded')
      return initialRange
    },
    advanceRemote(): void {
      version++
      shifts = shifts.map((shift) =>
        shift.employeeId === annaId
          ? {
              employeeId: annaId,
              workDate: shift.workDate,
              ...normalized(
                shift.workDate,
                { startTime: '12:00', endTime: '20:00', endDayOffset: 0, sourceTemplateId: null },
                shift.id,
              ),
            }
          : shift,
      )
    },
  }
}

async function mountApp() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const wrapper = mount(App, {
    attachTo: document.body,
    global: { plugins: [[VueQueryPlugin, { queryClient: client }]] },
  })
  const app = { wrapper, client }
  apps.push(app)
  await flushPromises()
  await vi.waitFor(() => expect(wrapper.findAll('[data-cell-key]')).toHaveLength(14))
  return app
}

async function unmountApp(app: (typeof apps)[number]): Promise<void> {
  app.wrapper.unmount()
  await nextTick()
  await app.client.cancelQueries()
  app.client.clear()
  apps.splice(apps.indexOf(app), 1)
}

function button(root: ParentNode, name: string | RegExp): DOMWrapper<HTMLButtonElement> {
  const found = [...root.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
    const label = (element.getAttribute('aria-label') || element.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
    return typeof name === 'string' ? label === name : name.test(label)
  })
  if (!found) throw new Error(`Button not found: ${String(name)}`)
  return new DOMWrapper(found)
}

async function chooseDate(root: ParentNode, label: string, value: string): Promise<void> {
  await button(root, `Открыть календарь: ${label}`).trigger('click')
  await flushPromises()

  for (let month = 0; month < 3; month++) {
    const calendar = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].find((dialog) =>
      dialog.querySelector('[data-reka-calendar-cell-trigger]'),
    )
    expect(calendar).toBeDefined()
    const visibleDate = calendar!.querySelector<HTMLElement>(
      '[data-value]:not([data-outside-view])',
    )!.dataset.value!
    if (visibleDate.slice(0, 7) !== value.slice(0, 7)) {
      await button(calendar!, value < visibleDate ? 'Предыдущий месяц' : 'Следующий месяц').trigger(
        'click',
      )
      await flushPromises()
      continue
    }

    const day = calendar!.querySelector<HTMLElement>(`[data-value="${value}"]`)
    expect(day).not.toBeNull()
    await new DOMWrapper(day!).trigger('click')
    await flushPromises()
    return
  }

  throw new Error(`Date not found in calendar: ${value}`)
}

function cell(wrapper: VueWrapper, employeeId: string, date: string) {
  return wrapper.get(`[data-cell-key="${cellKey({ employeeId, workDate: date })}"]`)
}

async function applyMorning(wrapper: VueWrapper, date: string): Promise<void> {
  await cell(wrapper, annaId, date).trigger('click')
  expect(cell(wrapper, annaId, date).attributes('aria-selected')).toBe('true')
  await button(
    wrapper.getComponent(ShiftTemplatePanel).element,
    /^Применить шаблон «Утро»/,
  ).trigger('click')
  expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
    'Несохранённых изменений: 1',
  )
  expect(cell(wrapper, annaId, date).attributes('aria-label')).toContain('07:00–15:00')
}

describe('schedulePage real component integration', () => {
  it('anchors cell and date actions to the grid without adding controls above it', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    const calendarSection = wrapper.get('section[aria-label="Календарь смен"]').element
    const childCount = calendarSection.children.length
    const gridElement = wrapper.get('[role="grid"]').element
    const target = cell(wrapper, borisId, server.range().from)

    await target.trigger('contextmenu', { button: 2 })
    await flushPromises()
    const menu = document.querySelector<HTMLElement>('[role="menu"]')!
    expect(menu).not.toBeNull()
    expect(wrapper.getComponent(CellActionPopover).props('reference')).toBe(target.element)
    expect(calendarSection.children.length).toBe(childCount)
    menu.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(target.element)

    const dateButton = wrapper.get<HTMLButtonElement>('[role="columnheader"] button')
    await dateButton.trigger('click')
    await flushPromises()
    expect(wrapper.getComponent(DateActionPopover).props('reference')).toBe(dateButton.element)
    expect(calendarSection.children.length).toBe(childCount)
    const picker = document.querySelector<HTMLElement>('[role="dialog"]')!
    await button(picker, 'Выделить ячейки даты').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(dateButton.element)
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(2)
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
  })

  it('leaves focus in the custom shift form when opened from a cell menu', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    await cell(wrapper, annaId, server.range().from).trigger('contextmenu', { button: 2 })
    await flushPromises()
    const customAction = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (item) => item.textContent?.includes('Своя смена'),
    )!
    await new DOMWrapper(customAction).trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(document.activeElement).toBe(
      wrapper.getComponent(ShiftTemplatePanel).get('input').element,
    )
  })

  it('keeps the grid, draft, selection and scroll position during a background refresh', async () => {
    const server = createServer()
    const { wrapper, client } = await mountApp()
    const date = server.range().from
    await applyMorning(wrapper, date)
    const grid = wrapper.get('[role="grid"]')
    const gridElement = grid.element as HTMLElement
    const selected = cell(wrapper, annaId, date)
    const selectedElement = selected.element as HTMLElement
    gridElement.scrollTop = 120
    gridElement.scrollLeft = 240
    selectedElement.focus()
    await nextTick()

    const complete = server.deferCalendar()
    const refresh = client.refetchQueries({
      queryKey: scheduleKeys.calendars(configuredScheduleId),
    })
    await flushPromises()
    expect(client.isFetching()).toBe(1)
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(cell(wrapper, annaId, date).element).toBe(selectedElement)
    expect(grid.attributes('aria-busy')).toBe('false')
    expect(grid.attributes('aria-disabled')).not.toBe('true')
    expect(document.activeElement).toBe(selectedElement)
    expect(wrapper.find('[data-state="loading"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Обновляем график…')
    expect(wrapper.getComponent(ScheduleHeader).text()).toContain('Обновлено в')

    // A background read must not block the user's next selection.
    await cell(wrapper, borisId, addCalendarDays(date, 1)).trigger('click')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(2)
    complete()
    await refresh
    await flushPromises()

    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(cell(wrapper, annaId, date).element).toBe(selectedElement)
    expect(selected.attributes('aria-selected')).toBe('true')
    expect(selected.attributes('aria-label')).toContain('07:00–15:00')
    expect(selected.attributes('aria-label')).toContain('изменения не сохранены')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(2)
    expect(gridElement.scrollTop).toBe(120)
    expect(gridElement.scrollLeft).toBe(240)
    expect(wrapper.find('[data-state="loading"]').exists()).toBe(false)
    expect(server.requests.filter((request) => request.method !== 'GET')).toHaveLength(0)
  })

  it('clears selected cells and reapplies a template from the selection toolbar without replacing the grid', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    const date = server.range().from
    const gridElement = wrapper.get('[role="grid"]').element
    const selected = cell(wrapper, borisId, date)
    const selectedElement = selected.element
    await selected.trigger('click')
    expect(selected.attributes('aria-label')).toContain('09:00–17:00')

    await button(wrapper.element, 'Очистить').trigger('click')
    expect(cell(wrapper, borisId, date).element).toBe(selectedElement)
    expect(selected.attributes('aria-selected')).toBe('true')
    expect(selected.attributes('aria-label')).toContain('нет смены')
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Несохранённых изменений: 1',
    )
    expect(wrapper.text()).not.toContain('Шаблон для выделения')

    await button(wrapper.element, 'Поставить шаблон').trigger('click')
    await flushPromises()
    const picker = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Выбрать шаблон смены"]',
    )
    expect(picker).not.toBeNull()
    await button(picker!, /^Утро/).trigger('click')
    await flushPromises()
    expect(document.querySelector('[aria-label="Выбрать шаблон смены"]')).toBeNull()
    expect(selected.attributes('aria-label')).toContain('07:00–15:00')
    expect(selected.attributes('aria-selected')).toBe('true')

    await button(wrapper.element, 'Сохранить').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(cell(wrapper, borisId, date).element).toBe(selectedElement)
    expect(selected.attributes('aria-selected')).toBe('true')
    expect(selected.attributes('aria-label')).not.toContain('изменения не сохранены')
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Все изменения сохранены',
    )
    expect(wrapper.find('[data-state="saved"]').exists()).toBe(false)
    expect(wrapper.find('[data-state="loading"]').exists()).toBe(false)
    const writes = server.requests.filter((request) => request.method !== 'GET')
    expect(writes).toHaveLength(1)
    expect((writes[0]!.body as SaveCellsRequest).changes).toEqual([
      {
        employeeId: borisId,
        workDate: date,
        shift: {
          startTime: '07:00',
          endTime: '15:00',
          endDayOffset: 0,
          sourceTemplateId: templateId,
        },
      },
    ])
  })

  it('keeps background refresh errors actionable while preserving the visible draft', async () => {
    const server = createServer()
    const { wrapper, client } = await mountApp()
    const date = server.range().from
    await applyMorning(wrapper, date)
    const gridElement = wrapper.get('[role="grid"]').element
    const complete = server.deferCalendar()
    const refresh = client.refetchQueries({
      queryKey: scheduleKeys.calendars(configuredScheduleId),
    })
    complete(json({ error: { message: 'Не удалось обновить график.' } }, 400))
    await refresh
    await flushPromises()

    const feedback = wrapper.get('[data-state="error"]')
    expect(feedback.text()).toContain('Не удалось обновить график.')
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(cell(wrapper, annaId, date).attributes('aria-label')).toContain('07:00–15:00')
    expect(cell(wrapper, annaId, date).attributes('aria-selected')).toBe('true')
    await button(feedback.element, 'Повторить').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-state="error"]').exists()).toBe(false))
    expect(wrapper.get('[role="grid"]').element).toBe(gridElement)
    expect(cell(wrapper, annaId, date).attributes('aria-label')).toContain('изменения не сохранены')
  })

  it('still offers review when a background refresh finds a new server version', async () => {
    const server = createServer()
    const { wrapper, client } = await mountApp()
    const date = server.range().from
    await applyMorning(wrapper, date)
    server.advanceRemote()
    await client.refetchQueries({ queryKey: scheduleKeys.calendars(configuredScheduleId) })
    await flushPromises()

    const feedback = wrapper.get('[data-state="remote"]')
    expect(feedback.text()).toContain('На сервере появилась новая версия графика.')
    expect(cell(wrapper, annaId, date).attributes('aria-label')).toContain('07:00–15:00')
    await button(feedback.element, 'Проверить изменения').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Согласовать изменения',
    )
    expect(server.requests.filter((request) => request.method !== 'GET')).toHaveLength(0)
  })

  it('toggles clicked cells independently and applies a template to the remaining selection', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    const date = server.range().from
    const nextDate = addCalendarDays(date, 1)
    const first = cell(wrapper, annaId, date)
    const second = cell(wrapper, borisId, nextDate)
    const removed = cell(wrapper, annaId, nextDate)

    await first.trigger('click')
    await second.trigger('click')
    expect(first.attributes('aria-selected')).toBe('true')
    expect(second.attributes('aria-selected')).toBe('true')
    await first.trigger('click')
    expect(first.attributes('aria-selected')).toBe('false')
    expect(second.attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(1)
    await first.trigger('click')
    expect(first.attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(2)
    await removed.trigger('click')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(3)
    await removed.trigger('click')
    expect(removed.attributes('aria-selected')).toBe('false')
    expect(wrapper.findAll('[data-cell-key][aria-selected="true"]')).toHaveLength(2)

    await button(
      wrapper.getComponent(ShiftTemplatePanel).element,
      /^Применить шаблон «Утро»/,
    ).trigger('click')
    expect(first.attributes('aria-label')).toContain('07:00–15:00')
    expect(second.attributes('aria-label')).toContain('07:00–15:00')
    expect(removed.attributes('aria-label')).toContain('нет смены')
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Несохранённых изменений: 2',
    )

    await button(wrapper.element, 'Сохранить').trigger('click')
    await flushPromises()
    const writes = server.requests.filter((request) => request.method !== 'GET')
    expect(writes).toHaveLength(1)
    expect((writes[0]!.body as SaveCellsRequest).changes).toEqual([
      {
        employeeId: annaId,
        workDate: date,
        shift: {
          startTime: '07:00',
          endTime: '15:00',
          endDayOffset: 0,
          sourceTemplateId: templateId,
        },
      },
      {
        employeeId: borisId,
        workDate: nextDate,
        shift: {
          startTime: '07:00',
          endTime: '15:00',
          endDayOffset: 0,
          sourceTemplateId: templateId,
        },
      },
    ])
  })

  it('saves a template selected through the filtered grid and preserves the hidden employee assignment', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    const date = server.range().from
    await wrapper.get('input[type="search"]').setValue('Анна')
    expect(wrapper.findAll('[data-cell-key]')).toHaveLength(7)
    expect(wrapper.text()).not.toContain('Борис Волков')

    await applyMorning(wrapper, date)
    await button(wrapper.element, 'Сохранить').trigger('click')
    await flushPromises()

    const writes = server.requests.filter((request) => request.method !== 'GET')
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      method: 'PATCH',
      body: {
        expectedVersion: 1,
        changes: [
          {
            employeeId: annaId,
            workDate: date,
            shift: {
              startTime: '07:00',
              endTime: '15:00',
              endDayOffset: 0,
              sourceTemplateId: templateId,
            },
          },
        ],
      },
    })
    expect((writes[0]!.body as SaveCellsRequest).changes[0]!.shift).toEqual({
      startTime: '07:00',
      endTime: '15:00',
      endDayOffset: 0,
      sourceTemplateId: templateId,
    })
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Все изменения сохранены',
    )
    expect(button(wrapper.element, 'Сохранить').element.disabled).toBe(true)
    expect(cell(wrapper, annaId, date).attributes('aria-label')).not.toContain(
      'изменения не сохранены',
    )

    await button(wrapper.element, 'Снять').trigger('click')
    await wrapper.get('input[type="search"]').setValue('')
    expect(wrapper.findAll('[data-cell-key]')).toHaveLength(14)
    expect(cell(wrapper, annaId, date).attributes('aria-label')).toContain('07:00–15:00')
    expect(cell(wrapper, borisId, date).attributes('aria-label')).toContain('09:00–17:00')
  })

  it('keeps edits when the real unsaved dialog is dismissed and changes period only after discard approval', async () => {
    const server = createServer()
    const { wrapper } = await mountApp()
    const range = server.range()
    await applyMorning(wrapper, range.from)
    await button(wrapper.element, 'Следующая неделя').trigger('click')
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')
    expect(dialog?.textContent).toContain('Есть несохранённые изменения')
    expect(
      wrapper
        .find(`[data-cell-key="${cellKey({ employeeId: annaId, workDate: range.from })}"]`)
        .exists(),
    ).toBe(true)

    await button(dialog!, 'Остаться').trigger('click')
    await flushPromises()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Несохранённых изменений: 1',
    )
    expect(cell(wrapper, annaId, range.from).attributes('aria-label')).toContain('07:00–15:00')

    await button(wrapper.element, 'Следующая неделя').trigger('click')
    await flushPromises()
    await button(document.querySelector('[role="alertdialog"]')!, 'Не сохранять и перейти').trigger(
      'click',
    )
    await flushPromises()
    await vi.waitFor(() =>
      expect(
        wrapper
          .find(`[data-cell-key="${cellKey({ employeeId: annaId, workDate: range.to })}"]`)
          .exists(),
      ).toBe(true),
    )
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(wrapper.getComponent(ScheduleHeader).get('[role="status"]').text()).toBe(
      'Все изменения сохранены',
    )
    expect(server.requests.filter((request) => request.method !== 'GET')).toEqual([])
    expect(
      server.requests.some((request) => request.url.searchParams.get('from') === range.to),
    ).toBe(true)
  })

  it('saves before publication and reloads the immutable read-only snapshot from its URL identifier', async () => {
    const server = createServer()
    const app = await mountApp()
    const { wrapper } = app
    const range = server.range()
    await applyMorning(wrapper, range.from)
    await button(wrapper.element, 'Опубликовать').trigger('click')
    await flushPromises()
    const publishDialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(publishDialog.textContent).toContain('Опубликовать график')
    await chooseDate(publishDialog, 'С даты', range.from)
    await chooseDate(publishDialog, 'До даты, не включая', range.to)
    await button(publishDialog, 'Сохранить и опубликовать').trigger('click')
    await flushPromises()
    await vi.waitFor(() =>
      expect(
        document.querySelector('[aria-label="Опубликованный график"] [role="grid"]'),
      ).not.toBeNull(),
    )

    const writes = server.requests.filter((request) => request.method !== 'GET')
    expect(writes.map((request) => request.method)).toEqual(['PATCH', 'POST'])
    expect(writes[0]!.body).toMatchObject({ expectedVersion: 1 })
    expect(writes[1]!.body).toEqual({ expectedVersion: 2, from: range.from, to: range.to })
    expect(window.location.hash).toContain(`publication=${publicationId}`)
    const share = document.querySelector<HTMLInputElement>(
      'input[aria-label="Ссылка на публикацию"]',
    )
    expect(share?.readOnly).toBe(true)
    expect(share?.value).toContain(`publication=${publicationId}`)
    const publishedCell = `[data-cell-key="${cellKey({ employeeId: annaId, workDate: range.from })}"]`
    expect(
      document
        .querySelector(`[aria-label="Опубликованный график"] ${publishedCell}`)
        ?.getAttribute('aria-label'),
    ).toContain('07:00–15:00')
    expect(
      document
        .querySelector('[aria-label="Опубликованный график"] [role="grid"]')
        ?.getAttribute('aria-disabled'),
    ).toBe('true')

    server.advanceRemote()
    await unmountApp(app)
    await flushPromises()
    const reloaded = await mountApp()
    await flushPromises()
    await vi.waitFor(() =>
      expect(
        document.querySelector(`[aria-label="Опубликованный график"] ${publishedCell}`),
      ).not.toBeNull(),
    )
    expect(reloaded.wrapper.get(publishedCell).attributes('aria-label')).toContain('12:00–20:00')
    expect(
      document
        .querySelector(`[aria-label="Опубликованный график"] ${publishedCell}`)
        ?.getAttribute('aria-label'),
    ).toContain('07:00–15:00')
    expect(
      server.requests.filter((request) =>
        request.url.pathname.endsWith(`/publications/${publicationId}`),
      ),
    ).toHaveLength(2)
    expect(server.requests.filter((request) => request.method !== 'GET')).toHaveLength(2)
  })
})
