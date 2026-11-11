<script setup lang="ts">
import type { CalendarView, IsoDate } from '@schedule/domain/types'
import { isIsoDate } from '@schedule/domain/format'
import { UiButton, UiDatePicker, UiIcon } from '@ui'

withDefaults(
  defineProps<{
    activeDate: IsoDate
    view: CalendarView
    rangeLabel: string
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{ previous: []; next: []; today: []; chooseDate: [date: IsoDate] }>()

function choose(value: string): void {
  if (isIsoDate(value)) {
    emit('chooseDate', value)
  }
}
</script>

<template>
  <nav :class="$style.navigator" aria-label="Навигация по датам графика">
    <div :class="$style.arrows">
      <UiButton
        color="neutral"
        variant="quaternary"
        size="compact"
        icon-only
        :ariaLabel="view === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'"
        :disabled="disabled"
        @click="emit('previous')"
        ><UiIcon name="chevron-left"
      /></UiButton>
      <UiButton
        color="neutral"
        variant="quaternary"
        size="compact"
        icon-only
        :ariaLabel="view === 'week' ? 'Следующая неделя' : 'Следующий месяц'"
        :disabled="disabled"
        @click="emit('next')"
        ><UiIcon name="chevron-right"
      /></UiButton>
    </div>
    <p :class="$style.range" aria-live="polite">{{ rangeLabel }}</p>
    <UiButton
      color="neutral"
      variant="quaternary"
      size="compact"
      :disabled="disabled"
      @click="emit('today')"
      >Сегодня</UiButton
    >
    <UiDatePicker
      :class="$style.date"
      :model-value="activeDate"
      label="Перейти к дате"
      hide-label
      size="compact"
      :disabled="disabled"
      @update:model-value="choose"
    />
  </nav>
</template>

<style module lang="scss">
.navigator {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--figma-spacing-margin-m);
}
.arrows {
  display: flex;
  gap: var(--figma-spacing-margin-s);
}
.range {
  margin: 0;
  margin-inline-end: auto;
  font-weight: var(--schedule-font-weight-semibold);
}
.date {
  inline-size: 176px;
  max-inline-size: 100%;
}
</style>
