<script setup lang="ts">
import type { IsoDate } from '@schedule/domain/types'

withDefaults(
  defineProps<{
    date: IsoDate
    weekdayLabel: string
    dayLabel: string
    covered?: boolean
    isToday?: boolean
    disabled?: boolean
    tabIndex?: number
  }>(),
  {
    covered: false,
    isToday: false,
    disabled: false,
    tabIndex: 0,
  },
)

const emit = defineEmits<{ openDateActions: [] }>()
</script>

<template>
  <div :class="$style.header" role="columnheader" :data-covered="covered" :data-today="isToday">
    <span
      :class="$style.button"
      type="button"
      :disabled="disabled"
      :tabindex="tabIndex"
      :aria-label="`${weekdayLabel}, ${dayLabel}, ${date}${isToday ? ', сегодня' : ''}, ${covered ? 'смены назначены' : 'нет смен'}. Действия с датой`"
      :aria-current="isToday ? 'date' : undefined"
      @click="emit('openDateActions')"
    >
      <span>{{ weekdayLabel }}</span>
      <span :class="$style.day">{{ dayLabel }}</span>
    </span>
  </div>
</template>

<style module lang="scss">
.header {
  min-inline-size: 0;
  min-block-size: var(--schedule-header-height);
  padding: var(--schedule-cell-padding);

  &[data-covered='true'] .button {
    color: var(--schedule-color-coverage-filled-text);
    background: var(--schedule-color-coverage-filled-bg);
  }

  &[data-today='true'] .day {
    font-weight: var(--schedule-font-weight-semibold);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  inline-size: 100%;
  min-block-size: calc(var(--schedule-header-height) - 2 * var(--schedule-cell-padding));
  padding: 4px;
  border: 0;
  border-radius: var(--schedule-radius-control);
  color: var(--schedule-color-coverage-empty-text);
  background: var(--schedule-color-coverage-empty-bg);
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
  cursor: pointer;

  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: -2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
</style>
