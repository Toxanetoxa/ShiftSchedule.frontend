import { EmployeeSearch } from '@schedule/ui'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CustomShiftForm from './CustomShiftForm.vue'

describe('customShiftForm', () => {
  it('does not apply while typing and submits a night shift as one explicit intent', async () => {
    const wrapper = mount(CustomShiftForm, { props: { selectedCount: 2 } })
    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('22:00')
    await inputs[1]!.setValue('06:00')
    expect(wrapper.emitted('apply')).toBeUndefined()
    expect(wrapper.text()).toContain('следующий день')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('apply')).toEqual([
      [{ startTime: '22:00', endTime: '06:00', endDayOffset: 1, sourceTemplateId: null }],
    ])
  })

  it.each([
    ['10:00', '10:00', 1],
    ['10:', '23:00', 1],
    ['25:00', '23:00', 1],
    ['10:00', '23:00', 0],
  ])(
    'prevents invalid or unselected application (%s–%s, selection %s)',
    async (start, end, selectedCount) => {
      const wrapper = mount(CustomShiftForm, { props: { selectedCount } })
      const inputs = wrapper.findAll('input')
      await inputs[0]!.setValue(start)
      await inputs[1]!.setValue(end)
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
      await wrapper.get('form').trigger('submit')
      expect(wrapper.emitted('apply')).toBeUndefined()
    },
  )
})

describe('employeeSearch', () => {
  it('clears only the search model and restores focus to its labelled input', async () => {
    const wrapper = mount(EmployeeSearch, {
      props: { modelValue: 'Анна' },
      attachTo: document.body,
    })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(document.activeElement).toBe(wrapper.get('input').element)
    expect(wrapper.get('label').attributes('for')).toBe(wrapper.get('input').attributes('id'))
  })
})
