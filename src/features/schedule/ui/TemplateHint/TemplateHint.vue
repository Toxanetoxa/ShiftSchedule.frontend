<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <span :class="$style.hint">{{ label }}</span>
</template>

<style module lang="scss">
.hint {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  block-size: var(--schedule-template-hint-height);
  padding: var(--schedule-template-hint-padding-block) var(--schedule-template-hint-padding-inline);
  border-radius: var(--schedule-template-hint-radius);
  color: var(--schedule-template-hint-text);
  background: var(--schedule-template-hint-bg);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  font-weight: var(--schedule-font-weight-semibold);
}
</style>
