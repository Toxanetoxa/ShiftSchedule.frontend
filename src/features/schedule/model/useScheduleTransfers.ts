import type {
  CellRef,
  DragPayload,
  IsoDate,
  ScheduleRow,
  ShiftTemplate,
  ShiftViewModel,
} from '@schedule/domain/types'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { operationErrorMessage } from '@schedule/domain/operationMessages'
import { applyScheduleOperation, sameShift } from '@schedule/domain/operations'
import { cellKey } from '@schedule/domain/types'
import { computed, shallowRef, toValue, watch } from 'vue'

interface Options {
  rows: Ref<ScheduleRow[]>
  templates: MaybeRefOrGetter<readonly ShiftTemplate[]>
  editableDates: MaybeRefOrGetter<readonly IsoDate[]>
  disabled?: MaybeRefOrGetter<boolean>
  scope?: MaybeRefOrGetter<string>
  onCommit?: (changedCells: CellRef[]) => void
}

interface Session {
  payload: DragPayload
  sourceSnapshot: ShiftViewModel
  scope: string
}

export interface PendingReplacement extends Session {
  target: CellRef
  targetSnapshot: ShiftViewModel | null
}

function copyPayload(payload: DragPayload): DragPayload {
  return payload.kind === 'template'
    ? { kind: 'template', templateId: payload.templateId }
    : { kind: 'assignment', source: { ...payload.source } }
}

function samePayload(left: DragPayload, right: DragPayload): boolean {
  return left.kind === 'template' && right.kind === 'template'
    ? left.templateId === right.templateId
    : left.kind === 'assignment' &&
        right.kind === 'assignment' &&
        cellKey(left.source) === cellKey(right.source)
}

export function useScheduleTransfers(options: Options) {
  let session: Session | null = null
  const activePayload = shallowRef<DragPayload | null>(null)
  const keyboardSource = shallowRef<CellRef | null>(null)
  const pending = shallowRef<PendingReplacement | null>(null)
  const error = shallowRef('')
  const message = shallowRef('')
  const disabled = (): boolean => Boolean(toValue(options.disabled))
  const scope = (): string => toValue(options.scope) || ''

  function context() {
    return {
      rows: options.rows.value,
      templates: toValue(options.templates),
      editableDates: toValue(options.editableDates),
    }
  }

  function getCell(cell: CellRef): ShiftViewModel | null {
    return (
      options.rows.value.find((row) => row.employee.id === cell.employeeId)?.cells[cell.workDate] ||
      null
    )
  }

  function getShift(payload: DragPayload): ShiftViewModel | null {
    if (payload.kind === 'assignment') return getCell(payload.source)
    const template = toValue(options.templates).find((item) => item.id === payload.templateId)
    if (!template) return null
    return {
      label: template.label,
      colorKey: template.colorKey,
      startTime: template.startTime,
      endTime: template.endTime,
      endDayOffset: template.endDayOffset,
      sourceTemplateId: template.id,
      durationMinutes: template.durationMinutes,
    }
  }

  function command(
    payload: DragPayload,
    target: CellRef,
  ): Parameters<typeof applyScheduleOperation>[1] {
    return payload.kind === 'template'
      ? { kind: 'template', templateId: payload.templateId, targets: [target] }
      : { kind: 'move', source: payload.source, target }
  }

  function fresh(snapshot: Session): boolean {
    return (
      snapshot.scope === scope() && sameShift(snapshot.sourceSnapshot, getShift(snapshot.payload))
    )
  }

  function clearActive(): void {
    activePayload.value = null
    keyboardSource.value = null
    session = null
  }

  function cancel(): void {
    clearActive()
    pending.value = null
    error.value = ''
    message.value = 'Перенос отменён. График не изменён.'
  }

  function start(payload: DragPayload): boolean {
    if (disabled() || pending.value) return false
    clearActive()
    const shift = getShift(payload)
    if (
      !shift ||
      (payload.kind === 'assignment' &&
        !toValue(options.editableDates).includes(payload.source.workDate))
    )
      return false
    session = { payload: copyPayload(payload), sourceSnapshot: { ...shift }, scope: scope() }
    activePayload.value = copyPayload(payload)
    keyboardSource.value = null
    error.value = ''
    message.value =
      payload.kind === 'template'
        ? 'Выберите ячейку для шаблона смены.'
        : 'Выберите ячейку назначения. Escape отменяет перенос.'
    return true
  }

  function beginMove(source: CellRef): boolean {
    if (!start({ kind: 'assignment', source })) return false
    keyboardSource.value = { ...source }
    return true
  }

  function canDrop(payload: DragPayload, target: CellRef): boolean {
    if (
      disabled() ||
      pending.value ||
      !session ||
      !samePayload(payload, session.payload) ||
      !fresh(session)
    )
      return false
    const result = applyScheduleOperation(context(), command(payload, target))
    return result.status !== 'blocked'
  }

  function commit(result: ReturnType<typeof applyScheduleOperation>, payload: DragPayload): void {
    if (result.status === 'applied') {
      options.rows.value = result.rows
      options.onCommit?.(result.changedCells)
      message.value =
        payload.kind === 'template'
          ? 'Шаблон назначен в ячейку. Исходный шаблон сохранён в панели.'
          : 'Смена перенесена. Источник и цель изменены одним действием.'
    } else if (result.status === 'noop') {
      message.value = 'Изменения не требуются.'
    }
    clearActive()
    pending.value = null
    error.value = ''
  }

  function drop(payload: DragPayload, target: CellRef): boolean {
    if (disabled() || pending.value) return false
    if (!session || !samePayload(payload, session.payload) || !fresh(session)) {
      clearActive()
      error.value = 'Данные или диапазон изменились. Начните перенос заново.'
      return false
    }
    const result = applyScheduleOperation(context(), command(payload, target))
    if (result.status === 'blocked') {
      clearActive()
      error.value = operationErrorMessage(result.reason)
      return false
    }
    if (result.status === 'confirm-replace') {
      const targetShift = getCell(target)
      pending.value = {
        ...session,
        payload: copyPayload(payload),
        target: { ...target },
        targetSnapshot: targetShift ? { ...targetShift } : null,
      }
      clearActive()
      message.value = 'Целевая ячейка занята. Подтвердите замену или отмените перенос.'
      return false
    }
    commit(result, payload)
    return true
  }

  function confirmReplacement(): boolean {
    const proposal = pending.value
    if (!proposal || disabled()) return false
    if (!fresh(proposal) || !sameShift(proposal.targetSnapshot, getCell(proposal.target))) {
      error.value =
        'Исходная или целевая смена изменилась. Отмените замену и начните перенос заново.'
      return false
    }
    const result = applyScheduleOperation(context(), command(proposal.payload, proposal.target), {
      replaceOccupied: true,
    })
    if (result.status === 'blocked') {
      error.value = operationErrorMessage(result.reason)
      return false
    }
    if (result.status !== 'applied' && result.status !== 'noop') return false
    commit(result, proposal.payload)
    return true
  }

  function chooseTarget(target: CellRef): boolean {
    const source = keyboardSource.value
    return source ? drop({ kind: 'assignment', source }, target) : false
  }

  watch(
    () => [scope(), disabled()] as const,
    ([nextScope, locked], previous) => {
      if ((previous && nextScope !== previous[0]) || locked) {
        if (activePayload.value || pending.value || keyboardSource.value) cancel()
      }
    },
  )

  return {
    activePayload,
    keyboardSource,
    pending,
    error,
    message,
    replacementOpen: computed(() => pending.value !== null),
    start,
    beginMove,
    canDrop,
    drop,
    chooseTarget,
    confirmReplacement,
    cancel,
    getShift,
  }
}
