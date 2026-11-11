import { conflicts } from '@schedule/stories/fixtures'
import { ConflictReviewDialog, PublishDialog } from '@schedule/ui'
import { UiButton } from '@ui'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import UiDialog from './UiDialog.vue'

describe('uiDialog', () => {
  it('has an accessible title, closes on Escape and returns focus to the trigger', async () => {
    const wrapper = mount(
      defineComponent({
        components: { UiDialog, UiButton },
        setup: () => ({ open: ref(false) }),
        template:
          '<UiDialog v-model:open="open" title="Изменить смену" description="Настройте время"><template #trigger><UiButton>Открыть</UiButton></template><input aria-label="Время" /></UiDialog>',
      }),
      { attachTo: document.body },
    )
    const trigger = wrapper.get('button')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(document.getElementById(dialog!.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Изменить смену',
    )
    expect(dialog!.contains(document.activeElement)).toBe(true)
    dialog!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
  })

  it('cannot dismiss or submit a pending dialog', async () => {
    mount(UiDialog, {
      props: { open: true, pending: true, title: 'Сохраняем' },
      attachTo: document.body,
    })
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(dialog.querySelector('button')!.disabled).toBe(true)
  })
})

describe('schedule dialogs', () => {
  it('does not confirm an invalid publication range', async () => {
    const wrapper = mount(PublishDialog, {
      props: { open: true, range: { startDate: '2026-11-10', endDate: '2026-11-09' } },
      attachTo: document.body,
    })
    await flushPromises()
    expect(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true)
    document
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('requires all conflict decisions and resets them when a newer remote version arrives', async () => {
    const wrapper = mount(ConflictReviewDialog, {
      props: { open: true, conflicts, remoteVersion: 2 },
      attachTo: document.body,
    })
    await flushPromises()
    const confirm = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes('Принять решения'),
      )!
    expect(confirm().disabled).toBe(true)
    document.querySelector<HTMLInputElement>('input[type="radio"]')!.click()
    await flushPromises()
    expect(confirm().disabled).toBe(false)
    confirm().click()
    await flushPromises()
    expect(wrapper.emitted('confirmRebase')?.[0]?.[0]).toMatchObject({ remoteVersion: 2 })
    await wrapper.setProps({ remoteVersion: 3 })
    expect(confirm().disabled).toBe(true)
  })
})
