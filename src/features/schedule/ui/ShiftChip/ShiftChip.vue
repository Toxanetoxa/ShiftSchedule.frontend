<script setup lang="ts">
import type { CalendarView, ShiftViewModel } from '@schedule/domain/types'
import { formatMinutes, formatShiftTime } from '@schedule/domain/format'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    shift: ShiftViewModel
    view?: CalendarView
    selected?: boolean
  }>(),
  {
    view: 'week',
    selected: false,
  },
)

const durationLabel = computed(() =>
  props.view === 'month' && props.shift.durationMinutes % 60 !== 0
    ? `${Number((props.shift.durationMinutes / 60).toFixed(2)).toLocaleString('ru-RU')} ч`
    : formatMinutes(props.shift.durationMinutes),
)
</script>

<template>
  <div
    :class="$style.shift"
    :data-kind="shift.colorKey"
    :data-view="view"
    :data-selected="selected"
  >
    <span v-if="view === 'week'" :class="$style.time">{{ formatShiftTime(shift) }}</span>
    <span
      :class="$style.duration"
      :aria-label="formatMinutes(shift.durationMinutes)"
      :title="formatMinutes(shift.durationMinutes)"
      >{{ durationLabel }}</span
    >
    <span v-if="shift.endDayOffset === 1" :class="$style.overnight">+1 день</span>
  </div>
</template>

<style module lang="scss">
.shift {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: var(--schedule-shift-height);
  padding: var(--schedule-shift-padding);
  border-radius: var(--schedule-radius-control);
  color: var(--_shift-text);
  background: var(--_shift-bg);
  position: relative;
  font-variant-numeric: tabular-nums;
  &[data-kind='morning'] {
    --_shift-bg: var(--schedule-shift-morning-bg);
    --_shift-text: var(--schedule-shift-morning-text);
    --_shift-duration: var(--schedule-shift-morning-duration);
  }
  &[data-kind='day'] {
    --_shift-bg: var(--schedule-shift-day-bg);
    --_shift-text: var(--schedule-shift-day-text);
    --_shift-duration: var(--schedule-shift-day-duration);
  }
  &[data-kind='evening'] {
    --_shift-bg: var(--schedule-shift-evening-bg);
    --_shift-text: var(--schedule-shift-evening-text);
    --_shift-duration: var(--schedule-shift-evening-duration-base);
  }
  &[data-kind='custom'] {
    --_shift-bg: var(--schedule-shift-custom-bg);
    --_shift-text: var(--schedule-shift-custom-text);
    --_shift-duration: var(--schedule-shift-custom-duration);
  }

  &[data-view='month'] .duration {
    font-size: var(--schedule-font-size-body);
    line-height: var(--schedule-line-height-body);
    font-weight: var(--schedule-font-weight-semibold);
    text-align: center;
  }

  &[data-view='month'] {
    inline-size: var(--schedule-month-inner-width);
  }
}
.time {
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  font-weight: 400;
  white-space: nowrap;
}
.duration {
  color: var(--_shift-duration);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  font-weight: 400;
}

.overnight {
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  white-space: nowrap;
}
</style>
