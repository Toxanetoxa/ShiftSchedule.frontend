<script setup lang="ts">
import { UiButton, UiIcon } from '@ui'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    dirtyCount?: number
    saving?: boolean
    publishing?: boolean
    canSave?: boolean
    canPublish?: boolean
    updatedAt?: number
  }>(),
  {
    dirtyCount: 0,
    saving: false,
    publishing: false,
    canSave: false,
    canPublish: false,
    updatedAt: 0,
  },
)
const emit = defineEmits<{ back: []; save: []; publish: [] }>()
const pending = computed(() => props.saving || props.publishing)
const updatedTime = computed(() =>
  props.updatedAt
    ? new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
        props.updatedAt,
      )
    : '—',
)
</script>

<template>
  <header :class="$style.header">
    <div :class="$style.back">
      <UiButton
        color="neutral"
        variant="quinary"
        size="compact"
        :disabled="pending"
        @click="emit('back')"
        ><template #leading><UiIcon name="chevron-left" /></template>Графики смен</UiButton
      >
    </div>
    <div :class="$style.main">
      <h1 :class="$style.title">{{ title }}</h1>
      <div :class="$style.actions">
        <UiButton
          :disabled="!canSave || pending || dirtyCount < 1"
          :loading="saving"
          @click="emit('save')"
          >Сохранить</UiButton
        >
        <UiButton
          variant="secondary"
          :disabled="!canPublish || pending"
          :loading="publishing"
          @click="emit('publish')"
          >Опубликовать</UiButton
        >
      </div>
    </div>
    <div :class="$style.statuses">
      <p :class="$style.status" role="status">
        <template v-if="publishing">Публикуем график…</template>
        <template v-else-if="saving">Сохраняем изменения…</template>
        <template v-else-if="dirtyCount > 0">Несохранённых изменений: {{ dirtyCount }}</template>
        <template v-else>Все изменения сохранены</template>
      </p>
      <p :class="[$style.status, $style.sync]" :data-ready="updatedAt > 0">
        <UiIcon name="check" :size="14" />
        <span
          >Обновлено в
          <time :datetime="updatedAt ? new Date(updatedAt).toISOString() : undefined">{{
            updatedTime
          }}</time></span
        >
      </p>
    </div>
  </header>
</template>

<style module lang="scss">
.header {
  display: grid;
  gap: var(--figma-spacing-margin-m);
}
.back {
  display: flex;
  align-items: center;
  min-block-size: var(--schedule-back-row-height);
}
.main {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--figma-spacing-padding-xl);
  min-block-size: var(--schedule-header-height);
}
.title {
  margin: 0;
  font-size: var(--schedule-font-size-title);
  line-height: var(--schedule-line-height-title);
  font-weight: var(--schedule-font-weight-title);
  letter-spacing: var(--schedule-tracking-title);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--schedule-header-action-gap);
}
.status {
  margin: 0;
  color: var(--schedule-color-label-secondary);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
}
.statuses {
  display: flex;
  justify-content: space-between;
  gap: var(--figma-spacing-margin-m);

  @media (width < 600px) {
    flex-direction: column;
    gap: var(--figma-spacing-margin-s);
  }
}
.sync {
  display: inline-flex;
  align-items: center;
  gap: var(--figma-spacing-margin-s);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;

  &[data-ready='false'] {
    visibility: hidden;
  }
}
</style>
