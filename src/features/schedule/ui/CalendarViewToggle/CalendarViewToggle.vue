<script setup lang="ts">
import type { CalendarView } from '@schedule/domain/types'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

withDefaults(defineProps<{ modelValue: CalendarView; disabled?: boolean }>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: CalendarView] }>()

function update(value: unknown): void {
  if (value === 'week' || value === 'month') emit('update:modelValue', value)
}
</script>

<template>
  <RadioGroupRoot
    :class="$style.toggle"
    :model-value="modelValue"
    :disabled="disabled"
    aria-label="Период отображения графика"
    orientation="horizontal"
    @update:model-value="update"
  >
    <RadioGroupItem :class="$style.item" value="month">Месяц</RadioGroupItem>
    <RadioGroupItem :class="$style.item" value="week">Неделя</RadioGroupItem>
  </RadioGroupRoot>
</template>

<style module lang="scss">
.toggle {
  display: flex;
  inline-size: var(--schedule-view-toggle-reference-width);
  max-inline-size: 100%;
  min-block-size: var(--schedule-view-toggle-height);
  padding: var(--schedule-view-toggle-padding);
  border-radius: var(--schedule-view-toggle-radius);
  background: var(--schedule-color-surface-muted);
}
.item {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  flex: 1 1 0;
  min-inline-size: 0;
  min-block-size: var(--schedule-view-item-height);
  gap: var(--schedule-view-item-gap);
  padding: var(--schedule-view-item-padding-block) var(--schedule-view-item-padding-inline);
  border: 0;
  border-radius: var(--schedule-view-item-radius);
  background: transparent;
  color: var(--schedule-color-label-primary);
  font: inherit;
  cursor: pointer;
  &[data-state='checked'] {
    background: var(--schedule-color-selection-bar-bg);
    color: var(--schedule-color-label-inverted);
  }
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
  &:disabled {
    color: var(--figma-button-neutral-secondary-text-disable);
    cursor: default;
  }
}
</style>
