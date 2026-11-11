import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import UiPopover from './UiPopover.vue'

function createPopover(pending = false) {
  return mount(
    defineComponent({
      components: { UiPopover },
      setup: () => ({ open: ref(false), pending }),
      template: `
        <div>
          <UiPopover v-model:open="open" label="Действия" :pending="pending">
            <template #trigger><button type="button" data-trigger>Открыть</button></template>
            <input aria-label="Время внутри панели" />
          </UiPopover>
          <input aria-label="Следующее поле" data-outside />
        </div>`,
    }),
    { attachTo: document.body },
  )
}

function dialog(): HTMLElement | null {
  return document.querySelector('[role="dialog"][aria-label="Действия"]')
}

function escape(element: HTMLElement): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  )
}

describe('uiPopover', () => {
  it('closes on Escape and restores the trigger focus without scrolling', async () => {
    const wrapper = createPopover()
    const trigger = wrapper.get<HTMLButtonElement>('[data-trigger]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    const content = dialog()
    expect(content).not.toBeNull()
    expect(content!.contains(document.activeElement)).toBe(true)
    const focus = vi.spyOn(trigger.element, 'focus')

    escape(content!)
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('keeps focus in an outside field when leaving the popover', async () => {
    const wrapper = createPopover()
    const trigger = wrapper.get<HTMLButtonElement>('[data-trigger]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    expect(dialog()).not.toBeNull()
    const outside = wrapper.get<HTMLInputElement>('[data-outside]')
    const restoreTrigger = vi.spyOn(trigger.element, 'focus')

    outside.element.focus()
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(outside.element)
    expect(restoreTrigger).not.toHaveBeenCalled()
  })

  it('opens programmatically without a trigger and restores the explicit reference', async () => {
    const reference = document.createElement('div')
    reference.setAttribute('role', 'gridcell')
    reference.tabIndex = -1
    document.body.append(reference)
    const focus = vi.spyOn(reference, 'focus')
    const wrapper = mount(UiPopover, {
      props: {
        open: true,
        label: 'Действия',
        reference,
        'onUpdate:open': (open) => void wrapper.setProps({ open }),
      },
      slots: { default: '<button type="button">Изменить смену</button>' },
      attachTo: document.body,
    })
    await flushPromises()

    const content = dialog()
    expect(content).not.toBeNull()
    expect(content!.contains(document.activeElement)).toBe(true)
    expect(wrapper.find('button').exists()).toBe(false)
    escape(content!)
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(reference)
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('restores the current reference when it changes while the popover is open', async () => {
    const firstReference = document.createElement('button')
    const secondReference = document.createElement('button')
    document.body.append(firstReference, secondReference)
    const wrapper = mount(UiPopover, {
      props: {
        open: true,
        label: 'Действия',
        reference: firstReference,
        'onUpdate:open': (open) => void wrapper.setProps({ open }),
      },
      slots: { default: '<button type="button">Изменить смену</button>' },
      attachTo: document.body,
    })
    await flushPromises()
    const restoreFirst = vi.spyOn(firstReference, 'focus')
    const restoreSecond = vi.spyOn(secondReference, 'focus')

    await wrapper.setProps({ reference: secondReference })
    await flushPromises()
    const content = dialog()
    expect(content).not.toBeNull()
    expect(content!.contains(document.activeElement)).toBe(true)

    escape(content!)
    await flushPromises()

    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(secondReference)
    expect(restoreFirst).not.toHaveBeenCalled()
    expect(restoreSecond).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('does not dismiss a pending popover on Escape or outside focus', async () => {
    const wrapper = createPopover(true)
    const trigger = wrapper.get<HTMLButtonElement>('[data-trigger]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    const content = dialog()
    expect(content).not.toBeNull()

    escape(content!)
    await flushPromises()
    expect(dialog()).toBe(content)
    wrapper.get<HTMLInputElement>('[data-outside]').element.focus()
    await flushPromises()
    expect(dialog()).toBe(content)
    expect(wrapper.getComponent(UiPopover).emitted('update:open')).toEqual([[true]])
  })
})
