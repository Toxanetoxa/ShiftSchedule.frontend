<script setup lang="ts">
import UiButton from '@ui/UiButton/UiButton.vue'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import { ref, watch } from 'vue'

defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{
    title: string
    description?: string
    pending?: boolean
    error?: string | null
    variant?: 'default' | 'drawer' | 'wide'
  }>(),
  { description: '', pending: false, error: null, variant: 'default' },
)
const open = defineModel<boolean>('open', { default: false })
const returnFocus = ref<HTMLElement | null>(null)
watch(
  open,
  (value) => {
    if (value && typeof document !== 'undefined' && document.activeElement instanceof HTMLElement)
      returnFocus.value = document.activeElement
  },
  { flush: 'sync' },
)
function restoreFocus(event: Event): void {
  if (returnFocus.value?.isConnected) {
    event.preventDefault()
    returnFocus.value.focus()
  }
}

function updateOpen(value: boolean, pending: boolean): void {
  if (!pending || value) open.value = value
}
</script>

<template>
  <DialogRoot :open="open" @update:open="updateOpen($event, pending)">
    <DialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay :class="$style.overlay" />
      <DialogContent
        v-bind="$attrs"
        :class="$style.panel"
        :data-variant="variant"
        :aria-busy="pending || undefined"
        @close-auto-focus="restoreFocus"
        @escape-key-down="pending && $event.preventDefault()"
        @interact-outside="pending && $event.preventDefault()"
      >
        <div :class="$style.heading">
          <div>
            <DialogTitle :class="$style.title">{{ title }}</DialogTitle
            ><DialogDescription :class="[$style.description, { [$style.srOnly]: !description }]">{{
              description || title
            }}</DialogDescription>
          </div>
          <UiButton
            color="neutral"
            variant="tertiary"
            size="compact"
            :icon-only="true"
            ariaLabel="Закрыть диалог"
            :disabled="pending"
            @click="updateOpen(false, pending)"
            >×</UiButton
          >
        </div>
        <div :class="$style.body"><slot /></div>
        <p v-if="error" :class="$style.error" role="alert">{{ error }}</p>
        <footer v-if="$slots.footer" :class="$style.footer"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style module lang="scss">
@use '@/shared/styles/dialog';

.overlay {
  @include dialog.overlay;
}
.panel {
  @include dialog.panel;

  &[data-variant='drawer'] {
    inset: 0 0 0 auto;
    transform: none;
    inline-size: min(420px, 100vw);
    max-block-size: 100dvh;
    border-radius: var(--schedule-radius-panel) 0 0 var(--schedule-radius-panel);
  }
  &[data-variant='wide'] {
    inline-size: min(1400px, calc(100vw - 32px));
  }
}
.heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.title {
  @include dialog.title;
}
.description {
  margin: 8px 0 0;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
.body {
  margin-block-start: 20px;
}
.footer {
  @include dialog.actions;
}
.error {
  margin: 16px 0 0;
  color: var(--schedule-color-field-error);
}
.srOnly {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
