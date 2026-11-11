<script setup lang="ts">
import type { Employee } from '@schedule/domain/types'
import { formatMinutes } from '@schedule/domain/format'
import { UiAvatar } from '@ui'

defineProps<{
  employee: Employee
  scheduledMinutes: number
}>()
</script>

<template>
  <div
    :class="$style.employee"
    role="rowheader"
    :data-inactive="employee.active === false || undefined"
  >
    <UiAvatar :name="employee.name" :src="employee.avatarUrl" />
    <div :class="$style.content">
      <span :class="$style.name" :title="employee.name"
        >{{ employee.name
        }}<span v-if="employee.active === false" :class="$style.inactive"> · Неактивен</span></span
      >
      <div :class="$style.description">
        <span :class="$style.position" :title="employee.position">{{ employee.position }}</span>
        <span aria-hidden="true">·</span>
        <span
          :class="$style.hours"
          :aria-label="`Запланировано ${formatMinutes(scheduledMinutes)}`"
          >{{ formatMinutes(scheduledMinutes) }}</span
        >
      </div>
    </div>
  </div>
</template>

<style module lang="scss">
.employee {
  display: flex;
  align-items: center;
  gap: var(--schedule-employee-content-gap);
  min-inline-size: 0;
  min-block-size: var(--schedule-row-height);
  padding: var(--schedule-employee-padding-block) var(--schedule-employee-padding-end)
    var(--schedule-employee-padding-block) var(--schedule-employee-padding-start);
  color: var(--schedule-employee-name-color);
  background: var(--row-background, var(--schedule-color-surface-primary));
}

.content {
  min-inline-size: 0;
}

.name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
}

.description {
  display: flex;
  align-items: center;
  gap: var(--schedule-employee-description-gap);
  min-inline-size: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}

.position {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hours {
  flex-shrink: 0;
  white-space: nowrap;
}

.inactive {
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}
</style>
