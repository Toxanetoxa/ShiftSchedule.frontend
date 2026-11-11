<script setup lang="ts">
import type { IsoDate, ScheduleDate } from '@schedule/domain/types'

defineProps<{
  dates: readonly ScheduleDate[]
  counts: Readonly<Record<IsoDate, number>>
  sticky?: boolean
}>()
</script>

<template>
  <div :class="$style.row" role="row" :data-sticky="sticky || undefined">
    <div :class="$style.label" role="rowheader">Покрытие</div>
    <div
      v-for="date in dates"
      :key="date.date"
      :class="$style.cell"
      role="gridcell"
      :aria-label="`${date.date}: ${counts[date.date] ?? 0} смен`"
    >
      <span :class="$style.count" :data-covered="(counts[date.date] ?? 0) > 0">{{
        counts[date.date] ?? 0
      }}</span>
    </div>
  </div>
</template>

<style module lang="scss">
.row {
  position: relative;
  display: grid;
  grid-template-columns: var(--calendar-columns);
  min-block-size: var(--schedule-coverage-row-min-height);

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    z-index: 3;
    block-size: var(--schedule-grid-line-width);
    background: var(--schedule-grid-line-color);
    pointer-events: none;
  }

  &[data-sticky] {
    position: sticky;
    bottom: 0;
    z-index: 2;
    min-width: max-content;
    background: var(--schedule-color-surface-primary);

    .label {
      position: sticky;
      left: 0;
      z-index: 2;
    }
  }
}

.label,
.cell {
  display: flex;
  align-items: center;
  min-inline-size: 0;
  min-block-size: var(--schedule-coverage-row-min-height);
}

.label {
  padding-inline: var(--schedule-employee-padding-start) var(--schedule-employee-padding-end);
  color: var(--schedule-color-label-secondary);
  background: var(--row-background, var(--schedule-color-surface-primary));
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
}

.cell {
  justify-content: center;
  // padding: var(--schedule-cell-padding);

  .label + & {
    overflow: hidden;
    border-end-start-radius: var(--schedule-radius-control);
  }
}

.count {
  display: flex;
  align-items: center;
  justify-content: center;
  inline-size: 100%;
  min-block-size: 48px;
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);

  &[data-covered='false'] {
    color: var(--schedule-color-coverage-empty-text);
    background: var(--schedule-color-coverage-empty-bg);
  }

  &[data-covered='true'] {
    color: var(--schedule-color-coverage-filled-text);
    background: var(--schedule-color-coverage-filled-bg);
  }
}
</style>
