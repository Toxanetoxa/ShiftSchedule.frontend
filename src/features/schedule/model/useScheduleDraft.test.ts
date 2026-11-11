import type {
  ApiDateRange,
  ApiShift,
  CalendarResponse,
  ChangedCell,
  SaveCellsResponse,
} from '@schedule/api/types'
import type { CellRef, ScheduleRow, ShiftInput, ShiftViewModel } from '@schedule/domain/types'
import type { EffectScope } from 'vue'
import { applyScheduleOperation } from '@schedule/domain/operations'
import { cellKey } from '@schedule/domain/types'
import { afterEach, describe, expect, it } from 'vitest'
import { effectScope } from 'vue'
import { useScheduleDraft } from './useScheduleDraft'

const scheduleId = '00000000-0000-4000-8000-000000000001'
const firstEmployee = '00000000-0000-4000-8000-000000000201'
const secondEmployee = '00000000-0000-4000-8000-000000000202'
const templateId = '00000000-0000-4000-8000-000000000101'
const monday = '2026-11-09'
const tuesday = '2026-11-10'
const first: CellRef = { employeeId: firstEmployee, workDate: monday }
const second: CellRef = { employeeId: secondEmployee, workDate: tuesday }
const defaultRange: ApiDateRange = { from: monday, to: '2026-11-16' }
const scopes: EffectScope[] = []

afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()))

function shift(
  cell: CellRef,
  startTime = '08:00',
  endTime = '16:00',
  options: Partial<ApiShift> = {},
): ApiShift {
  const start = new Date(`${cell.workDate}T${startTime}:00+03:00`)
  const end = new Date(`${cell.workDate}T${endTime}:00+03:00`)
  return {
    id: `assignment-${cell.employeeId}-${cell.workDate}`,
    ...cell,
    startTime,
    endTime,
    endDayOffset: 0,
    sourceTemplateId: null,
    startsAt: start.toISOString().replace('.000Z', 'Z'),
    endsAt: end.toISOString().replace('.000Z', 'Z'),
    durationMinutes: (end.getTime() - start.getTime()) / 60_000,
    label: 'Своя смена',
    colorKey: 'custom',
    ...options,
  }
}

function calendar(
  version = 1,
  shifts: ApiShift[] = [],
  range: ApiDateRange = defaultRange,
): CalendarResponse {
  const assignments = shifts
    .filter((item) => item.workDate >= range.from && item.workDate < range.to)
    .map((item) => ({ ...item }))
  const coverage = []
  for (
    const date = new Date(`${range.from}T12:00:00Z`);
    date.toISOString().slice(0, 10) < range.to;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const workDate = date.toISOString().slice(0, 10)
    const shiftCount = assignments.filter((item) => item.workDate === workDate).length
    coverage.push({ date: workDate, shiftCount, covered: shiftCount > 0 })
  }
  return {
    schedule: { id: scheduleId, name: 'График', timeZone: 'Europe/Moscow', version },
    range: { ...range },
    employees: [firstEmployee, secondEmployee].map((id, index) => ({
      id,
      fullName: index ? 'Борис Волков' : 'Анна Смирнова',
      positionTitle: 'Агент',
      avatarUrl: null,
      isActive: true,
      scheduledMinutes: assignments
        .filter((item) => item.employeeId === id)
        .reduce((sum, item) => sum + item.durationMinutes, 0),
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
    shifts: assignments,
    coverage,
  }
}

function view(value: ApiShift): ShiftViewModel {
  return {
    id: value.id,
    startTime: value.startTime,
    endTime: value.endTime,
    endDayOffset: value.endDayOffset,
    sourceTemplateId: value.sourceTemplateId,
    label: value.label,
    colorKey: value.colorKey,
    durationMinutes: value.durationMinutes,
  }
}

function input(value: ShiftInput): ShiftInput {
  return {
    startTime: value.startTime,
    endTime: value.endTime,
    endDayOffset: value.endDayOffset,
    sourceTemplateId: value.sourceTemplateId,
  }
}

function changedCell(cell: CellRef, value: ApiShift | null): ChangedCell {
  if (!value) return { ...cell, shift: null }
  const { employeeId: _employeeId, workDate: _workDate, ...normalized } = value
  return { ...cell, shift: normalized }
}

function saved(version: number, values: ChangedCell[]): SaveCellsResponse {
  return { version, changedCells: values }
}

function createDraft(snapshot?: CalendarResponse) {
  const scope = effectScope()
  scopes.push(scope)
  const draft = scope.run(() => useScheduleDraft())!
  if (snapshot) expect(draft.acceptCalendar(snapshot)).toBe(true)
  return draft
}

type Draft = ReturnType<typeof useScheduleDraft>

function cell(draft: Draft, reference: CellRef): ShiftViewModel | null {
  return (
    draft.rows.value.find((row) => row.employee.id === reference.employeeId)?.cells[
      reference.workDate
    ] || null
  )
}

function edit(draft: Draft, reference: CellRef, value: ApiShift | null): void {
  draft.rows.value = draft.rows.value.map((row) =>
    row.employee.id === reference.employeeId
      ? { ...row, cells: { ...row.cells, [reference.workDate]: value ? view(value) : null } }
      : row,
  )
}

describe('useScheduleDraft baseline and editing', () => {
  it('adapts the complete remote snapshot without mutating query data or creating a dirty payload', () => {
    const snapshot = calendar(1, [shift(first)])
    const original = structuredClone(snapshot)
    const draft = createDraft(snapshot)
    expect(draft.rows.value.map((row) => row.employee.name)).toEqual([
      'Анна Смирнова',
      'Борис Волков',
    ])
    expect(cell(draft, first)?.startTime).toBe('08:00')
    expect(draft.rows.value[0]!.scheduledMinutes).toBe(480)
    expect(draft.templates.value[0]).toMatchObject({
      id: templateId,
      label: 'Утро',
      startTime: '07:00',
    })
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.freeze()).toBeNull()
    expect(draft.conflicts.value).toEqual([])
    expect(snapshot).toEqual(original)
  })

  it('freezes only user-editable input fields and the version from the first actual edit', () => {
    const draft = createDraft(calendar(4))
    const local = shift(first, '10:00', '23:00')
    edit(draft, first, local)
    const frozen = draft.freeze()!
    expect(draft.saveVersion.value).toBe(4)
    expect(draft.dirtyKeys.value).toEqual([cellKey(first)])
    expect(frozen.expectedVersion).toBe(4)
    expect(frozen.changes).toEqual([{ ...first, shift: input(local) }])
    expect(frozen.range).toEqual(defaultRange)
    expect(frozen.baseCalendar.schedule.version).toBe(4)
    expect(draft.rows.value[0]!.scheduledMinutes).toBe(780)
  })

  it('keeps a frozen save detached from subsequent local edits and refetches', () => {
    const draft = createDraft(calendar(1, [shift(second)]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    const frozen = draft.freeze()!
    const original = structuredClone(frozen)
    edit(draft, first, shift(first, '11:00', '19:00'))
    edit(draft, second, shift(second, '12:00', '20:00'))
    draft.acceptCalendar(calendar(2, [shift(second, '09:00', '17:00')]))
    expect(frozen).toEqual(original)
    expect(frozen.changes).toHaveLength(1)
    expect(frozen.changes[0]!.shift!.startTime).toBe('10:00')
    expect(draft.freeze()!.changes).toHaveLength(2)
  })

  it('uses the latest remote value as the baseline for a newly edited cell after a refetch', () => {
    const draft = createDraft(calendar(1, [shift(first), shift(second)]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    const newestSecond = shift(second, '09:00', '17:00')
    expect(draft.acceptCalendar(calendar(2, [shift(first), newestSecond]))).toBe(true)
    expect(cell(draft, first)?.startTime).toBe('10:00')
    expect(cell(draft, second)?.startTime).toBe('09:00')
    expect(draft.saveVersion.value).toBe(1)
    expect(draft.remoteUpdated.value).toBe(true)
    expect(draft.conflicts.value).toEqual([])

    edit(draft, second, shift(second, '12:00', '20:00'))
    expect(draft.dirtyCount.value).toBe(2)
    edit(draft, second, newestSecond)
    expect(draft.dirtyKeys.value).toEqual([cellKey(first)])
    expect(draft.freeze()!.expectedVersion).toBe(1)
    expect(draft.freeze()!.changes).toEqual([
      { ...first, shift: input(shift(first, '10:00', '18:00')) },
    ])
  })

  it('removes a reverted edit and does not count technical IDs or computed totals as user changes', () => {
    const remote = shift(first)
    const draft = createDraft(calendar(1, [remote]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    edit(draft, first, remote)
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.freeze()).toBeNull()
    draft.rows.value = draft.rows.value.map((row) => ({
      ...row,
      scheduledMinutes: 9999,
      cells: Object.fromEntries(
        Object.entries(row.cells).map(([date, value]) => [
          date,
          value ? { ...value, id: 'new-technical-id' } : null,
        ]),
      ),
    }))
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.freeze()).toBeNull()
  })

  it('treats a sourceTemplateId change as a real edit even with the same local times', () => {
    const remote = shift(first, '07:00', '15:00', {
      sourceTemplateId: templateId,
      label: 'Утро',
      colorKey: 'morning',
    })
    const draft = createDraft(calendar(1, [remote]))
    edit(draft, first, { ...remote, sourceTemplateId: null })
    expect(draft.dirtyCount.value).toBe(1)
    expect(draft.freeze()!.changes).toEqual([
      {
        ...first,
        shift: { startTime: '07:00', endTime: '15:00', endDayOffset: 0, sourceTemplateId: null },
      },
    ])
  })

  it('does not clear assignments from employees omitted by a filtered editing view', () => {
    const draft = createDraft(calendar(1, [shift(first), shift(second)]))
    const visible: ScheduleRow[] = draft.rows.value
      .filter((row) => row.employee.id === firstEmployee)
      .map((row) => ({
        ...row,
        cells: { ...row.cells, [monday]: view(shift(first, '10:00', '18:00')) },
      }))
    draft.rows.value = visible
    expect(draft.rows.value).toHaveLength(2)
    expect(cell(draft, second)?.startTime).toBe('08:00')
    expect(draft.dirtyKeys.value).toEqual([cellKey(first)])
    expect(draft.freeze()!.changes).toEqual([
      { ...first, shift: input(shift(first, '10:00', '18:00')) },
    ])
  })

  it('serializes a move as one save with source deletion and target assignment', () => {
    const initial = calendar(7, [shift(first)])
    const draft = createDraft(initial)
    const result = applyScheduleOperation(
      {
        rows: draft.rows.value,
        templates: draft.templates.value,
        editableDates: [monday, tuesday],
      },
      { kind: 'move', source: first, target: second },
    )
    expect(result.status).toBe('applied')
    if (result.status !== 'applied') throw new Error('The test move should be valid.')
    draft.rows.value = result.rows
    const frozen = draft.freeze()!
    expect(frozen.expectedVersion).toBe(7)
    expect(frozen.changes).toHaveLength(2)
    expect(frozen.changes).toEqual(
      expect.arrayContaining([
        { ...first, shift: null },
        { ...second, shift: input(shift(first)) },
      ]),
    )
    expect(draft.rows.value[0]!.scheduledMinutes).toBe(0)
    expect(draft.rows.value[1]!.scheduledMinutes).toBe(480)
    expect(initial.shifts).toHaveLength(1)
    expect(initial.shifts[0]!.employeeId).toBe(firstEmployee)
  })
})

describe('useScheduleDraft remote versions and rebase', () => {
  it('ignores delayed older GET responses without reverting an accepted snapshot', () => {
    const draft = createDraft(calendar(5, [shift(first, '10:00', '18:00')]))
    expect(draft.acceptCalendar(calendar(4, [shift(first)]))).toBe(false)
    expect(draft.latestRemote.value!.schedule.version).toBe(5)
    expect(cell(draft, first)?.startTime).toBe('10:00')
  })

  it('requires explicit current-version conflict resolutions before rebasing local intent', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    const remote = shift(first, '12:00', '20:00')
    draft.acceptCalendar(calendar(2, [remote]))
    expect(draft.conflicts.value).toHaveLength(1)
    expect(draft.conflicts.value[0]).toMatchObject({
      cell: first,
      employeeName: 'Анна Смирнова',
      local: { startTime: '10:00' },
      remote: { startTime: '12:00' },
    })
    expect(draft.rebase(1, [{ cell: first, choice: 'local' }])).toBe(false)
    expect(draft.rebase(2, [])).toBe(false)
    expect(draft.saveVersion.value).toBe(1)
    expect(cell(draft, first)?.startTime).toBe('10:00')
    expect(draft.rebase(2, [{ cell: first, choice: 'local' }])).toBe(true)
    expect(draft.saveVersion.value).toBe(2)
    expect(draft.dirtyCount.value).toBe(1)
    expect(draft.conflicts.value).toEqual([])
    draft.acceptCalendar(calendar(3, [remote]))
    expect(draft.conflicts.value).toEqual([])
    expect(draft.saveVersion.value).toBe(2)
    expect(draft.remoteUpdated.value).toBe(true)
  })

  it('accepts a remote resolution by discarding only that local edit', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    edit(draft, second, shift(second))
    draft.acceptCalendar(calendar(2, [shift(first, '12:00', '20:00')]))
    expect(draft.rebase(2, [{ cell: first, choice: 'remote' }])).toBe(true)
    expect(cell(draft, first)?.startTime).toBe('12:00')
    expect(draft.dirtyKeys.value).toEqual([cellKey(second)])
    expect(draft.freeze()!.expectedVersion).toBe(2)
  })

  it('does not silently remove a dirty entry when a background GET already equals the local intent', () => {
    const draft = createDraft(calendar(1))
    const local = shift(first, '10:00', '18:00')
    edit(draft, first, local)
    draft.acceptCalendar(calendar(2, [local]))
    expect(draft.conflicts.value).toEqual([])
    expect(draft.dirtyKeys.value).toEqual([cellKey(first)])
    expect(draft.freeze()!.expectedVersion).toBe(1)
    expect(draft.rebase(2, [])).toBe(true)
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.freeze()).toBeNull()
  })

  it('rejects a range or schedule change while dirty and allows it after an approved reset', () => {
    const draft = createDraft(calendar(3))
    edit(draft, first, shift(first))
    const otherRange = calendar(3, [], { from: '2026-11-16', to: '2026-11-23' })
    const otherBoard = calendar(4)
    otherBoard.schedule.id = '00000000-0000-4000-8000-000000000002'
    expect(draft.acceptCalendar(otherRange)).toBe(false)
    expect(draft.acceptCalendar(otherBoard)).toBe(false)
    expect(draft.latestRemote.value!.range).toEqual(defaultRange)
    expect(draft.dirtyCount.value).toBe(1)
    draft.reset()
    expect(draft.latestRemote.value).toBeNull()
    expect(draft.saveVersion.value).toBeNull()
    expect(draft.rows.value).toEqual([])
    expect(draft.freeze()).toBeNull()
    expect(draft.acceptCalendar(otherRange)).toBe(true)
    expect(draft.latestRemote.value!.range).toEqual(otherRange.range)
  })

  it('discards edits against the newest remote data without clearing the loaded range', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    edit(draft, first, shift(first, '10:00', '18:00'))
    draft.acceptCalendar(calendar(2, [shift(first, '12:00', '20:00')]))
    draft.discard()
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.conflicts.value).toEqual([])
    expect(draft.latestRemote.value!.range).toEqual(defaultRange)
    expect(cell(draft, first)?.startTime).toBe('12:00')
    expect(draft.saveVersion.value).toBe(2)
    expect(draft.remoteUpdated.value).toBe(false)
  })
})

describe('useScheduleDraft save acknowledgements', () => {
  it('merges normalized changedCells before clearing the acknowledged dirty batch', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    const local = shift(first, '10:00', '18:00')
    edit(draft, first, local)
    const frozen = draft.freeze()!
    const normalized = { ...local, id: 'server-assignment-id', label: 'Нормализованная смена' }
    draft.acceptSave(saved(2, [changedCell(first, normalized)]), frozen)
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.latestRemote.value!.schedule.version).toBe(2)
    expect(draft.saveVersion.value).toBe(2)
    expect(cell(draft, first)).toMatchObject({
      id: 'server-assignment-id',
      startTime: '10:00',
      label: 'Нормализованная смена',
    })
    expect(draft.rows.value[0]!.scheduledMinutes).toBe(480)
    expect(draft.acceptCalendar(calendar(1, [shift(first)]))).toBe(false)
    expect(cell(draft, first)?.startTime).toBe('10:00')
  })

  it('keeps a newer GET snapshot when an older PATCH acknowledgement arrives', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    const local = shift(first, '10:00', '18:00')
    edit(draft, first, local)
    const frozen = draft.freeze()!
    draft.acceptCalendar(calendar(3, [shift(first, '12:00', '20:00'), shift(second)]))
    draft.acceptSave(saved(2, [changedCell(first, local)]), frozen)
    expect(draft.latestRemote.value!.schedule.version).toBe(3)
    expect(cell(draft, first)?.startTime).toBe('12:00')
    expect(cell(draft, second)?.startTime).toBe('08:00')
    expect(draft.dirtyCount.value).toBe(0)
    expect(draft.saveVersion.value).toBe(3)
  })

  it('clears only frozen intents that are unchanged while preserving edits made after Save started', () => {
    const draft = createDraft(calendar(1))
    const firstIntent = shift(first, '10:00', '18:00')
    edit(draft, first, firstIntent)
    const frozen = draft.freeze()!
    edit(draft, first, shift(first, '11:00', '19:00'))
    edit(draft, second, shift(second, '12:00', '20:00'))
    draft.acceptSave(saved(2, [changedCell(first, firstIntent)]), frozen)
    expect(draft.dirtyCount.value).toBe(2)
    expect(cell(draft, first)?.startTime).toBe('11:00')
    expect(cell(draft, second)?.startTime).toBe('12:00')
    expect(draft.saveVersion.value).toBe(2)
    expect(draft.conflicts.value).toEqual([])
    edit(draft, first, firstIntent)
    expect(draft.dirtyKeys.value).toEqual([cellKey(second)])
    expect(draft.freeze()!.expectedVersion).toBe(2)
  })

  it('retains the accepted PATCH version for remaining edits when an even newer GET requires review', () => {
    const draft = createDraft(calendar(1))
    const firstIntent = shift(first, '10:00', '18:00')
    edit(draft, first, firstIntent)
    const frozen = draft.freeze()!
    edit(draft, first, shift(first, '11:00', '19:00'))
    draft.acceptCalendar(calendar(3, [shift(first, '12:00', '20:00')]))
    draft.acceptSave(saved(2, [changedCell(first, firstIntent)]), frozen)
    expect(draft.latestRemote.value!.schedule.version).toBe(3)
    expect(cell(draft, first)?.startTime).toBe('11:00')
    expect(draft.saveVersion.value).toBe(2)
    expect(draft.remoteUpdated.value).toBe(true)
    expect(draft.conflicts.value).toHaveLength(1)
  })

  it('acknowledges deletion and preserves newer edits outside the frozen changeset', () => {
    const draft = createDraft(calendar(1, [shift(first)]))
    edit(draft, first, null)
    const frozen = draft.freeze()!
    edit(draft, second, shift(second))
    draft.acceptSave(saved(2, [changedCell(first, null)]), frozen)
    expect(cell(draft, first)).toBeNull()
    expect(draft.dirtyKeys.value).toEqual([cellKey(second)])
    expect(draft.rows.value[0]!.scheduledMinutes).toBe(0)
    expect(draft.rows.value[1]!.scheduledMinutes).toBe(480)
    expect(draft.freeze()!.changes).toEqual([{ ...second, shift: input(shift(second)) }])
  })

  it('ignores a delayed save acknowledgement after an approved range change', () => {
    const draft = createDraft(calendar(1))
    const local = shift(first)
    edit(draft, first, local)
    const frozen = draft.freeze()!
    draft.reset()
    const newRange = { from: '2026-11-16', to: '2026-11-23' }
    draft.acceptCalendar(calendar(3, [], newRange))
    draft.acceptSave(saved(2, [changedCell(first, local)]), frozen)
    expect(draft.latestRemote.value!.range).toEqual(newRange)
    expect(draft.latestRemote.value!.schedule.version).toBe(3)
    expect(draft.dirtyCount.value).toBe(0)
    expect(cell(draft, first)).toBeNull()
  })
})
