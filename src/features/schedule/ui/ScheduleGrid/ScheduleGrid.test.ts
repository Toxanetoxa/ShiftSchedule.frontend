import type { CellKey } from '@schedule/domain/types'
import { cellKey } from '@schedule/domain/types'
import { emptyRows, weekDates } from '@schedule/stories/fixtures'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScheduleGrid from './ScheduleGrid.vue'

function createGrid() {
  return mount(ScheduleGrid, {
    props: { rows: emptyRows.slice(0, 2), dates: weekDates.slice(0, 3) },
    attachTo: document.body,
  })
}

describe('scheduleGrid', () => {
  it('has one tab stop and moves focus independently of selection', async () => {
    const wrapper = createGrid()
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    const cells = wrapper.findAll('[data-cell-key]')
    await cells[0]!.trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(cells[1]!.element)
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    expect(wrapper.emitted('changeSelection')).toBeUndefined()
    await cells[1]!.trigger('keydown', { key: 'End', ctrlKey: true })
    expect(document.activeElement).toBe(cells[5]!.element)
  })

  it('extends a rectangle only across visible employees and dates', async () => {
    const wrapper = createGrid()
    const cells = wrapper.findAll('[data-cell-key]')
    await cells[0]!.trigger('click')
    await cells[4]!.trigger('click', { shiftKey: true })
    expect(wrapper.emitted('changeSelection')?.at(-1)?.[0]).toEqual([
      `${emptyRows[0]!.employee.id}:${weekDates[0]!.date}`,
      `${emptyRows[0]!.employee.id}:${weekDates[1]!.date}`,
      `${emptyRows[1]!.employee.id}:${weekDates[0]!.date}`,
      `${emptyRows[1]!.employee.id}:${weekDates[1]!.date}`,
    ])
  })

  it('supports Space, range arrows and date actions without duplicate commands', async () => {
    const wrapper = createGrid()
    const cells = wrapper.findAll('[data-cell-key]')
    await cells[0]!.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('changeSelection')).toHaveLength(1)
    await cells[0]!.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(wrapper.emitted('changeSelection')?.at(-1)?.[0]).toHaveLength(2)
    await cells[0]!.trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(wrapper.emitted('requestDateAction')).toEqual([[weekDates[0]!.date]])
    expect(wrapper.emitted('activateCell')).toBeUndefined()
  })

  it('clears selection on a changed search result without changing assignments', async () => {
    const wrapper = createGrid()
    const selected: CellKey[] = [
      cellKey({ employeeId: emptyRows[0]!.employee.id, workDate: weekDates[0]!.date }),
    ]
    await wrapper.setProps({ selectedKeys: selected })
    await wrapper.setProps({ rows: [emptyRows[1]!] })
    expect(wrapper.emitted('changeSelection')?.at(-1)).toEqual([[]])
    expect(wrapper.emitted('clearCells')).toBeUndefined()
  })

  it('keeps full-roster coverage when search hides employees', () => {
    const wrapper = mount(ScheduleGrid, {
      props: {
        rows: [emptyRows[0]!],
        dates: weekDates.slice(0, 1),
        coverageCounts: { [weekDates[0]!.date]: 8 },
      },
    })
    expect(
      wrapper.get(`[role="gridcell"][aria-label="${weekDates[0]!.date}: 8 смен"]`).text(),
    ).toBe('8')
    expect(wrapper.findAll('[role="rowheader"]')).toHaveLength(2)
  })

  it('does not request a move for an empty cell', async () => {
    const wrapper = createGrid()
    await wrapper.get('[data-cell-key]').trigger('keydown', { key: 'ArrowRight', altKey: true })
    expect(wrapper.emitted('requestMove')).toBeUndefined()
  })
})
