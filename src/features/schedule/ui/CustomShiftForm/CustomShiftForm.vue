<script setup lang="ts">
import type { ShiftInput } from '@schedule/domain/types'
import TimeField from '@schedule/ui/TimeField/TimeField.vue'
import { UiButton } from '@ui'
import { computed, ref } from 'vue'

const props = withDefaults(defineProps<{ selectedCount: number; disabled?: boolean }>(), {
  disabled: false,
})
const emit = defineEmits<{ apply: [shift: ShiftInput] }>()
const startTime = ref('')
const endTime = ref('')
const startTouched = ref(false)
const endTouched = ref(false)
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function toMinutes(value: string): number | null {
  if (!timePattern.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  return hours * 60 + minutes
}

const startMinutes = computed(() => toMinutes(startTime.value))
const endMinutes = computed(() => toMinutes(endTime.value))
const equalTimes = computed(
  () => startMinutes.value !== null && startMinutes.value === endMinutes.value,
)
const valid = computed(
  () => startMinutes.value !== null && endMinutes.value !== null && !equalTimes.value,
)
const night = computed(() => {
  const start = startMinutes.value
  const end = endMinutes.value
  return start !== null && end !== null && end < start
})
const startError = computed(() =>
  startTouched.value && startMinutes.value === null
    ? 'Введите время в формате ЧЧ:ММ, от 00:00 до 23:59.'
    : '',
)
const endError = computed(() => {
  if (endTouched.value && endMinutes.value === null)
    return 'Введите время в формате ЧЧ:ММ, от 00:00 до 23:59.'
  if ((endTouched.value || startTouched.value) && equalTimes.value)
    return 'Начало и конец смены должны различаться.'
  return ''
})
const canApply = computed(() => valid.value && props.selectedCount > 0 && !props.disabled)

function apply(): void {
  startTouched.value = true
  endTouched.value = true
  if (!canApply.value) return

  emit('apply', {
    startTime: startTime.value,
    endTime: endTime.value,
    endDayOffset: night.value ? 1 : 0,
    sourceTemplateId: null,
  })
}
</script>

<template>
  <form :class="$style.form" novalidate @submit.prevent="apply">
    <h3 :class="$style.title">Своя смена</h3>
    <div :class="$style.fields">
      <TimeField
        v-model="startTime"
        label="Начало"
        :error="startError"
        :disabled="disabled"
        required
        @blur="startTouched = true"
      />
      <TimeField
        v-model="endTime"
        label="Конец"
        :error="endError"
        :disabled="disabled"
        required
        @blur="endTouched = true"
      />
    </div>
    <p :class="$style.hint" aria-live="polite">
      <template v-if="night"
        >Окончание на следующий день. Смена относится к дате начала.
        <span v-if="selectedCount < 1">Для назначения выделите ячейки.</span></template
      >
      <template v-else-if="selectedCount < 1">Выделите ячейки, чтобы назначить смену.</template>
      <template v-else
        >Выбрано ячеек: {{ selectedCount }}. Время применяется только по кнопке.</template
      >
    </p>
    <UiButton type="submit" :disabled="!canApply">Поставить в выделенные</UiButton>
  </form>
</template>

<style module lang="scss">
.form {
  display: grid;
  gap: var(--figma-spacing-padding-xl);
  min-inline-size: 0;
}
.title {
  margin: 0;
  font-size: var(--schedule-font-size-body);
  line-height: var(--schedule-line-height-body);
  font-weight: var(--schedule-font-weight-semibold);
}
.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--figma-spacing-margin-m);
}
.hint {
  margin: 0;
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  color: var(--schedule-color-label-secondary);
}
</style>
