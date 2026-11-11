<script setup lang="ts">
import type { ShiftTemplate } from '@schedule/domain/types'
import { formatMinutes, formatShiftTime } from '@schedule/domain/format'
import { UiButton, UiPopover } from '@ui'

withDefaults(
  defineProps<{ templates: readonly ShiftTemplate[]; targetSummary: string; disabled?: boolean }>(),
  { disabled: false },
)
const emit = defineEmits<{ selectTemplate: [templateId: string] }>()
const open = defineModel<boolean>('open', { default: false })
function selectTemplate(id: string, disabled: boolean): void {
  if (disabled) return
  emit('selectTemplate', id)
  open.value = false
}
</script>

<template>
  <UiPopover v-model:open="open" label="Выбрать шаблон смены" :class="$style.picker">
    <template #trigger
      ><slot name="trigger"
        ><UiButton :disabled="disabled">Выбрать шаблон</UiButton></slot
      ></template
    >
    <p :class="$style.summary">{{ targetSummary }}</p>
    <div v-if="templates.length" :class="$style.list">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        :class="$style.option"
        :data-kind="template.colorKey"
        :disabled="disabled"
        @click="selectTemplate(template.id, disabled)"
      >
        <span
          ><strong>{{ template.label }}</strong
          ><span
            >{{ formatShiftTime(template) }}{{ template.endDayOffset ? ' · +1 день' : '' }}</span
          ></span
        >
        <span>{{ formatMinutes(template.durationMinutes) }}</span>
      </button>
    </div>
    <p v-else role="status">Шаблонов пока нет.</p>
  </UiPopover>
</template>

<style module lang="scss">
@use '@/shared/styles/shift-template';

.picker {
  box-sizing: border-box;
  inline-size: var(--schedule-shift-picker-width);
  padding: var(--schedule-shift-picker-padding);
  border: var(--schedule-shift-picker-border-width) solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-shift-picker-radius);
  box-shadow: none;
}
.summary {
  margin: 0 0 12px;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
.list {
  display: grid;
  gap: 8px;
}
.option {
  @include shift-template.card;
  align-items: center;
  justify-content: space-between;
  border: 0;
  text-align: start;
  cursor: pointer;
  font: inherit;

  > span:first-child {
    display: grid;
    gap: 4px;
  }
  > span:last-child {
    font-size: 12px;
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  &:focus-visible {
    outline: 2px solid var(--schedule-color-focus);
    outline-offset: 2px;
  }
}
</style>
