<script setup lang="ts">
import type { IsoDate, ShiftTemplate } from '@schedule/domain/types'
import { UiButton, UiPopover } from '@ui'

withDefaults(
  defineProps<{
    date: IsoDate
    visibleEmployeeCount: number
    templates: readonly ShiftTemplate[]
    disabled?: boolean
    reference?: HTMLElement | null
  }>(),
  { disabled: false, reference: null },
)
const emit = defineEmits<{ applyTemplate: [templateId: string]; selectDateCells: [] }>()
const open = defineModel<boolean>('open', { default: false })
function apply(id: string, blocked: boolean): void {
  if (blocked) return
  emit('applyTemplate', id)
  open.value = false
}
function select(blocked: boolean): void {
  if (blocked) return
  emit('selectDateCells')
  open.value = false
}
</script>

<template>
  <UiPopover
    v-model:open="open"
    :label="`Действия на дату ${date}`"
    :class="$style.picker"
    :reference="reference"
  >
    <template v-if="!reference" #trigger
      ><slot name="trigger"
        ><UiButton color="neutral" variant="tertiary" size="compact" :disabled="disabled">{{
          date
        }}</UiButton></slot
      ></template
    >
    <p :class="$style.heading">{{ date }}</p>
    <p :class="$style.scope">
      Видимых сотрудников: {{ visibleEmployeeCount }}. Скрытые поиском строки не изменятся.
    </p>
    <div :class="$style.list">
      <UiButton
        :class="$style.action"
        color="neutral"
        variant="secondary"
        size="compact"
        :disabled="disabled || visibleEmployeeCount === 0"
        @click="select(disabled || visibleEmployeeCount === 0)"
        >Выделить ячейки даты</UiButton
      >
      <UiButton
        v-for="template in templates"
        :key="template.id"
        :class="$style.action"
        color="neutral"
        variant="tertiary"
        size="compact"
        :disabled="disabled || visibleEmployeeCount === 0"
        @click="apply(template.id, disabled || visibleEmployeeCount === 0)"
        >Назначить «{{ template.label }}»</UiButton
      >
    </div>
    <p v-if="visibleEmployeeCount === 0" :class="$style.scope" role="status">
      Нет видимых сотрудников для назначения.
    </p>
  </UiPopover>
</template>

<style module lang="scss">
.picker {
  box-sizing: border-box;
  inline-size: var(--schedule-shift-picker-width);
  padding: var(--schedule-shift-picker-padding);
  border: var(--schedule-shift-picker-border-width) solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-shift-picker-radius);
  box-shadow: none;
}
.heading {
  margin: 0 0 8px;
  font-weight: 600;
}
.scope {
  margin: 0 0 12px;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
.list {
  display: grid;
  gap: 4px;

  .action {
    justify-content: flex-start;
    text-align: start;
  }
}
</style>
