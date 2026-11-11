import { emptyRows, weekDates } from '@schedule/stories/fixtures'
import ScheduleGrid from '@schedule/ui/ScheduleGrid/ScheduleGrid.vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ScheduleDateHeader from './ScheduleDateHeader.vue'

const date = {
  date: '2026-11-10',
  weekdayLabel: 'Вт',
  dayLabel: '10',
}

describe('scheduleDateHeader', () => {
  it('exposes a named native button and opens date actions once', () => {
    const wrapper = mount(ScheduleDateHeader, {
      props: { ...date, isToday: true, covered: true },
    })
    const button = wrapper.get<HTMLButtonElement>('button')

    expect(button.element.type).toBe('button')
    expect(button.attributes('aria-label')).toContain('2026-11-10, сегодня, смены назначены')
    expect(button.attributes('aria-current')).toBe('date')
    button.element.click()
    expect(wrapper.emitted('openDateActions')).toEqual([[expect.any(MouseEvent)]])
  })

  it('blocks activation while disabled and enables it again without changing the grid tab order', async () => {
    const wrapper = mount(ScheduleDateHeader, {
      props: { ...date, disabled: true, tabIndex: -1 },
      attachTo: document.body,
    })
    const button = wrapper.get<HTMLButtonElement>('button')

    button.element.click()
    button.element.focus()
    expect(wrapper.emitted('openDateActions')).toBeUndefined()
    expect(document.activeElement).not.toBe(button.element)

    await wrapper.setProps({ disabled: false })
    expect(button.element.tabIndex).toBe(-1)
    button.element.focus()
    expect(document.activeElement).toBe(button.element)
    button.element.click()
    expect(wrapper.emitted('openDateActions')).toEqual([[expect.any(MouseEvent)]])
  })

  it.each([
    { disabled: true, loading: false },
    { disabled: false, loading: true },
  ])('does not open date actions from an unavailable grid (%j)', (state) => {
    const wrapper = mount(ScheduleGrid, {
      props: { rows: emptyRows.slice(0, 1), dates: weekDates.slice(0, 1), ...state },
    })
    const button = wrapper.get<HTMLButtonElement>('[role="columnheader"] button')

    button.element.click()
    expect(wrapper.emitted('requestDateAction')).toBeUndefined()
  })
})
