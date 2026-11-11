<script setup lang="ts">
import type { CellRef } from '@schedule/domain/types'
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

const props = withDefaults(
  defineProps<{
    source?: CellRef | null
    target: CellRef
    templateLabel?: string
    sourceLabel?: string
    targetLabel?: string
    pending?: boolean
    error?: string | null
  }>(),
  {
    source: null,
    templateLabel: '',
    sourceLabel: '',
    targetLabel: '',
    pending: false,
    error: null,
  },
)
const emit = defineEmits<{ confirm: []; cancel: [] }>()
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
  if (!value) emit('cancel')
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
        <AlertDialogTitle :class="$style.title">Заменить назначенную смену?</AlertDialogTitle>
        <AlertDialogDescription :class="$style.description"
          >Целевая ячейка уже занята.
          {{
            source
              ? 'После подтверждения исходная ячейка будет очищена, а целевая смена — заменена.'
              : 'После подтверждения смена в ячейке будет заменена шаблоном. Исходный шаблон останется в панели.'
          }}</AlertDialogDescription
        >
        <dl :class="$style.details">
          <div>
            <dt>{{ source ? 'Откуда' : 'Шаблон' }}</dt>
            <dd>
              {{
                source ? `${sourceLabel || source.employeeId} · ${source.workDate}` : templateLabel
              }}
            </dd>
          </div>
          <div>
            <dt>Куда</dt>
            <dd>{{ targetLabel || target.employeeId }} · {{ target.workDate }}</dd>
          </div>
        </dl>
        <p v-if="error" :class="$style.error" role="alert">{{ error }}</p>
        <footer :class="$style.actions">
          <AlertDialogCancel as-child
            ><UiButton color="neutral" variant="tertiary" :disabled="pending"
              >Отмена</UiButton
            ></AlertDialogCancel
          ><UiButton :loading="pending" @click="!pending && emit('confirm')"
            >Заменить смену</UiButton
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
  @include dialog.panel(560px);
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
.details {
  display: grid;
  gap: 12px;
  margin-block: 20px;
  font-size: 14px;

  dt {
    color: var(--schedule-color-label-secondary);
  }
  dd {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
  }
}
.actions {
  @include dialog.actions;
}
.error {
  margin: 16px 0 0;
  color: var(--schedule-color-field-error);
}
</style>
