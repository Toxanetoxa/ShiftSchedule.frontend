import type {
  CellRef,
  DragPayload,
  ScheduleRow,
  ShiftTemplate,
  ShiftViewModel,
} from '@schedule/domain/types'
import type { EffectScope } from 'vue'
import { dirtyCellKeys } from '@schedule/domain/operations'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useScheduleTransfers } from './useScheduleTransfers'

const monday = '2026-11-09'
const tuesday = '2026-11-10'
const source: CellRef = { employeeId: 'first', workDate: monday }
const target: CellRef = { employeeId: 'second', workDate: tuesday }
const assignmentPayload: DragPayload = { kind: 'assignment', source }
const template: ShiftTemplate = {
  id: 'template-morning',
  label: 'Утро',
  colorKey: 'morning',
  startTime: '08:00',
  endTime: '16:00',
  endDayOffset: 0,
  sourceTemplateId: 'template-morning',
  durationMinutes: 480,
}

function sourceShift(): ShiftViewModel {
  return {
    id: 'assignment-original',
    label: 'Утро',
    colorKey: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    endDayOffset: 0,
    sourceTemplateId: template.id,
    durationMinutes: 480,
  }
}

function makeRows(occupied = false): ScheduleRow[] {
  return [
    {
      employee: { id: 'first', name: 'Анна', position: 'Менеджер' },
      cells: { [monday]: sourceShift() },
      scheduledMinutes: 480,
    },
    {
      employee: { id: 'second', name: 'Борис', position: 'Оператор' },
      cells: occupied
        ? {
            [tuesday]: {
              ...sourceShift(),
              id: 'assignment-target',
              label: 'Своя смена',
              colorKey: 'custom',
              startTime: '10:00',
              endTime: '18:00',
              sourceTemplateId: null,
            },
          }
        : {},
      scheduledMinutes: occupied ? 480 : 0,
    },
  ]
}

const scopes: EffectScope[] = []

afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
})

function createTransfers(occupied = false) {
  const rows = ref(makeRows(occupied))
  const templates = ref<ShiftTemplate[]>([{ ...template }])
  const editableDates = ref([monday, tuesday])
  const disabled = ref(false)
  const currentScope = ref('schedule-1:week-1')
  const onCommit = vi.fn()
  const scope = effectScope()
  scopes.push(scope)
  const transfers = scope.run(() =>
    useScheduleTransfers({
      rows,
      templates,
      editableDates,
      disabled,
      scope: currentScope,
      onCommit,
    }),
  )!

  return { rows, templates, editableDates, disabled, currentScope, onCommit, transfers }
}

describe('useScheduleTransfers', () => {
  it('starts and previews a move without changing assignments or creating dirty cells', () => {
    const { rows, transfers, onCommit } = createTransfers()
    const before = rows.value

    expect(transfers.start(assignmentPayload)).toBe(true)
    expect(transfers.canDrop(assignmentPayload, target)).toBe(true)
    expect(transfers.canDrop(assignmentPayload, { employeeId: 'unknown', workDate: tuesday })).toBe(
      false,
    )
    expect(rows.value).toBe(before)
    expect(rows.value).toEqual(makeRows())
    expect(dirtyCellKeys(makeRows(), rows.value)).toEqual([])
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('cancels an active transfer without committing or making the schedule dirty', () => {
    const { rows, transfers, onCommit } = createTransfers()
    const before = rows.value
    transfers.start(assignmentPayload)
    transfers.canDrop(assignmentPayload, target)

    transfers.cancel()

    expect(transfers.activePayload.value).toBeNull()
    expect(transfers.pending.value).toBeNull()
    expect(rows.value).toBe(before)
    expect(dirtyCellKeys(makeRows(), rows.value)).toEqual([])
    expect(onCommit).not.toHaveBeenCalled()
    expect(transfers.drop(assignmentPayload, target)).toBe(false)
    expect(rows.value).toBe(before)
  })

  it('copies template metadata into an empty target and keeps the source template available', () => {
    const { rows, templates, transfers, onCommit } = createTransfers()
    const payload: DragPayload = { kind: 'template', templateId: template.id }
    expect(transfers.start(payload)).toBe(true)
    expect(transfers.canDrop(payload, target)).toBe(true)

    expect(transfers.drop(payload, target)).toBe(true)

    expect(rows.value[1]!.cells[tuesday]).toEqual({
      label: 'Утро',
      colorKey: 'morning',
      startTime: '08:00',
      endTime: '16:00',
      endDayOffset: 0,
      sourceTemplateId: template.id,
      durationMinutes: 480,
    })
    expect(rows.value[1]!.cells[tuesday]).not.toHaveProperty('id')
    expect(rows.value[0]!.cells[monday]).toEqual(sourceShift())
    expect(templates.value).toEqual([template])
    expect(onCommit).toHaveBeenCalledExactlyOnceWith([target])
    expect(transfers.activePayload.value).toBeNull()
  })

  it('commits an empty-target move once with source and target already updated atomically', () => {
    const { rows, transfers, onCommit } = createTransfers()
    onCommit.mockImplementation((cells: CellRef[]) => {
      expect(rows.value[0]!.cells[monday]).toBeNull()
      expect(rows.value[1]!.cells[tuesday]).toMatchObject({
        startTime: '08:00',
        endTime: '16:00',
        sourceTemplateId: template.id,
      })
      expect(new Set(cells.map((cell) => `${cell.employeeId}:${cell.workDate}`))).toEqual(
        new Set(['first:2026-11-09', 'second:2026-11-10']),
      )
    })
    transfers.start(assignmentPayload)

    expect(transfers.drop(assignmentPayload, target)).toBe(true)

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(rows.value[1]!.cells[tuesday]).not.toHaveProperty('id')
    expect(dirtyCellKeys(makeRows(), rows.value)).toHaveLength(2)
  })

  it('keeps both occupied cells unchanged while awaiting confirmation and after cancellation', () => {
    const { rows, transfers, onCommit } = createTransfers(true)
    const before = rows.value
    transfers.start(assignmentPayload)
    expect(transfers.canDrop(assignmentPayload, target)).toBe(true)

    expect(transfers.drop(assignmentPayload, target)).toBe(false)

    expect(transfers.replacementOpen.value).toBe(true)
    expect(rows.value).toBe(before)
    expect(rows.value).toEqual(makeRows(true))
    expect(onCommit).not.toHaveBeenCalled()

    transfers.cancel()

    expect(transfers.replacementOpen.value).toBe(false)
    expect(transfers.confirmReplacement()).toBe(false)
    expect(rows.value).toBe(before)
    expect(dirtyCellKeys(makeRows(true), rows.value)).toEqual([])
    expect(onCommit).not.toHaveBeenCalled()
  })

  it.each(['source', 'target'] as const)(
    'rejects confirmation if the %s changed after the dialog opened',
    (changedCell) => {
      const { rows, transfers, onCommit } = createTransfers(true)
      transfers.start(assignmentPayload)
      transfers.drop(assignmentPayload, target)
      expect(transfers.replacementOpen.value).toBe(true)

      const index = changedCell === 'source' ? 0 : 1
      const date = changedCell === 'source' ? monday : tuesday
      const previous = rows.value[index]!.cells[date]!
      rows.value[index]!.cells[date] = { ...previous, startTime: '09:00' }
      const beforeConfirmation = JSON.stringify(rows.value)

      expect(transfers.confirmReplacement()).toBe(false)

      expect(JSON.stringify(rows.value)).toBe(beforeConfirmation)
      expect(transfers.error.value).toBeTruthy()
      expect(onCommit).not.toHaveBeenCalled()
    },
  )

  it.each([false, true])(
    'cancels a transfer on scope change and rejects a late drop (pending: %s)',
    async (occupied) => {
      const { rows, transfers, currentScope, onCommit } = createTransfers(occupied)
      const before = rows.value
      transfers.start(assignmentPayload)
      if (occupied) transfers.drop(assignmentPayload, target)

      currentScope.value = 'schedule-1:week-2'
      await nextTick()

      expect(transfers.activePayload.value).toBeNull()
      expect(transfers.pending.value).toBeNull()
      expect(transfers.drop(assignmentPayload, target)).toBe(false)
      expect(transfers.confirmReplacement()).toBe(false)
      expect(rows.value).toBe(before)
      expect(rows.value).toEqual(makeRows(occupied))
      expect(onCommit).not.toHaveBeenCalled()
    },
  )

  it('rejects a drop immediately when editing becomes disabled after drag start', async () => {
    const { rows, transfers, disabled, onCommit } = createTransfers()
    const before = rows.value
    transfers.start(assignmentPayload)

    disabled.value = true

    expect(transfers.canDrop(assignmentPayload, target)).toBe(false)
    expect(transfers.drop(assignmentPayload, target)).toBe(false)
    await nextTick()
    expect(transfers.activePayload.value).toBeNull()
    expect(rows.value).toBe(before)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('treats a same-cell drop as a no-op without a commit callback', () => {
    const { rows, transfers, onCommit } = createTransfers()
    const before = rows.value
    transfers.start(assignmentPayload)

    expect(transfers.drop(assignmentPayload, source)).toBe(true)

    expect(rows.value).toBe(before)
    expect(dirtyCellKeys(makeRows(), rows.value)).toEqual([])
    expect(transfers.replacementOpen.value).toBe(false)
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('uses the same replacement pipeline for the keyboard move command', () => {
    const { rows, transfers, onCommit } = createTransfers(true)
    expect(transfers.beginMove(source)).toBe(true)
    expect(transfers.keyboardSource.value).toEqual(source)

    expect(transfers.chooseTarget(target)).toBe(false)

    expect(transfers.replacementOpen.value).toBe(true)
    expect(rows.value).toEqual(makeRows(true))
    expect(onCommit).not.toHaveBeenCalled()

    expect(transfers.confirmReplacement()).toBe(true)

    expect(rows.value[0]!.cells[monday]).toBeNull()
    expect(rows.value[1]!.cells[tuesday]).toMatchObject({
      startTime: '08:00',
      endTime: '16:00',
      sourceTemplateId: template.id,
    })
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(transfers.keyboardSource.value).toBeNull()
    expect(transfers.replacementOpen.value).toBe(false)
  })
})
