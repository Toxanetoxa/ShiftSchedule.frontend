<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<{
  name: string
  src?: string | null
}>()

const initials = computed(
  () =>
    props.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toLocaleUpperCase('ru-RU') || '?',
)
</script>

<template>
  <AvatarRoot :class="$style.avatar" aria-hidden="true">
    <AvatarImage v-if="src" :class="$style.image" :src="src" alt="" />
    <AvatarFallback :class="$style.fallback" :delay-ms="0">{{ initials }}</AvatarFallback>
  </AvatarRoot>
</template>

<style module lang="scss">
.avatar {
  display: inline-flex;
  flex: 0 0 var(--schedule-avatar-size);
  align-items: center;
  justify-content: center;
  inline-size: var(--schedule-avatar-size);
  block-size: var(--schedule-avatar-size);
  overflow: hidden;
  border: var(--schedule-avatar-border-width) solid var(--schedule-color-border-subtle);
  border-radius: var(--schedule-avatar-radius);
  color: var(--schedule-color-label-primary);
  background: var(--schedule-color-surface-muted);
}

.image,
.fallback {
  inline-size: 100%;
  block-size: 100%;
}

.image {
  object-fit: cover;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--schedule-font-size-small);
  line-height: var(--schedule-line-height-small);
  font-weight: var(--schedule-font-weight-semibold);
}
</style>
