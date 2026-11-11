<script setup lang="ts">
import type { CalendarView, SelectionSummary } from '@schedule/domain/types'
import CalendarViewToggle from '@schedule/ui/CalendarViewToggle/CalendarViewToggle.vue'
import EmployeeSearch from '@schedule/ui/EmployeeSearch/EmployeeSearch.vue'
import SelectionToolbar from '@schedule/ui/SelectionToolbar/SelectionToolbar.vue'
import { computed, nextTick, ref } from 'vue'

const props = withDefaults(
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
const root = ref<HTMLElement | null>(null)
const hasSelection = computed(() => props.selectionSummary.cellCount > 0)

async function clearSelection(): Promise<void> {
  emit('clearSelection')
  await nextTick()
  if (!hasSelection.value && !props.disabled) {
    root.value
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus({ preventScroll: true })
  }
}
</script>

<template>
  <div ref="root" :class="$style.container">
    <div :class="$style.layer" :aria-hidden="hasSelection" :inert="hasSelection || undefined">
      <div :class="$style.toolbar">
        <EmployeeSearch
          :class="$style.search"
          :model-value="modelValue"
          :disabled="disabled || hasSelection"
          @update:model-value="emit('update:modelValue', $event)"
          @clear="emit('clearSearch')"
        />
        <CalendarViewToggle
          :model-value="view"
          :disabled="disabled || hasSelection"
          @update:model-value="emit('update:view', $event)"
        />
        <slot />
      </div>
    </div>
    <div :class="$style.layer" :aria-hidden="!hasSelection" :inert="!hasSelection || undefined">
      <SelectionToolbar
        v-bind="selectionSummary"
        :disabled="disabled || !hasSelection"
        @choose-template="emit('chooseTemplate')"
        @clear-cells="emit('clearCells')"
        @clear-selection="clearSelection"
      >
        <template v-if="$slots['template-action']" #template-action="slotProps">
          <slot name="template-action" v-bind="slotProps" />
        </template>
      </SelectionToolbar>
    </div>
  </div>
</template>

<style module lang="scss">
.container {
  display: grid;
  min-inline-size: 0;
}
.layer {
  grid-area: 1 / 1;
  align-self: center;
  min-inline-size: 0;

  &[aria-hidden='true'] {
    visibility: hidden;
    pointer-events: none;
  }
}
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
