<script setup lang="ts">
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from 'reka-ui'

withDefaults(
  defineProps<{
    title: string
    description?: string
    tone?: 'success' | 'error' | 'info'
    duration?: number
  }>(),
  { description: '', tone: 'info', duration: 5000 },
)

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <ToastProvider :duration="duration">
    <ToastRoot v-model:open="open" :class="$style.toast" :data-tone="tone">
      <div>
        <ToastTitle :class="$style.title">{{ title }}</ToastTitle
        ><ToastDescription v-if="description" :class="$style.description">{{
          description
        }}</ToastDescription>
      </div>
      <ToastClose :class="$style.close" aria-label="Закрыть уведомление">×</ToastClose>
    </ToastRoot>
    <ToastViewport :class="$style.viewport" />
  </ToastProvider>
</template>

<style module lang="scss">
.viewport {
  position: fixed;
  inset-inline-end: 24px;
  inset-block-end: 24px;
  z-index: calc(var(--schedule-z-dialog) + 10);
  display: flex;
  flex-direction: column;
  gap: 8px;
  inline-size: min(380px, calc(100vw - 32px));
  margin: 0;
  padding: 0;
  list-style: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-inline-start: 3px solid var(--schedule-color-brand-action);
  border-radius: var(--schedule-radius-panel);
  color: var(--schedule-color-label-primary);
  background: var(--schedule-color-surface-primary);
  font-family: var(--schedule-font-family), system-ui, sans-serif;

  &[data-tone='error'] {
    border-inline-start-color: var(--schedule-color-field-error);
  }
}
.title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
.description {
  margin-block-start: 4px;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
.close {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 24px;

  &:focus-visible {
    outline: 2px solid var(--schedule-color-focus);
    outline-offset: 2px;
  }
}
</style>
