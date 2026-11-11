<script setup lang="ts">
import UiIcon from '@ui/UiIcon/UiIcon.vue'

withDefaults(defineProps<{ activeItem?: string; collapsed?: boolean }>(), {
  activeItem: 'shifts',
  collapsed: false,
})
const emit = defineEmits<{ navigate: [item: string]; toggle: []; notifications: [] }>()
</script>

<template>
  <aside :class="$style.sidebar" :data-collapsed="collapsed">
    <div :class="$style.brand">
      <span :class="$style.mark" aria-hidden="true">S</span>
      <span :class="$style.text" :aria-hidden="collapsed || undefined">ShiftSchedule</span>
    </div>
    <button
      :class="$style.notifications"
      type="button"
      aria-label="Уведомления"
      title="Уведомления"
      @click="emit('notifications')"
    >
      <UiIcon name="bell" />
    </button>
    <nav :class="$style.nav" aria-label="Основная навигация">
      <button
        v-for="item in [
          { id: 'home', label: 'Главная', icon: 'home' as const },
          { id: 'shifts', label: 'Смены', icon: 'calendar' as const },
        ]"
        :key="item.id"
        :class="$style.item"
        type="button"
        :aria-label="item.label"
        :aria-current="activeItem === item.id ? 'page' : undefined"
        :title="collapsed ? item.label : undefined"
        @click="emit('navigate', item.id)"
      >
        <UiIcon :name="item.icon" /><span :class="$style.text" aria-hidden="true">{{
          item.label
        }}</span>
      </button>
    </nav>
    <div :class="$style.bottom">
      <button
        :class="[$style.item, $style.toggle]"
        type="button"
        :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
        :aria-expanded="!collapsed"
        :title="collapsed ? 'Развернуть меню' : undefined"
        @click="emit('toggle')"
      >
        <UiIcon name="panel-left" /><span :class="$style.text" aria-hidden="true"
          >Свернуть меню</span
        >
      </button>
    </div>
  </aside>
</template>

<style module lang="scss">
.sidebar {
  --sidebar-motion: var(--app-sidebar-transition, 280ms cubic-bezier(0.2, 0, 0, 1));
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--schedule-sidebar-gap);
  width: 100%;
  min-width: 0;
  min-height: 360px;
  padding: var(--schedule-sidebar-padding-top) var(--schedule-sidebar-padding-right)
    var(--schedule-sidebar-padding-bottom) var(--schedule-sidebar-padding-left);
  border-right: 1px solid var(--schedule-color-border-subtle);
  background: var(--schedule-color-surface-muted);
  transition: padding var(--sidebar-motion);

  &[data-collapsed='true'] {
    padding-inline: 10px;

    .brand {
      gap: 0;
      padding-inline: 10px 0;
    }
    .text {
      max-width: 0;
      opacity: 0;
      transform: translateX(-6px);
    }
    .item {
      gap: 0;
      padding-inline: 16px;
    }
    .notifications {
      top: calc(100% - var(--schedule-sidebar-padding-bottom) - 48px - 12px - 40px);
    }
    .bottom {
      padding-top: 52px;
    }
  }
}

.brand {
  display: flex;
  flex: 0 0 48px;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding-inline: 6px 48px;
  font-weight: var(--schedule-font-weight-semibold);
  transition:
    gap var(--sidebar-motion),
    padding var(--sidebar-motion);
}

.mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 8px;
  background: var(--schedule-color-brand-action);
  color: var(--schedule-color-label-inverted);
}

.text {
  min-width: 0;
  max-width: 160px;
  overflow: hidden;
  white-space: nowrap;
  opacity: 1;
  transform: translateX(0);
  transition:
    max-width var(--sidebar-motion),
    opacity var(--sidebar-motion),
    transform var(--sidebar-motion);
}

.nav {
  display: grid;
  gap: 2px;
}

.item,
.notifications {
  border: 0;
  border-radius: var(--schedule-radius-control);
  background: transparent;
  color: var(--schedule-color-label-secondary);
  cursor: pointer;

  &:hover {
    background: var(--schedule-color-surface-primary);
  }
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: 2px;
  }
}

.item {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-align: left;
  transition:
    padding var(--sidebar-motion),
    gap var(--sidebar-motion),
    background-color 160ms ease;

  &[aria-current] {
    background: var(--schedule-color-surface-primary);
    color: var(--figma-labels-brand-primary);
  }
}

.notifications {
  position: absolute;
  z-index: 1;
  top: calc(var(--schedule-sidebar-padding-top) + 4px);
  right: 16px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  padding: 10px;
  box-shadow: none;
  transition:
    top var(--sidebar-motion),
    right var(--sidebar-motion),
    background-color 160ms ease;
}

.bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: auto;
  padding-top: 0;
  transition: padding-top var(--sidebar-motion);
}

.toggle {
  flex: 0 0 48px;
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .brand,
  .text,
  .item,
  .notifications,
  .bottom {
    transition: none;
  }
}
</style>
