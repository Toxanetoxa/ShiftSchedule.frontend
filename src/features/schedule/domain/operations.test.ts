import type { ScheduleOperationContext, ScheduleOperationResult } from './operations'
import type { CellRef, ScheduleRow, ShiftInput, ShiftTemplate, ShiftViewModel } from './types'
import { describe, expect, it } from 'vitest'
import { applyScheduleOperation, dirtyCellKeys, sameShift } from './operations'

const monday = '2026-11-09'
const tuesday = '2026-11-10'
const wednesday = '2026-11-11'
const first: CellRef = { employeeId: 'first', workDate: monday }
const second: CellRef = { employeeId: 'second', workDate: tuesday }
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

function shift(startTime = '08:00', endTime = '16:00', endDayOffset: 0 | 1 = 0): ShiftViewModel {
  return {
    id: 'assignment-id',
    label: 'Своя смена',
    colorKey: 'custom',
    startTime,
    endTime,
    endDayOffset,
    sourceTemplateId: null,
    durationMinutes: 480,
  }
}

function row(id: string, cells: ScheduleRow['cells'] = {}, active?: boolean): ScheduleRow {
  return { employee: { id, name: id, position: 'Менеджер', active }, cells, scheduledMinutes: 0 }
}

function context(rows: ScheduleRow[] = [row('first'), row('second')]): ScheduleOperationContext {
  return { rows, templates: [template], editableDates: [monday, tuesday, wednesday] }
}

function appliedRows(result: ScheduleOperationResult): ScheduleRow[] {
  expect(result.status).toBe('applied')
  if (result.status !== 'applied') {
    throw new Error(`Expected applied, got ${result.status}`)
  }

  return result.rows
}

describe('applyScheduleOperation', () => {
  it('assigns a template snapshot without reusing its ID or trusting its duration', () => {
    const original = context()
    original.templates = [{ ...template, durationMinutes: 1, sourceTemplateId: 'wrong-source' }]
    const before = structuredClone(original)
    Object.freeze(original.rows[0]!.cells)
    Object.freeze(original.rows[0])
    Object.freeze(original.rows)

    const result = applyScheduleOperation(original, {
      kind: 'template',
      templateId: template.id,
      targets: [first],
    })
    const rows = appliedRows(result)

    expect(rows[0]!.cells[monday]).toEqual({
      label: 'Утро',
      colorKey: 'morning',
      startTime: '08:00',
      endTime: '16:00',
      endDayOffset: 0,
      sourceTemplateId: template.id,
      durationMinutes: 480,
    })
    expect(original).toEqual(before)
    expect(rows[1]).toBe(original.rows[1])
  })

  it('moves an assignment atomically and drops its technical ID at the destination', () => {
    const original = context([row('first', { [monday]: shift() }), row('second')])
    const before = structuredClone(original)
    const result = applyScheduleOperation(original, { kind: 'move', source: first, target: second })
    const rows = appliedRows(result)

    expect(rows[0]!.cells[monday]).toBeNull()
    expect(rows[1]!.cells[tuesday]).toEqual({ ...shift(), id: undefined })
    expect(rows[1]!.cells[tuesday]).not.toHaveProperty('id')
    expect(result.status === 'applied' && result.changedCells).toEqual([second, first])
    expect(original).toEqual(before)
  })

  it('returns no changes for an identical assignment or a same-cell move', () => {
    const original = context([row('first', { [monday]: { ...template, id: 'server-assignment' } })])
    expect(
      applyScheduleOperation(original, {
        kind: 'template',
        templateId: template.id,
        targets: [first],
      }),
    ).toEqual({ status: 'noop' })
    expect(
      applyScheduleOperation(original, { kind: 'move', source: first, target: first }),
    ).toEqual({ status: 'noop' })
    expect(applyScheduleOperation(context(), { kind: 'clear', targets: [first] })).toEqual({
      status: 'noop',
    })
  })

  it('does not change an occupied target or source until replacement is explicitly confirmed', () => {
    const original = context([
      row('first', { [monday]: shift() }),
      row('second', { [tuesday]: shift('10:00', '19:00') }),
    ])
    const before = structuredClone(original)
    const command = { kind: 'move' as const, source: first, target: second }

    expect(applyScheduleOperation(original, command)).toEqual({
      status: 'confirm-replace',
      source: first,
      targets: [second],
    })
    // Cancelling is represented by discarding that result; neither input cell was changed.
    expect(original).toEqual(before)

    const rows = appliedRows(applyScheduleOperation(original, command, { replaceOccupied: true }))
    expect(rows[0]!.cells[monday]).toBeNull()
    expect(rows[1]!.cells[tuesday]?.startTime).toBe('08:00')
    expect(original).toEqual(before)
  })

  it('rolls back the whole move when a night shift overlaps a loaded neighbouring date', () => {
    const original = context([
      row('first', { [monday]: shift('22:00', '06:00', 1) }),
      row('second', { [wednesday]: shift('05:00', '09:00') }),
    ])
    const before = structuredClone(original)
    // The neighbouring date is loaded but not editable/visible in this fragment.
    original.editableDates = [monday, tuesday]
    const result = applyScheduleOperation(original, { kind: 'move', source: first, target: second })

    expect(result).toMatchObject({ status: 'blocked', reason: 'overlap' })
    expect(result.status === 'blocked' && result.conflictingCells).toContainEqual({
      employeeId: 'second',
      workDate: wednesday,
    })
    expect(original.rows).toEqual(before.rows)
  })

  it('allows touching night boundaries and checks the date before the target as well', () => {
    const previousNight = row('second', { [monday]: shift('22:00', '06:00', 1) })
    const input: ShiftInput = {
      startTime: '06:00',
      endTime: '14:00',
      endDayOffset: 0,
      sourceTemplateId: null,
    }
    expect(
      applyScheduleOperation(context([previousNight]), { kind: 'custom', input, targets: [second] })
        .status,
    ).toBe('applied')
    expect(
      applyScheduleOperation(context([previousNight]), {
        kind: 'custom',
        input: { ...input, startTime: '05:59' },
        targets: [second],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'overlap' })
  })

  it('checks the final replacement rather than treating the removed target as an overlap', () => {
    const original = context([
      row('first', { [monday]: shift() }),
      row('second', { [tuesday]: shift('10:00', '19:00') }),
    ])
    const result = applyScheduleOperation(
      original,
      { kind: 'move', source: first, target: second },
      { replaceOccupied: true },
    )
    expect(result.status).toBe('applied')
  })

  it('blocks new assignments to inactive employees but allows clearing or moving their existing shift out', () => {
    const inactive = context([row('first', { [monday]: shift() }, false), row('second')])
    expect(
      applyScheduleOperation(inactive, {
        kind: 'custom',
        input: { ...shift(), startTime: '09:00' },
        targets: [first],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'employee-inactive' })
    expect(
      appliedRows(applyScheduleOperation(inactive, { kind: 'clear', targets: [first] }))[0]!.cells[
        monday
      ],
    ).toBeNull()
    expect(
      applyScheduleOperation(inactive, { kind: 'move', source: first, target: second }).status,
    ).toBe('applied')
  })

  it('rejects unknown cells, unavailable templates, an empty source, and a source outside editable dates', () => {
    expect(
      applyScheduleOperation(context(), { kind: 'move', source: first, target: second }),
    ).toMatchObject({ status: 'blocked', reason: 'source-empty' })
    expect(
      applyScheduleOperation(context(), {
        kind: 'template',
        templateId: 'missing',
        targets: [first],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'template-unavailable' })
    expect(
      applyScheduleOperation(context(), {
        kind: 'clear',
        targets: [{ ...first, employeeId: 'missing' }],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'cell-unavailable' })
    const original = context([row('first', { [monday]: shift() }), row('second')])
    original.editableDates = [tuesday]
    expect(
      applyScheduleOperation(original, { kind: 'move', source: first, target: second }),
    ).toMatchObject({ status: 'blocked', reason: 'cell-unavailable' })
  })

  it.each([
    ['equal times', '09:00', '09:00', 0],
    ['24 hours', '09:00', '09:00', 1],
    ['partial time', '09:', '17:00', 0],
    ['seconds', '09:00:30', '17:00', 0],
    ['negative duration', '22:00', '06:00', 0],
    ['more than 24 hours', '08:00', '16:00', 1],
  ] as const)(
    'rejects %s without applying another target',
    (_name, startTime, endTime, endDayOffset) => {
      const original = context()
      expect(
        applyScheduleOperation(original, {
          kind: 'custom',
          input: { startTime, endTime, endDayOffset, sourceTemplateId: null },
          targets: [first, second],
        }),
      ).toEqual({ status: 'blocked', reason: 'invalid-time' })
      expect(original.rows.every((item) => Object.keys(item.cells).length === 0)).toBe(true)
    },
  )

  it('does not partially apply a batch when one recipient is inactive or a night assignment overlaps its neighbour', () => {
    const original = context([row('first'), row('second', {}, false)])
    expect(
      applyScheduleOperation(original, {
        kind: 'template',
        templateId: template.id,
        targets: [first, second],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'employee-inactive' })
    expect(original.rows[0]!.cells[monday]).toBeUndefined()

    const nightTemplate: ShiftTemplate = {
      ...template,
      startTime: '22:00',
      endTime: '06:00',
      endDayOffset: 1,
    }
    const nightRows = context([row('first', { [tuesday]: shift('05:00', '09:00') })])
    nightRows.templates = [nightTemplate]
    expect(
      applyScheduleOperation(nightRows, {
        kind: 'template',
        templateId: template.id,
        targets: [first, { ...first, workDate: wednesday }],
      }),
    ).toMatchObject({ status: 'blocked', reason: 'overlap' })
    expect(nightRows.rows[0]!.cells[monday]).toBeUndefined()
    expect(nightRows.rows[0]!.cells[wednesday]).toBeUndefined()
  })

  it('detaches a custom edit from its source template and computes minute-accurate duration', () => {
    const result = applyScheduleOperation(context(), {
      kind: 'custom',
      input: {
        startTime: '22:15',
        endTime: '06:45',
        endDayOffset: 1,
        sourceTemplateId: template.id,
      },
      targets: [first],
    })
    expect(appliedRows(result)[0]!.cells[monday]).toMatchObject({
      sourceTemplateId: null,
      label: 'Своя смена',
      colorKey: 'custom',
      durationMinutes: 510,
    })
  })
})

describe('dirtyCellKeys and sameShift', () => {
  it('removes both dirty keys after a shift is moved back to its original cell', () => {
    const base = context([row('first', { [monday]: shift() }), row('second')])
    const moved = appliedRows(
      applyScheduleOperation(base, { kind: 'move', source: first, target: second }),
    )
    expect(new Set(dirtyCellKeys(base.rows, moved))).toEqual(
      new Set(['first:2026-11-09', 'second:2026-11-10']),
    )
    const returned = appliedRows(
      applyScheduleOperation(
        { ...base, rows: moved },
        { kind: 'move', source: second, target: first },
      ),
    )
    expect(dirtyCellKeys(base.rows, returned)).toEqual([])
  })

  it('ignores technical IDs and derived duration but detects template and snapshot changes', () => {
    const original = shift()
    expect(sameShift(original, { ...original, id: 'another-server-id', durationMinutes: 1 })).toBe(
      true,
    )
    expect(sameShift(null, undefined)).toBe(true)
    expect(sameShift(original, { ...original, sourceTemplateId: 'new-template' })).toBe(false)
    expect(sameShift(original, { ...original, label: 'Другой снимок' })).toBe(false)
    expect(sameShift(original, { ...original, colorKey: 'morning' })).toBe(false)
    expect(dirtyCellKeys([row('first')], [row('first', { [monday]: null })])).toEqual([])
  })
})
