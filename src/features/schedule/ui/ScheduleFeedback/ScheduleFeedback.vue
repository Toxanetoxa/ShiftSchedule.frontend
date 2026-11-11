<script setup lang="ts">
import { UiButton, UiIcon } from '@ui'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    loading?: boolean
    error?: string | null
    offline?: boolean
    remoteUpdated?: boolean
    savedAt?: string | null
  }>(),
  {
    loading: false,
    error: null,
    offline: false,
    remoteUpdated: false,
    savedAt: null,
  },
)

const emit = defineEmits<{ retry: []; reviewConflicts: [] }>()
const state = computed(() =>
  props.offline
    ? 'offline'
    : props.error
      ? 'error'
      : props.remoteUpdated
        ? 'remote'
        : props.loading
          ? 'loading'
          : 'saved',
)
const savedTime = computed(() => {
  if (!props.savedAt) {
    return ''
  }

  const date = new Date(props.savedAt)

  return Number.isNaN(date.getTime())
    ? props.savedAt
    : new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date)
})
</script>

<template>
  <div
    v-if="loading || error || offline || remoteUpdated || savedAt"
    :class="$style.feedback"
    :data-state="state"
    role="status"
    aria-live="polite"
    :aria-busy="loading || undefined"
  >
    <UiIcon
      :name="offline || error ? 'warning' : remoteUpdated ? 'info' : loading ? 'clock' : 'check'"
      :size="20"
    />
    <div :class="$style.message">
      <p v-if="offline">
        Нет подключения. Локальные изменения остаются в открытом редакторе; отправка станет доступна
        после подключения.
      </p>
      <p v-else-if="error">{{ error }}</p>
      <p v-else-if="remoteUpdated">
        На сервере появилась новая версия графика. Проверьте изменения перед сохранением.
      </p>
      <p v-else-if="loading">Обновляем график…</p>
      <p v-else>Сохранено в {{ savedTime }}</p>
    </div>
    <UiButton
      v-if="error && !offline"
      color="neutral"
      variant="tertiary"
      size="compact"
      @click="emit('retry')"
      >Повторить</UiButton
    >
    <UiButton
      v-else-if="remoteUpdated && !offline"
      variant="secondary"
      size="compact"
      @click="emit('reviewConflicts')"
      >Проверить изменения</UiButton
    >
  </div>
</template>

<style module lang="scss">
.feedback {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-radius-control);
  color: var(--schedule-color-label-secondary);
  background: var(--schedule-color-surface-primary);
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);

  &[data-state='error'],
  &[data-state='offline'] {
    border-color: var(--schedule-color-field-error);
  }

  &[data-state='remote'] {
    color: var(--schedule-color-coverage-filled-text);
    background: var(--schedule-color-coverage-filled-bg);
  }
}

.message {
  flex: 1;
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 600px) {
  .feedback {
    flex-wrap: wrap;
  }
}
</style>
