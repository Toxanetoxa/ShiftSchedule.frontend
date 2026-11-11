import type {
  BeforeDragStartEvent,
  DragDropManager,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/dom'
import type { CellRef, DragPayload, ShiftTemplate } from '@schedule/domain/types'
import type { VNode } from 'vue'
import { Accessibility, AutoScroller, Feedback } from '@dnd-kit/dom'
import { scheduler } from '@dnd-kit/dom/utilities'
import { DragDropProvider, useDragDropManager } from '@dnd-kit/vue'
import { ScheduleCell, ShiftTemplateCard } from '@schedule/ui'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import ScheduleDragDrop from './ScheduleDragDrop.vue'

const template: ShiftTemplate = {
  id: 'morning',
  label: 'Утро',
  colorKey: 'morning',
  startTime: '08:00',
  endTime: '16:00',
  endDayOffset: 0,
  sourceTemplateId: 'morning',
  durationMinutes: 480,
}
const payload: DragPayload = { kind: 'template', templateId: template.id }
const targetCell: CellRef = { employeeId: 'employee-1', workDate: '2026-11-09' }
const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(document, 'elementFromPoint')
const pointerEventDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'PointerEvent')

afterEach(() => {
  vi.restoreAllMocks()
  if (elementFromPointDescriptor)
    Object.defineProperty(document, 'elementFromPoint', elementFromPointDescriptor)
  else Reflect.deleteProperty(document, 'elementFromPoint')
  if (pointerEventDescriptor)
    Object.defineProperty(globalThis, 'PointerEvent', pointerEventDescriptor)
  else Reflect.deleteProperty(globalThis, 'PointerEvent')
})

function createTarget() {
  const element = document.createElement('div')
  const content = document.createElement('span')
  element.append(content)
  document.body.append(element)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 80, 72))
  const hitTest = vi.fn().mockReturnValue(content)
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hitTest })

  return { element, content, hitTest }
}

function operation(
  element: HTMLElement | null,
  sourcePayload: unknown = payload,
  point = { x: 120, y: 130 },
): DragEndEvent['operation'] {
  // Exercise the adapter's public event boundary without simulating sensor internals.
  return {
    source: { data: { payload: sourcePayload } },
    target: element ? { data: { cell: { ...targetCell } }, element } : null,
    position: { current: point },
  } as unknown as DragEndEvent['operation']
}

function createAdapter(
  options: {
    disabled?: boolean
    canDrop?: (source: DragPayload, target: CellRef) => boolean
    content?: () => VNode
  } = {},
) {
  let manager: DragDropManager | undefined
  const ManagerProbe = defineComponent({
    setup() {
      manager = useDragDropManager().value
      return () => null
    },
  })
  const canDrop = options.canDrop || vi.fn(() => true)
  const wrapper = mount(ScheduleDragDrop, {
    props: { templates: [template], canDrop, disabled: options.disabled },
    slots: { default: () => [h(ManagerProbe), ...(options.content ? [options.content()] : [])] },
    attachTo: document.body,
  })
  const provider = wrapper.findComponent(DragDropProvider)
  if (!manager) throw new Error('The real DragDropProvider did not provide its manager.')
  const activeManager = manager

  async function start(value: DragEndEvent['operation']): Promise<void> {
    provider.vm.$emit(
      'dragStart',
      { operation: value, cancelable: false } satisfies DragStartEvent,
      activeManager,
    )
    await nextTick()
  }
  async function end(
    value: DragEndEvent['operation'],
    canceled = false,
    nativeEvent?: Event,
  ): Promise<void> {
    provider.vm.$emit(
      'dragEnd',
      {
        operation: value,
        canceled,
        nativeEvent,
        suspend: () => ({ resume() {}, abort() {} }),
      } satisfies DragEndEvent,
      activeManager,
    )
    await nextTick()
  }

  return { wrapper, provider, manager: activeManager, canDrop, start, end }
}

describe('scheduleDragDrop event boundary', () => {
  it('emits a single drop only for an allowed final pointer hit inside the target', async () => {
    const { element, hitTest } = createTarget()
    const { wrapper, canDrop, start, end } = createAdapter()
    const drag = operation(element)

    await start(drag)
    expect(wrapper.emitted('drop')).toBeUndefined()
    await end(drag)

    expect(hitTest).toHaveBeenCalledWith(120, 130)
    expect(canDrop).toHaveBeenCalledWith(payload, targetCell)
    expect(wrapper.emitted('drop')).toEqual([[payload, targetCell]])
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('does not commit canceled drags even when the pointer hits an allowed target', async () => {
    const { element } = createTarget()
    const { wrapper, start, end } = createAdapter()
    const drag = operation(element)
    await start(drag)
    await end(drag, true)
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('rejects a non-null collision target when the pointer is outside its bounds', async () => {
    const { element, hitTest } = createTarget()
    const { wrapper, start, end } = createAdapter()
    const drag = operation(element, payload, { x: 181, y: 130 })
    await start(drag)
    await end(drag)
    expect(hitTest).not.toHaveBeenCalled()
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('rejects a target occluded by a sticky header or another overlay', async () => {
    const { element, hitTest } = createTarget()
    const overlay = document.createElement('div')
    document.body.append(overlay)
    hitTest.mockReturnValue(overlay)
    const { wrapper, start, end } = createAdapter()
    const drag = operation(element)
    await start(drag)
    await end(drag)
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('rejects drops with no target or a target removed before pointer release', async () => {
    const { element } = createTarget()
    const { wrapper, start, end } = createAdapter()
    await start(operation(null))
    await end(operation(null))
    expect(wrapper.emitted('drop')).toBeUndefined()
    element.remove()
    await start(operation(element))
    await end(operation(element))
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })

  it('does not start or drop an unknown source payload', async () => {
    const { element } = createTarget()
    const { wrapper, provider, manager, start, end } = createAdapter()
    const drag = operation(element, { kind: 'unsupported', templateId: template.id })
    const preventDefault = vi.fn()
    provider.vm.$emit(
      'beforeDragStart',
      {
        operation: drag,
        cancelable: true,
        defaultPrevented: false,
        preventDefault,
      } satisfies BeforeDragStartEvent,
      manager,
    )
    expect(preventDefault).toHaveBeenCalledOnce()
    await start(drag)
    await end(drag)
    expect(wrapper.emitted('start')).toBeUndefined()
    expect(wrapper.emitted('drop')).toBeUndefined()
  })

  it('checks the current canDrop result again at pointer release', async () => {
    const { element } = createTarget()
    const canDrop = vi.fn(() => true)
    const { wrapper, start, end } = createAdapter({ canDrop })
    const drag = operation(element)
    await start(drag)
    canDrop.mockReturnValue(false)
    await end(drag)
    expect(canDrop).toHaveBeenCalledWith(payload, targetCell)
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('does not commit a drag when the adapter becomes disabled', async () => {
    const { element } = createTarget()
    const { wrapper, start, end } = createAdapter()
    const drag = operation(element)
    await start(drag)
    await wrapper.setProps({ disabled: true })
    await end(drag)
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('uses final native pointer coordinates instead of an earlier collision position', async () => {
    const { element } = createTarget()
    class TestPointerEvent extends MouseEvent {}
    Object.defineProperty(globalThis, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: TestPointerEvent,
    })
    const { wrapper, start, end } = createAdapter()
    const drag = operation(element)
    await start(drag)
    await end(drag, false, new TestPointerEvent('pointerup', { clientX: 400, clientY: 400 }))
    expect(wrapper.emitted('drop')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('suppresses card clicks during dragging and immediately after release, then restores normal application', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    const apply = vi.fn()
    const { element } = createTarget()
    const { wrapper, start, end } = createAdapter({
      content: () => h(ShiftTemplateCard, { template, dragEnabled: true, onApply: apply }),
    })
    const card = wrapper.getComponent(ShiftTemplateCard).get('button')
    await card.trigger('click')
    expect(apply).toHaveBeenCalledOnce()
    const drag = operation(element)
    await start(drag)
    await card.trigger('click')
    expect(apply).toHaveBeenCalledOnce()
    await end(drag)
    await card.trigger('click')
    expect(apply).toHaveBeenCalledOnce()
    now.mockReturnValue(1201)
    await card.trigger('click')
    expect(apply).toHaveBeenCalledTimes(2)
  })
})

describe('optional schedule drag context', () => {
  it('preserves enabled empty gridcells and their keyboard instructions without removing drag feedback plugins', async () => {
    const { wrapper, manager } = createAdapter({
      content: () =>
        h('div', { role: 'grid' }, [
          h('p', { id: 'additional-grid-help' }, 'Дополнительная инструкция.'),
          h('div', { role: 'row' }, [
            h(ScheduleCell, {
              cell: targetCell,
              employeeName: 'Анна',
              dragEnabled: true,
              keyboardActive: true,
              'aria-describedby': 'additional-grid-help',
            }),
            h(ScheduleCell, {
              cell: { ...targetCell, employeeId: 'employee-2' },
              employeeName: 'Борис',
              dragEnabled: true,
              disabled: true,
            }),
          ]),
        ]),
    })
    await nextTick()
    // The old Accessibility plugin queued attribute mutations on this scheduler.
    scheduler.flush()
    await nextTick()

    expect(manager.plugins.find((plugin) => plugin instanceof Accessibility)).toBeUndefined()
    expect(manager.plugins.find((plugin) => plugin instanceof AutoScroller)).toBeInstanceOf(
      AutoScroller,
    )
    expect(manager.plugins.find((plugin) => plugin instanceof Feedback)).toBeInstanceOf(Feedback)

    const cells = wrapper.findAll('[role="gridcell"]')
    expect(cells).toHaveLength(2)
    expect(cells[0]!.attributes('aria-disabled')).not.toBe('true')
    expect(cells[0]!.attributes('tabindex')).toBe('0')
    expect(cells[1]!.attributes('aria-disabled')).toBe('true')
    expect(cells[1]!.attributes('tabindex')).toBe('-1')
    const descriptions = cells[0]!.attributes('aria-describedby')!.split(/\s+/)
    expect(descriptions).toContain('additional-grid-help')
    const ownDescription = descriptions.find((id) => id.startsWith('schedule-dnd-instructions-'))
    expect(ownDescription).toBeDefined()
    const instructions = document.getElementById(ownDescription!)!.textContent
    expect(instructions).toContain('Пробел переключает выделение')
    expect(instructions).toContain('Alt')
    expect(instructions).not.toContain('press the space bar')
  })

  it('renders standalone cells and cards without a DragDropProvider', () => {
    const cell = mount(ScheduleCell, {
      props: { cell: targetCell, employeeName: 'Анна', dragEnabled: true },
    })
    const card = mount(ShiftTemplateCard, { props: { template, dragEnabled: true } })
    expect(cell.get('[role="gridcell"]').attributes('data-drag-enabled')).toBeUndefined()
    expect(card.get('button').attributes('data-drag-enabled')).toBeUndefined()
  })

  it('keeps a draggable template available without selection while blocking click-to-apply', async () => {
    const apply = vi.fn()
    const { wrapper } = createAdapter({
      content: () =>
        h(ShiftTemplateCard, { template, dragEnabled: true, applyDisabled: true, onApply: apply }),
    })
    const card = wrapper.getComponent(ShiftTemplateCard).get('button')
    expect(card.attributes('disabled')).toBeUndefined()
    expect(card.attributes('data-drag-enabled')).toBe('true')
    expect(card.attributes('aria-disabled')).not.toBe('true')
    expect(card.attributes('aria-label')).toMatch(/^Перенести шаблон/)
    await card.trigger('click')
    expect(apply).not.toHaveBeenCalled()
  })
})
