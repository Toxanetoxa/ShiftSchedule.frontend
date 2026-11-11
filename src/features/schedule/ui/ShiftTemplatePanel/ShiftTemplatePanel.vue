<script setup lang="ts">
import type { ShiftInput, ShiftTemplate } from '@schedule/domain/types'
import { useScheduleDnd } from '@schedule/dnd/context'
import CustomShiftForm from '@schedule/ui/CustomShiftForm/CustomShiftForm.vue'
import ShiftTemplateCard from '@schedule/ui/ShiftTemplateCard/ShiftTemplateCard.vue'
import { useId } from 'vue'

const props = withDefaults(
  defineProps<{
    templates: readonly ShiftTemplate[]
    selectionCount: number
    disabled?: boolean
    dragEnabled?: boolean
  }>(),
  { disabled: false, dragEnabled: false },
)
const emit = defineEmits<{
  applyTemplate: [templateId: string]
  applyCustom: [shift: ShiftInput]
}>()
const headingId = useId()
const dnd = useScheduleDnd()

function applyTemplate(id: string): void {
  if (!props.disabled && props.selectionCount > 0) emit('applyTemplate', id)
}
</script>

<template>
  <section :class="$style.panel" :aria-labelledby="headingId">
    <div :class="$style.section">
      <h2 :id="headingId" :class="$style.title">Шаблоны смен</h2>
      <p :class="$style.hint">
        Выберите шаблон для выделенных ячеек.<span v-if="dragEnabled && dnd">
          Или перенесите его в календарь без предварительного выделения.</span
        >
      </p>
      <p v-if="templates.length === 0" :class="$style.hint">Шаблонов пока нет.</p>
      <div :class="$style.templates">
        <ShiftTemplateCard
          v-for="template in templates"
          :key="template.id"
          :template="template"
          :disabled="disabled"
          :apply-disabled="selectionCount < 1"
          :drag-enabled="dragEnabled"
          @apply="applyTemplate(template.id)"
        />
      </div>
    </div>
    <CustomShiftForm
      :class="$style.custom"
      :selected-count="selectionCount"
      :disabled="disabled"
      @apply="emit('applyCustom', $event)"
    />
  </section>
</template>

<style module lang="scss">
.panel {
  min-inline-size: 0;
  padding: var(--schedule-panel-padding);
  border-radius: var(--schedule-radius-panel);
  background: var(--schedule-color-surface-primary);
  display: grid;
  align-content: start;
  gap: var(--schedule-panel-section-gap);
  inline-size: var(--schedule-panel-width);
  max-inline-size: 100%;
}
.section,
.templates {
  display: grid;
  gap: var(--figma-spacing-padding-l);
}
.title {
  margin: 0;
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  font-weight: var(--schedule-font-weight-semibold);
}
.hint {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}
.custom {
  padding-block-start: var(--schedule-panel-section-gap);
  border-block-start: 1px solid var(--schedule-color-border-subtle);
}
@media (width < 1100px) {
  .panel {
    inline-size: 100%;
  }
}
</style>
