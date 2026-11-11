<script setup lang="ts">
import type { CalendarView, SelectionSummary } from '@schedule/domain/types'
import CalendarViewToggle from '@schedule/ui/CalendarViewToggle/CalendarViewToggle.vue'
import EmployeeSearch from '@schedule/ui/EmployeeSearch/EmployeeSearch.vue'
import SelectionToolbar from '@schedule/ui/SelectionToolbar/SelectionToolbar.vue'

withDefaults(
  defineProps<{
    modelValue: string
    view: CalendarView
    selectionSummary: SelectionSummary
    disabled?: boolean
  }>(),
  { disabled: false },
)
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:view': [view: CalendarView]
  clearSearch: []
  chooseTemplate: []
  clearCells: []
  clearSelection: []
}>()
</script>

<template>
  <SelectionToolbar
    v-if="selectionSummary.cellCount > 0"
    v-bind="selectionSummary"
    :disabled="disabled"
    @choose-template="emit('chooseTemplate')"
    @clear-cells="emit('clearCells')"
    @clear-selection="emit('clearSelection')"
  />
  <div v-else :class="$style.toolbar">
    <EmployeeSearch
      :class="$style.search"
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
      @clear="emit('clearSearch')"
    />
    <CalendarViewToggle
      :model-value="view"
      :disabled="disabled"
      @update:model-value="emit('update:view', $event)"
    />
    <slot />
  </div>
</template>

<style module lang="scss">
.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--figma-spacing-padding-xl);
  min-block-size: var(--schedule-search-height);
}
.search {
  flex: 1 1 240px;
  max-inline-size: var(--schedule-search-reference-width);
}
@media (width < 768px) {
  .search {
    flex-basis: 100%;
    max-inline-size: none;
  }
}
</style>
