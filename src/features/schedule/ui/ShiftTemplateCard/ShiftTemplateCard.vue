<script setup lang="ts">
import type { ShiftTemplate } from '@schedule/domain/types'
import { useDraggable } from '@dnd-kit/vue'
import { useScheduleDnd } from '@schedule/dnd/context'
import { formatMinutes, formatShiftTime } from '@schedule/domain/format'
import TemplateHint from '@schedule/ui/TemplateHint/TemplateHint.vue'
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    template: ShiftTemplate
    disabled?: boolean
    badgeLabel?: string
    dragging?: boolean
    dragEnabled?: boolean
    applyDisabled?: boolean
  }>(),
  {
    disabled: false,
    badgeLabel: undefined,
    dragging: false,
    dragEnabled: false,
    applyDisabled: false,
  },
)

const emit = defineEmits<{
  apply: []
}>()

const element = ref<HTMLButtonElement | null>(null)
const dnd = useScheduleDnd()
const draggable = dnd
  ? useDraggable({
      id: () => `${dnd.scope}:template:${props.template.id}`,
      element,
      type: 'template',
      data: () => ({ payload: { kind: 'template', templateId: props.template.id } }),
      disabled: () => props.disabled || !props.dragEnabled || dnd.disabled.value,
    })
  : null
const canDrag = computed(() =>
  Boolean(dnd && props.dragEnabled && !props.disabled && !dnd.disabled.value),
)
const isDragging = computed(
  () => props.dragging || Boolean(draggable?.isDragging.value || draggable?.isDropping.value),
)

function apply(event: MouseEvent): void {
  if (props.disabled || props.applyDisabled || event.defaultPrevented || dnd?.suppressClick(event))
    return
  emit('apply')
}
</script>

<template>
  <button
    ref="element"
    :class="$style.card"
    type="button"
    :data-kind="template.colorKey"
    :data-dragging="isDragging || undefined"
    :data-drag-enabled="canDrag || undefined"
    :disabled="disabled || (applyDisabled && !canDrag)"
    :aria-disabled="disabled || (applyDisabled && !canDrag) || undefined"
    :aria-describedby="canDrag && dnd ? `schedule-dnd-instructions-${dnd.scope}` : undefined"
    :draggable="false"
    :aria-label="`${canDrag && applyDisabled ? 'Перенести' : 'Применить'} шаблон «${template.label}», ${formatShiftTime(template)}${template.endDayOffset ? ', окончание на следующий день' : ''}, ${formatMinutes(template.durationMinutes)}`"
    @click="apply"
    @dragstart.prevent
  >
    <span :class="$style.content">
      <span :class="$style.label">{{ template.label }}</span>
      <span :class="$style.time"
        >{{ formatShiftTime(template) }}<span v-if="template.endDayOffset">, +1 день</span></span
      >
    </span>
    <span :class="$style.duration">{{ formatMinutes(template.durationMinutes) }}</span>
    <TemplateHint v-if="badgeLabel" :label="badgeLabel" />
  </button>
</template>

<style module lang="scss">
@use '@/shared/styles/shift-template';

.card {
  @include shift-template.card;
  align-items: center;
  border: 0;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }

  &:disabled,
  &[data-dragging='true'] {
    opacity: 0.55;
  }

  &:disabled {
    cursor: not-allowed;
  }

  &[data-drag-enabled='true'] {
    touch-action: none;
    cursor: grab;
  }
}

.content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;
}

.label {
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  font-weight: var(--schedule-font-weight-semibold);
}

.time {
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  white-space: nowrap;
}

.duration {
  flex-shrink: 0;
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  white-space: nowrap;
}
</style>
