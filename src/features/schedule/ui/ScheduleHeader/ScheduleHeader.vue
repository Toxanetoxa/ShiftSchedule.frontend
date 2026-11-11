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
  }>(),
  { dirtyCount: 0, saving: false, publishing: false, canSave: false, canPublish: false },
)
const emit = defineEmits<{ back: []; save: []; publish: [] }>()
const pending = computed(() => props.saving || props.publishing)
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
    <p :class="$style.status" role="status">
      <template v-if="publishing">Публикуем график…</template>
      <template v-else-if="saving">Сохраняем изменения…</template>
      <template v-else-if="dirtyCount > 0">Несохранённых изменений: {{ dirtyCount }}</template>
      <template v-else>Все изменения сохранены</template>
    </p>
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
</style>
