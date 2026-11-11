<script setup lang="ts">
import { UiIcon } from '@ui'
import IMask from 'imask/holder'
import MaskedRange from 'imask/masked/range'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    error?: string
    disabled?: boolean
    id?: string
    required?: boolean
  }>(),
  { error: '', disabled: false, required: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [event: FocusEvent] }>()
const generatedId = useId()
const inputId = computed(() => props.id || generatedId)
const input = ref<HTMLInputElement | null>(null)
let mask: ReturnType<typeof IMask> | undefined

onMounted(() => {
  if (!input.value) return

  mask = IMask(input.value, {
    mask: 'HH:`MM',
    // Eager append would reject the literal colon in pasted HH:mm with skipInvalid disabled.
    eager: 'remove',
    overwrite: true,
    skipInvalid: false,
    autofix: false,
    blocks: {
      HH: { mask: MaskedRange, from: 0, to: 23, maxLength: 2 },
      MM: { mask: MaskedRange, from: 0, to: 59, maxLength: 2 },
    },
  })
  mask.on('accept', () => {
    if (mask && mask.value !== props.modelValue) emit('update:modelValue', mask.value)
  })
  mask.value = props.modelValue
})

watch(
  () => props.modelValue,
  (value) => {
    if (mask && mask.value !== value) mask.value = value
  },
)
onBeforeUnmount(() => mask?.destroy())
</script>

<template>
  <div :class="$style.field">
    <label :class="$style.label" :for="inputId">{{ label }}</label>
    <div
      :class="$style.control"
      :data-disabled="disabled || undefined"
      :data-invalid="Boolean(error) || undefined"
    >
      <input
        :id="inputId"
        ref="input"
        :class="$style.input"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="00:00"
        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
        :disabled="disabled"
        :required="required"
        :aria-invalid="Boolean(error) || undefined"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        @blur="emit('blur', $event)"
      />
      <UiIcon name="clock" />
    </div>
    <p v-if="error" :id="`${inputId}-error`" :class="$style.error">{{ error }}</p>
  </div>
</template>

<style module lang="scss">
.field {
  display: grid;
  align-content: start;
  min-inline-size: 0;
  gap: var(--schedule-time-label-gap);
}
.label {
  color: var(--schedule-color-label-secondary);
  font-family: var(--schedule-font-family-caption), system-ui, sans-serif;
  font-size: var(--schedule-time-label-size);
  line-height: var(--schedule-time-label-line-height);
}
.control {
  display: flex;
  align-items: center;
  gap: var(--schedule-time-input-gap);
  min-block-size: var(--schedule-time-input-height);
  padding: var(--schedule-time-input-padding-block) var(--schedule-time-input-padding-end)
    var(--schedule-time-input-padding-block) var(--schedule-time-input-padding-start);
  border-radius: var(--schedule-time-input-radius);
  background: var(--schedule-color-input-bg);
  color: var(--schedule-color-label-secondary);
  &:focus-within {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
  &[data-invalid] {
    outline: 1px solid var(--schedule-color-field-error);
  }
  &[data-disabled] {
    color: var(--figma-button-neutral-secondary-text-disable);
  }
}
.input {
  inline-size: 100%;
  min-inline-size: 0;
  border: 0;
  padding: 0;
  outline: 0;
  color: var(--schedule-color-label-primary);
  background: transparent;
  font: inherit;
  font-variant-numeric: tabular-nums;
  &::placeholder {
    color: var(--schedule-color-label-secondary);
  }
  &:disabled {
    color: var(--figma-button-neutral-secondary-text-disable);
  }
}
.error {
  margin: 0;
  color: var(--schedule-color-field-error);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}
</style>
