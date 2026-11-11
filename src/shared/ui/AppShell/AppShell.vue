<script setup lang="ts">
import AppSidebar from '@ui/AppSidebar/AppSidebar.vue'

withDefaults(defineProps<{ sidebarCollapsed?: boolean; activeItem?: string }>(), {
  sidebarCollapsed: false,
  activeItem: 'shifts',
})

const emit = defineEmits<{
  'update:sidebarCollapsed': [value: boolean]
  navigate: [item: string]
  notifications: []
}>()
</script>

<template>
  <div :class="$style.shell" :data-collapsed="sidebarCollapsed">
    <div :class="$style.sidebar">
      <slot name="sidebar"
        ><AppSidebar
          :collapsed="sidebarCollapsed"
          :active-item="activeItem"
          @toggle="emit('update:sidebarCollapsed', !sidebarCollapsed)"
          @navigate="emit('navigate', $event)"
          @notifications="emit('notifications')"
      /></slot>
    </div>
    <main :class="$style.main"><slot /></main>
  </div>
</template>

<style module lang="scss">
.shell {
  --app-sidebar-width: var(--schedule-sidebar-width);
  --app-sidebar-transition: 280ms cubic-bezier(0.2, 0, 0, 1);
  display: flex;
  gap: var(--schedule-page-gap);
  min-height: 100vh;
  padding-right: var(--schedule-page-padding-inline-end);
  background: var(--schedule-color-surface-muted);
  color: var(--schedule-color-label-primary);

  &[data-collapsed='true'] {
    --app-sidebar-width: 72px;
  }
  @media (max-width: 767px) {
    gap: 12px;
    padding-right: 12px;
  }
  @media (prefers-reduced-motion: reduce) {
    --app-sidebar-transition: 0ms linear;
  }
}
.sidebar {
  display: flex;
  flex-direction: column;
  flex: 0 0 var(--app-sidebar-width);
  width: var(--app-sidebar-width);
  min-width: 0;
  transition:
    width var(--app-sidebar-transition),
    flex-basis var(--app-sidebar-transition);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
.main {
  flex: 1;
  min-width: 0;
  padding-block: var(--schedule-main-padding);
}
</style>
