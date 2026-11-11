<script setup lang="ts">
import { UiButton, UiIcon } from '@ui'

withDefaults(
  defineProps<{ cellCount: number; employeeCount: number; dayCount: number; disabled?: boolean }>(),
  { disabled: false },
)
const emit = defineEmits<{ chooseTemplate: []; clearCells: []; clearSelection: [] }>()
</script>

<template>
  <div :class="$style.toolbar" role="group" aria-label="Действия с выделенными ячейками">
    <div :class="$style.summary" aria-live="polite">
      <span
        >Выделено <span :class="$style.counter">{{ cellCount }}</span></span
      >
      <span>Сотрудники: {{ employeeCount }}</span>
      <span>Дни: {{ dayCount }}</span>
    </div>
    <div :class="$style.actions">
      <UiButton
        color="neutral"
        variant="quinary"
        size="compact"
        :disabled="disabled || cellCount < 1"
        @click="emit('chooseTemplate')"
        ><template #leading><UiIcon name="plus" /></template>Поставить шаблон</UiButton
      >
      <UiButton
        color="neutral"
        variant="quinary"
        size="compact"
        :disabled="disabled || cellCount < 1"
        @click="emit('clearCells')"
        ><template #leading><UiIcon name="trash" /></template>Очистить</UiButton
      >
      <UiButton
        color="neutral"
        variant="primary"
        size="compact"
        :disabled="disabled || cellCount < 1"
        @click="emit('clearSelection')"
        ><template #leading><UiIcon name="close" /></template>Снять</UiButton
      >
    </div>
  </div>
</template>

<style module lang="scss">
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--schedule-selection-actions-gap);
  min-block-size: var(--schedule-selection-bar-height);
  padding: var(--schedule-selection-bar-padding-block) var(--schedule-selection-bar-padding-inline);
  border-radius: var(--schedule-selection-bar-radius);
  color: var(--schedule-color-label-inverted);
  background: var(--schedule-color-selection-bar-bg);
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
}
.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--schedule-selection-summary-gap);
  & > span {
    white-space: nowrap;
  }
}
.counter {
  display: inline-block;
  padding: var(--schedule-selection-counter-padding-block)
    var(--schedule-selection-counter-padding-inline);
  border-radius: var(--schedule-selection-counter-radius);
  background: var(--schedule-color-selection-counter-bg);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--schedule-selection-actions-gap);
}
</style>
