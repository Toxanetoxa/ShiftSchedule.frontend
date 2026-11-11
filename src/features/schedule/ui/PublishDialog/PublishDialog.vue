<script setup lang="ts">
import type { DateRange } from '@schedule/domain/types'
import { isIsoDate } from '@schedule/domain/format'
import { UiButton, UiDatePicker, UiDialog } from '@ui'
import { computed, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{ range: DateRange; hasDirty?: boolean; pending?: boolean; error?: string | null }>(),
  { hasDirty: false, pending: false, error: null },
)
const emit = defineEmits<{
  confirm: [range: DateRange]
  'update:range': [range: DateRange]
  cancel: []
}>()
const open = defineModel<boolean>('open', { default: false })
const startDate = ref(props.range.startDate)
const endDate = ref(props.range.endDate)
const id = useId()
const rangeError = computed(() => {
  if (!isIsoDate(startDate.value) || !isIsoDate(endDate.value))
    return 'Укажите обе даты публикации.'
  if (endDate.value <= startDate.value) return 'Конец диапазона должен быть позже начала.'
  return ''
})
watch(
  () => [open.value, props.range.startDate, props.range.endDate] as const,
  ([isOpen, start, end], previous) => {
    if (
      isOpen &&
      !props.pending &&
      (!previous?.[0] || start !== previous[1] || end !== previous[2])
    ) {
      startDate.value = start
      endDate.value = end
    }
  },
)
watch([startDate, endDate], () => {
  if (!rangeError.value && !props.pending)
    emit('update:range', { startDate: startDate.value, endDate: endDate.value })
})
function updateOpen(value: boolean): void {
  if (props.pending && !value) return
  open.value = value
  if (!value) emit('cancel')
}
function confirm(): void {
  if (rangeError.value || props.pending) return
  emit('confirm', { startDate: startDate.value, endDate: endDate.value })
}
</script>

<template>
  <UiDialog
    :open="open"
    title="Опубликовать график"
    description="Проверьте диапазон перед публикацией. Дата окончания не входит в диапазон."
    :pending="pending"
    :error="error"
    @update:open="updateOpen"
  >
    <template v-if="$slots.trigger" #trigger><slot name="trigger" /></template>
    <form :id="id" :class="$style.form" @submit.prevent="confirm">
      <UiDatePicker
        :id="`${id}-start`"
        v-model="startDate"
        label="С даты"
        :disabled="pending"
        :invalid="!!rangeError"
        :described-by="rangeError ? `${id}-error` : undefined"
        required
      />
      <UiDatePicker
        :id="`${id}-end`"
        v-model="endDate"
        label="До даты, не включая"
        :disabled="pending"
        :invalid="!!rangeError"
        :described-by="rangeError ? `${id}-error` : undefined"
        required
      />
      <p v-if="rangeError" :id="`${id}-error`" :class="$style.error" role="alert">
        {{ rangeError }}
      </p>
      <p :class="$style.note">
        {{
          hasDirty
            ? 'Сначала будут сохранены ваши изменения, затем опубликован выбранный диапазон.'
            : 'Будет опубликована сохранённая версия графика.'
        }}
      </p>
    </form>
    <template #footer
      ><UiButton color="neutral" variant="tertiary" :disabled="pending" @click="updateOpen(false)"
        >Отмена</UiButton
      ><UiButton type="submit" :form="id" :loading="pending" :disabled="!!rangeError">{{
        hasDirty ? 'Сохранить и опубликовать' : 'Опубликовать'
      }}</UiButton></template
    >
  </UiDialog>
</template>

<style module lang="scss">
.form {
  display: grid;
  gap: 16px;
}
.error {
  margin: 0;
  color: var(--schedule-color-field-error);
}
.note {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
</style>
