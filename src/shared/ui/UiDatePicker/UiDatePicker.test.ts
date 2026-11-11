import UiDialog from '@ui/UiDialog/UiDialog.vue'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import UiDatePicker from './UiDatePicker.vue'

const label = 'Дата начала'
const triggerSelector = `[aria-label="Открыть календарь: ${label}"]`
const calendarSelector = `[role="dialog"][aria-label="Календарь: ${label}"]`

function calendar(): HTMLElement {
  const element = document.querySelector<HTMLElement>(calendarSelector)
  expect(element).not.toBeNull()
  return element!
}

function day(value: string): DOMWrapper<HTMLElement> {
  const element = calendar().querySelector<HTMLElement>(`[data-value="${value}"]`)
  expect(element).not.toBeNull()
  return new DOMWrapper(element!)
}

function mountPicker(props: Partial<InstanceType<typeof UiDatePicker>['$props']> = {}) {
  const wrapper = mount(UiDatePicker, {
    props: {
      modelValue: '2026-11-09',
      label,
      ...props,
      'onUpdate:modelValue': (value: string): void => {
        void wrapper.setProps({ modelValue: value })
      },
    },
    attachTo: document.body,
  })
  return wrapper
}

describe('uiDatePicker', () => {
  it('selects an ISO date and closes the calendar without exposing a native date input', async () => {
    const wrapper = mountPicker()
    expect(wrapper.find('input[type="date"]:not([aria-hidden="true"])').exists()).toBe(false)

    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()
    expect(calendar().querySelector('thead th')?.textContent).toMatch(/пн/i)
    await day('2026-11-12').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-12']])
    expect(document.querySelector(calendarSelector)).toBeNull()
  })

  it('navigates across the year boundary without changing the value until a day is selected', async () => {
    const wrapper = mountPicker({ modelValue: '2026-12-28' })
    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()
    await new DOMWrapper(calendar()).get('[aria-label="Следующий месяц"]').trigger('click')
    await flushPromises()

    expect(calendar().textContent).toMatch(/январь.*2027/is)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await day('2027-01-06').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['2027-01-06']])
  })

  it('moves the focused day with arrow keys and selects it with Enter', async () => {
    const wrapper = mountPicker()
    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()
    day('2026-11-09').element.focus()
    await day('2026-11-09').trigger('keydown', { key: 'ArrowRight', code: 'ArrowRight' })
    await flushPromises()

    expect(document.activeElement?.getAttribute('data-value')).toBe('2026-11-10')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await day('2026-11-10').trigger('keydown', { key: 'Enter', code: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-10']])
    expect(document.querySelector(calendarSelector)).toBeNull()
  })

  it('allows keyboard editing of the date segments without opening the calendar', async () => {
    const wrapper = mountPicker()
    const daySegment = wrapper.get<HTMLElement>('[data-reka-date-field-segment="day"]')
    daySegment.element.focus()
    await daySegment.trigger('keydown', { key: 'ArrowUp', code: 'ArrowUp' })
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['2026-11-10'])
    expect(document.querySelector(calendarSelector)).toBeNull()
  })

  it('dismisses with Escape and restores focus to the calendar trigger', async () => {
    const wrapper = mountPicker()
    const trigger = wrapper.get<HTMLButtonElement>(triggerSelector)
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    expect(calendar().contains(document.activeElement)).toBe(true)
    await new DOMWrapper(calendar()).trigger('keydown', { key: 'Escape', code: 'Escape' })
    await flushPromises()

    expect(document.querySelector(calendarSelector)).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not open or change the date when disabled', async () => {
    const wrapper = mountPicker({ disabled: true })
    expect(wrapper.get(triggerSelector).attributes('disabled')).toBeDefined()
    expect(wrapper.find('[aria-invalid="true"]').exists()).toBe(false)
    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()

    expect(document.querySelector(calendarSelector)).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('blocks out-of-range days while allowing the inclusive boundaries', async () => {
    const wrapper = mountPicker({ min: '2026-11-09', max: '2026-11-13' })
    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()

    expect(day('2026-11-08').attributes('aria-disabled')).toBe('true')
    expect(day('2026-11-14').attributes('aria-disabled')).toBe('true')
    expect(day('2026-11-09').attributes('aria-disabled')).toBeUndefined()
    expect(day('2026-11-13').attributes('aria-disabled')).toBeUndefined()
    await day('2026-11-14').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await day('2026-11-13').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['2026-11-13']])
  })

  it('reflects controlled value updates and clearing without emitting a new choice', async () => {
    const wrapper = mountPicker()
    await wrapper.setProps({ modelValue: '2027-02-13' })
    await wrapper.get(triggerSelector).trigger('click')
    await flushPromises()

    expect(day('2027-02-13').attributes('data-selected')).toBeDefined()
    await wrapper.setProps({ modelValue: '' })
    await flushPromises()
    if (!document.querySelector(calendarSelector)) {
      await wrapper.get(triggerSelector).trigger('click')
      await flushPromises()
    }
    expect(calendar().querySelector('[data-selected]')).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('selects inside a modal dialog without closing the dialog or escaping its focus flow', async () => {
    const chosen = ref('2026-11-09')
    const open = ref(true)
    mount(
      defineComponent({
        components: { UiDialog, UiDatePicker },
        setup: () => ({ chosen, open }),
        template:
          '<UiDialog v-model:open="open" title="Период публикации"><UiDatePicker v-model="chosen" label="Дата начала" /></UiDialog>',
      }),
      { attachTo: document.body },
    )
    await flushPromises()
    const trigger = document.querySelector<HTMLElement>(triggerSelector)!
    trigger.focus()
    await new DOMWrapper(trigger).trigger('click')
    await flushPromises()
    await day('2026-11-12').trigger('click')
    await flushPromises()

    expect(chosen.value).toBe('2026-11-12')
    expect(open.value).toBe(true)
    expect(document.querySelector(calendarSelector)).toBeNull()
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})
