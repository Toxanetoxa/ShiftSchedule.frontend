import type { SelectionSummary } from '@schedule/domain/types'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import ScheduleToolbar from './ScheduleToolbar.vue'

const emptySelection = { cellCount: 0, employeeCount: 0, dayCount: 0 }
const selected = { cellCount: 3, employeeCount: 2, dayCount: 2 }

function createToolbar(initialSelection: SelectionSummary = emptySelection) {
  const selection = ref(initialSelection)
  const search = ref('Анна')
  const wrapper = mount(
    defineComponent({
      components: { ScheduleToolbar },
      setup: () => ({ selection, search }),
      template: `<ScheduleToolbar v-model="search" view="week" :selection-summary="selection" @clear-selection="selection = { cellCount: 0, employeeCount: 0, dayCount: 0 }" />`,
    }),
    { attachTo: document.body },
  )
  return { wrapper, selection, search }
}

describe('scheduleToolbar', () => {
  it('preserves the search input and filter while making the inactive controls unavailable', async () => {
    const { wrapper, selection, search } = createToolbar()
    const input = wrapper.get<HTMLInputElement>('input[type="search"]')
    const searchLayer = input.element.closest('[aria-hidden]')!
    const selectionLayer = wrapper.get('[aria-label="Действия с выделенными ячейками"]').element
      .parentElement!

    expect(searchLayer.getAttribute('aria-hidden')).toBe('false')
    expect(selectionLayer.getAttribute('aria-hidden')).toBe('true')
    expect(selectionLayer.hasAttribute('inert')).toBe(true)
    expect([...selectionLayer.querySelectorAll('button')].every((button) => button.disabled)).toBe(
      true,
    )

    selection.value = selected
    await nextTick()

    expect(searchLayer.getAttribute('aria-hidden')).toBe('true')
    expect(searchLayer.hasAttribute('inert')).toBe(true)
    expect(input.element.disabled).toBe(true)
    expect(selectionLayer.getAttribute('aria-hidden')).toBe('false')
    expect(selectionLayer.hasAttribute('inert')).toBe(false)
    expect([...selectionLayer.querySelectorAll('button')].every((button) => !button.disabled)).toBe(
      true,
    )

    selection.value = emptySelection
    await nextTick()

    expect(wrapper.get('input[type="search"]').element).toBe(input.element)
    expect(input.element.disabled).toBe(false)
    expect(input.element.value).toBe('Анна')
    expect(search.value).toBe('Анна')
  })

  it('returns focus to the search without scrolling only when the clear-selection action is used', async () => {
    const { wrapper } = createToolbar(selected)
    const input = wrapper.get<HTMLInputElement>('input[type="search"]')
    const focus = vi.spyOn(input.element, 'focus')
    const clear = wrapper.findAll('button').find((button) => button.text() === 'Снять')!
    clear.element.focus()

    await clear.trigger('click')

    expect(document.activeElement).toBe(input.element)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
    expect(input.element.value).toBe('Анна')
  })

  it('keeps focus outside the toolbar when selection is cleared elsewhere', async () => {
    const { wrapper, selection } = createToolbar(selected)
    const cell = document.createElement('button')
    document.body.append(cell)
    cell.focus()
    const focus = vi.spyOn(wrapper.get<HTMLInputElement>('input[type="search"]').element, 'focus')

    selection.value = emptySelection
    await nextTick()

    expect(document.activeElement).toBe(cell)
    expect(focus).not.toHaveBeenCalled()
  })

  it('passes the template action and its disabled state through to a custom trigger', async () => {
    const wrapper = mount(ScheduleToolbar, {
      props: { modelValue: '', view: 'week', selectionSummary: selected },
      slots: {
        'template-action': ({ disabled, chooseTemplate }) =>
          h('button', { disabled, onClick: chooseTemplate }, 'Выбор шаблона'),
      },
    })
    const trigger = wrapper.findAll('button').find((button) => button.text() === 'Выбор шаблона')!
    expect(wrapper.text()).not.toContain('Поставить шаблон')
    await trigger.trigger('click')
    expect(wrapper.emitted('chooseTemplate')).toHaveLength(1)

    await wrapper.setProps({ selectionSummary: emptySelection })
    expect(trigger.element.disabled).toBe(true)
  })
})
