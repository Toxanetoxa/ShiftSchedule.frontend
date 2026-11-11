<script setup lang="ts">
import type { CellConflict, CellRef, ShiftViewModel } from '@schedule/domain/types'
import { formatShiftTime } from '@schedule/domain/format'
import { cellKey } from '@schedule/domain/types'
import { UiButton, UiDialog } from '@ui'
import { computed, ref, useId, watch } from 'vue'

type Choice = 'local' | 'remote'
const props = withDefaults(
  defineProps<{
    conflicts: readonly CellConflict[]
    remoteVersion: number
    pending?: boolean
    error?: string | null
  }>(),
  { pending: false, error: null },
)
const emit = defineEmits<{
  resolveCell: [cell: CellRef, choice: Choice]
  confirmRebase: [
    resolution: { remoteVersion: number; resolutions: { cell: CellRef; choice: Choice }[] },
  ]
  cancel: []
}>()
const open = defineModel<boolean>('open', { default: false })
const choices = ref<Record<string, Choice>>({})
const reviewedVersion = ref(props.remoteVersion)
const id = useId()
const signature = computed(() => JSON.stringify([props.remoteVersion, props.conflicts]))
watch([signature, open], () => {
  choices.value = {}
  reviewedVersion.value = props.remoteVersion
})
const allResolved = computed(
  () =>
    reviewedVersion.value === props.remoteVersion &&
    props.conflicts.every((conflict) => !!choices.value[cellKey(conflict.cell)]),
)
function describe(shift: ShiftViewModel | null): string {
  return shift ? `${formatShiftTime(shift)}${shift.endDayOffset ? ' · +1 день' : ''}` : 'Нет смены'
}
function resolve(cell: CellRef, choice: Choice): void {
  if (props.pending) return
  choices.value = { ...choices.value, [cellKey(cell)]: choice }
  emit('resolveCell', cell, choice)
}
function confirm(): void {
  if (!allResolved.value || props.pending) return
  emit('confirmRebase', {
    remoteVersion: reviewedVersion.value,
    resolutions: props.conflicts.map(({ cell }) => ({
      cell,
      choice: choices.value[cellKey(cell)]!,
    })),
  })
}
function updateOpen(value: boolean): void {
  if (props.pending && !value) return
  open.value = value
  if (!value) emit('cancel')
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Согласовать изменения"
    :description="`Выберите вариант каждой смены для серверной версии ${remoteVersion}. До подтверждения версия черновика не изменится.`"
    :pending="pending"
    :error="error"
    @update:open="updateOpen"
  >
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <div :class="$style.list">
      <fieldset
        v-for="conflict in conflicts"
        :key="cellKey(conflict.cell)"
        :class="$style.cell"
        :disabled="pending"
      >
        <legend>{{ conflict.employeeName }} · {{ conflict.cell.workDate }}</legend>
        <label
          ><input
            type="radio"
            :name="`${id}-${cellKey(conflict.cell)}`"
            :checked="choices[cellKey(conflict.cell)] === 'local'"
            @change="resolve(conflict.cell, 'local')"
          /><span
            ><strong>Мой вариант</strong><span>{{ describe(conflict.local) }}</span></span
          ></label
        >
        <label
          ><input
            type="radio"
            :name="`${id}-${cellKey(conflict.cell)}`"
            :checked="choices[cellKey(conflict.cell)] === 'remote'"
            @change="resolve(conflict.cell, 'remote')"
          /><span
            ><strong>Серверный вариант</strong><span>{{ describe(conflict.remote) }}</span></span
          ></label
        >
      </fieldset>
      <p v-if="!conflicts.length">Конфликтов ячеек нет. Можно принять серверную версию.</p>
      <p v-else :class="$style.summary" role="status">
        Согласовано {{ Object.keys(choices).length }} из {{ conflicts.length }}
      </p>
    </div>
    <template #footer
      ><UiButton color="neutral" variant="tertiary" :disabled="pending" @click="updateOpen(false)"
        >Отмена</UiButton
      ><UiButton :disabled="!allResolved" :loading="pending" @click="confirm"
        >Принять решения</UiButton
      ></template
    >
  </UiDialog>
</template>

<style module lang="scss">
.list {
  display: grid;
  gap: 16px;
}
.cell {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-control);

  legend {
    padding-inline: 4px;
    font-size: 14px;
    font-weight: 600;
  }
  label {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: var(--schedule-radius-control);
    cursor: pointer;

    &:has(input:checked) {
      background: var(--schedule-color-coverage-filled-bg);
    }
    > span {
      display: grid;
      gap: 4px;
      font-size: 14px;
    }
    strong {
      font-weight: 600;
    }
  }
  input {
    accent-color: var(--schedule-color-brand-action);
  }
}
.summary {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
}
</style>
