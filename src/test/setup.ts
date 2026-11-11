import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, vi } from 'vitest'
import { nextTick } from 'vue'

enableAutoUnmount((unmount) => {
  afterEach(async () => {
    unmount()
    await nextTick()
    document.body.innerHTML = ''
  })
})

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})
Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: () => false,
})
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: vi.fn(),
})
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: vi.fn(),
})
