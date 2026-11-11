<script setup lang="ts">
import { UiIcon } from '@ui'
import { ref, useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    color?: 'white' | 'gray'
    disabled?: boolean
    label?: string
  }>(),
  { color: 'gray', disabled: false, label: 'Поиск сотрудника по ФИО' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; clear: [] }>()
const input = ref<HTMLInputElement | null>(null)
const id = useId()

function update(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit('update:modelValue', event.target.value)
}

function clear(): void {
  emit('update:modelValue', '')
  emit('clear')
  input.value?.focus()
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div
    :class="$style.search"
    :data-color="color"
    :data-disabled="disabled || undefined"
    :data-filled="Boolean(modelValue) || undefined"
  >
    <label :for="id" :class="$style.label">{{ label }}</label>
    <UiIcon name="search" :class="$style.icon" />
    <input
      :id="id"
      ref="input"
      :class="$style.input"
      type="search"
      :value="modelValue"
      :disabled="disabled"
      placeholder="Поиск сотрудника"
      autocomplete="off"
      @input="update"
    />
    <button
      v-if="modelValue"
      type="button"
      :class="$style.clear"
      :disabled="disabled"
      aria-label="Очистить поиск сотрудников"
      @click="clear"
    >
      <UiIcon name="close" />
    </button>
  </div>
</template>

<style module lang="scss">
.search {
  display: flex;
  align-items: center;
  gap: var(--schedule-search-gap);
  min-inline-size: 0;
  inline-size: 100%;
  min-block-size: var(--schedule-search-height);
  padding: var(--schedule-search-padding);
  border-radius: var(--schedule-radius-search);
  box-shadow: inset 0 0 0 1px transparent;
  background: var(--schedule-search-gray-bg);
  &[data-color='white'] {
    background: var(--schedule-search-white-bg);
  }
  &:hover:not([data-disabled]) {
    box-shadow: inset 0 0 0 1px var(--schedule-search-hover-border);
  }
  &:focus-within {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
}
.label {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.icon {
  flex-shrink: 0;
  color: var(--schedule-search-placeholder);
}
.input {
  min-inline-size: 0;
  inline-size: 100%;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--schedule-search-text);
  font: inherit;
  line-height: var(--schedule-line-height-body);
  &::placeholder {
    color: var(--schedule-search-placeholder);
  }
  &::-webkit-search-cancel-button {
    appearance: none;
  }
}
.clear {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  inline-size: 24px;
  block-size: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--schedule-radius-control);
  background: transparent;
  color: var(--schedule-search-placeholder);
  cursor: pointer;
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
  }
}
.search[data-disabled] .input,
.search[data-disabled] .icon,
.clear:disabled {
  color: var(--figma-button-neutral-secondary-text-disable);
  cursor: default;
}
</style>
