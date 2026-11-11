import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import TimeField from './TimeField.vue'

const completeTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function createField(initial = '') {
  const value = ref(initial)
  const disabled = ref(false)
  const wrapper = mount(
    defineComponent({
      components: { TimeField },
      setup: () => ({ value, disabled }),
      template: '<TimeField v-model="value" label="Начало" :disabled="disabled" required />',
    }),
    { attachTo: document.body },
  )
  const field = wrapper.getComponent(TimeField)
  const input = field.get<HTMLInputElement>('input').element
  input.focus()
  input.setSelectionRange(input.value.length, input.value.length)
  return { wrapper, field, input, value, disabled }
}

// jsdom does not perform native text editing. Reproduce the browser's event order
// and value/selection changes, then let the real mask handle the input event.
async function insert(input: HTMLInputElement, text: string, paste = false): Promise<void> {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  input.dispatchEvent(new KeyboardEvent('keydown', { key: paste ? 'v' : text, bubbles: true }))
  input.value = input.value.slice(0, start) + text + input.value.slice(end)
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: paste ? 'insertFromPaste' : 'insertText',
      data: text,
    }),
  )
  await nextTick()
}

async function type(input: HTMLInputElement, text: string): Promise<void> {
  for (const character of text) await insert(input, character)
}

async function erase(input: HTMLInputElement, key: 'Backspace' | 'Delete'): Promise<void> {
  let start = input.selectionStart ?? input.value.length
  let end = input.selectionEnd ?? start
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  if (start === end) {
    if (key === 'Backspace') start = Math.max(0, start - 1)
    else end = Math.min(input.value.length, end + 1)
  }
  input.value = input.value.slice(0, start) + input.value.slice(end)
  input.setSelectionRange(start, start)
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: key === 'Backspace' ? 'deleteContentBackward' : 'deleteContentForward',
    }),
  )
  await nextTick()
}

describe('timeField input mask', () => {
  it('inserts the colon while typing four digits and keeps the caret at the next editable position', async () => {
    const { input, value } = createField()

    await type(input, '09')
    expect(input.value).toBe('09')
    expect(input.selectionStart).toBe(2)
    await type(input, '3')
    expect(input.value).toBe('09:3')
    expect(input.selectionStart).toBe(4)
    await type(input, '0')

    expect(input.value).toBe('09:30')
    expect(value.value).toBe('09:30')
    expect(input.selectionStart).toBe(5)
    expect(input.validity.valid).toBe(true)
  })

  it.each(['0930', '09:30'])('accepts pasted time %s', async (text) => {
    const { input, value } = createField()
    await insert(input, text, true)
    expect(input.value).toBe('09:30')
    expect(value.value).toBe('09:30')
    expect(input.selectionStart).toBe(5)
  })

  it.each([
    ['0000', '00:00'],
    ['2359', '23:59'],
  ])('accepts the valid boundary %s', async (typed, expected) => {
    const { input, value } = createField()
    await type(input, typed)
    expect(input.value).toBe(expected)
    expect(value.value).toBe(expected)
    expect(input.validity.valid).toBe(true)
  })

  it.each(['24:00', '12:60', '25:00'])(
    'does not turn invalid pasted time %s into a valid time',
    async (text) => {
      const { input, value } = createField()
      await insert(input, text, true)
      expect(completeTime.test(value.value)).toBe(false)
      expect(input.validity.valid).toBe(false)
      expect(input.value).toBe(value.value)
    },
  )

  it('preserves partial input and emits blur without filling missing minutes', async () => {
    const { field, input, value } = createField()
    await type(input, '093')
    input.blur()
    await nextTick()

    expect(input.value).toBe('09:3')
    expect(value.value).toBe('09:3')
    expect(input.validity.valid).toBe(false)
    expect(field.emitted('blur')).toHaveLength(1)
  })

  it('backs across the automatic colon and can clear the whole value', async () => {
    const { input, value } = createField()
    await type(input, '093')
    expect(input.selectionStart).toBe(4)

    await erase(input, 'Backspace')
    expect(input.value).toBe('09')
    expect(input.selectionStart).toBe(2)

    await erase(input, 'Backspace')
    expect(input.value).toBe('0')
    expect(input.selectionStart).toBe(1)
    await erase(input, 'Backspace')
    expect(input.value).toBe('')
    expect(value.value).toBe('')
  })

  it('can delete forwards at the separator and replace minutes without changing hours', async () => {
    const { input, value } = createField('09:30')
    input.setSelectionRange(2, 2)
    await erase(input, 'Delete')
    expect(input.value.startsWith('09:')).toBe(true)
    expect(input.value).not.toBe('09:30')

    input.setSelectionRange(3, input.value.length)
    await type(input, '45')
    expect(input.value).toBe('09:45')
    expect(value.value).toBe('09:45')
  })

  it('replaces selected hours and minutes without moving digits between segments', async () => {
    const { input, value } = createField('12:34')
    input.setSelectionRange(0, 2)
    await type(input, '09')
    expect(input.value).toBe('09:34')
    expect(input.selectionStart).toBe(2)

    input.setSelectionRange(3, 5)
    await type(input, '45')
    expect(input.value).toBe('09:45')
    expect(value.value).toBe('09:45')
    expect(input.selectionStart).toBe(5)
  })

  it('reflects external model updates, clearing and the disabled state', async () => {
    const { input, value, disabled } = createField('09:30')
    expect(input.value).toBe('09:30')
    value.value = '23:59'
    await nextTick()
    expect(input.value).toBe('23:59')

    disabled.value = true
    await nextTick()
    expect(input.disabled).toBe(true)
    expect(input.value).toBe('23:59')
    disabled.value = false
    value.value = ''
    await nextTick()
    expect(input.disabled).toBe(false)
    expect(input.value).toBe('')

    input.focus()
    await type(input, '0800')
    expect(input.value).toBe('08:00')
    expect(value.value).toBe('08:00')
  })
})
