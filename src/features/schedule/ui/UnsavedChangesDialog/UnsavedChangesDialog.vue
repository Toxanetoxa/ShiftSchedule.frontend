<script setup lang="ts">
import { UiButton } from '@ui'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'reka-ui'
import { ref, watch } from 'vue'

const props = withDefaults(defineProps<{ pending?: boolean; error?: string | null }>(), {
  pending: false,
  error: null,
})
const emit = defineEmits<{ saveAndContinue: []; discardAndContinue: []; stay: [] }>()
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
function updateOpen(value: boolean): void {
  if (props.pending && !value) return
  open.value = value
  if (!value) emit('stay')
}
</script>

<template>
  <AlertDialogRoot :open="open" @update:open="updateOpen">
    <AlertDialogTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></AlertDialogTrigger>
    <AlertDialogPortal>
      <AlertDialogOverlay :class="$style.overlay" />
      <AlertDialogContent
        :class="$style.panel"
        :aria-busy="pending || undefined"
        @close-auto-focus="restoreFocus"
        @escape-key-down="pending && $event.preventDefault()"
      >
        <AlertDialogTitle :class="$style.title">Есть несохранённые изменения</AlertDialogTitle>
        <AlertDialogDescription :class="$style.description"
          >Выберите, что сделать с черновиком перед переходом. Если сохранение не удастся, диалог
          останется открыт.</AlertDialogDescription
        >
        <p v-if="error" :class="$style.error" role="alert">{{ error }}</p>
        <footer :class="$style.actions">
          <AlertDialogCancel as-child
            ><UiButton color="neutral" variant="tertiary" :disabled="pending"
              >Остаться</UiButton
            ></AlertDialogCancel
          ><UiButton
            color="neutral"
            variant="secondary"
            :disabled="pending"
            @click="!pending && emit('discardAndContinue')"
            >Не сохранять и перейти</UiButton
          ><UiButton :loading="pending" @click="!pending && emit('saveAndContinue')"
            >Сохранить и перейти</UiButton
          >
        </footer>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>

<style module lang="scss">
@use '@/shared/styles/dialog';

.overlay {
  @include dialog.overlay;
}
.panel {
  @include dialog.panel(640px);
}
.title {
  @include dialog.title;
}
.description {
  margin: 12px 0 0;
  color: var(--schedule-color-label-secondary);
  font-size: 14px;
  line-height: 20px;
}
.actions {
  @include dialog.actions;
}
.error {
  margin: 16px 0 0;
  color: var(--schedule-color-field-error);
}
</style>
