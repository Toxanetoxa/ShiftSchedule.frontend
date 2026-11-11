<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: 'neutral' | 'blue'
    label?: string
  }>(),
  {
    color: 'neutral',
    label: undefined,
  },
)
</script>

<template>
  <span :class="$style.badge" :data-color="color"
    ><slot>{{ label }}</slot></span
  >
</template>

<style module lang="scss">
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--schedule-badge-gap);
  min-block-size: var(--schedule-badge-height);
  padding: var(--schedule-badge-padding-top) var(--schedule-badge-padding-inline)
    var(--schedule-badge-padding-bottom);
  border-radius: var(--schedule-radius-pill);
  color: var(--schedule-badge-label);
  background: var(--schedule-badge-neutral-bg);
  font-size: var(--schedule-font-size-caption);
  line-height: var(--schedule-line-height-caption);
  font-weight: var(--schedule-font-weight-semibold);
  white-space: nowrap;

  &[data-color='blue'] {
    background: var(--schedule-badge-blue-bg);
  }
}
</style>
