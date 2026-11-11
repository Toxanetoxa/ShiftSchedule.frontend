import type { CellRef, DragPayload } from '@schedule/domain/types'
import type { ComputedRef, InjectionKey } from 'vue'
import { inject } from 'vue'

export interface ScheduleDndContext {
  scope: string
  disabled: ComputedRef<boolean>
  payload: ComputedRef<DragPayload | null>
  target: ComputedRef<CellRef | null>
  allowed: ComputedRef<boolean>
  suppressClick: (event: Event) => boolean
}

export const scheduleDndKey: InjectionKey<ScheduleDndContext> = Symbol('ScheduleDnd')

/** Standalone components do not register dnd-kit hooks without this provider. */
export function useScheduleDnd(): ScheduleDndContext | null {
  return inject(scheduleDndKey, null)
}

export function sameCell(
  left: CellRef | null | undefined,
  right: CellRef | null | undefined,
): boolean {
  return Boolean(
    left && right && left.employeeId === right.employeeId && left.workDate === right.workDate,
  )
}

export function readCell(value: unknown): CellRef | null {
  if (!value || typeof value !== 'object' || !('employeeId' in value) || !('workDate' in value))
    return null
  if (typeof value.employeeId !== 'string' || typeof value.workDate !== 'string') return null
  return { employeeId: value.employeeId, workDate: value.workDate }
}

export function readPayload(value: unknown): DragPayload | null {
  if (!value || typeof value !== 'object' || !('kind' in value)) return null
  if (value.kind === 'template' && 'templateId' in value && typeof value.templateId === 'string') {
    return { kind: 'template', templateId: value.templateId }
  }
  if (value.kind === 'assignment' && 'source' in value) {
    const source = readCell(value.source)
    if (source) return { kind: 'assignment', source }
  }
  return null
}
