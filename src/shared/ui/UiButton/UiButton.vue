<script setup lang="ts">
import { computed, ref } from 'vue'

interface BaseProps {
  color?: 'brand' | 'neutral'
  variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'
  size?: 'default' | 'compact'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}

type Props = BaseProps &
  ({ iconOnly: true; ariaLabel: string } | { iconOnly?: false; ariaLabel?: string })

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  color: 'brand',
  variant: 'primary',
  size: 'default',
  type: 'button',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()
const element = ref<HTMLButtonElement | null>(null)
const blocked = computed(() => props.disabled || props.loading)
const resolvedVariant = computed(() => {
  if (props.color === 'brand' && (props.variant === 'quaternary' || props.variant === 'quinary')) {
    return 'tertiary'
  }

  return props.variant
})

function onClick(event: MouseEvent): void {
  if (blocked.value) {
    event.preventDefault()
    event.stopImmediatePropagation()

    return
  }

  emit('click', event)
}

function focus(options?: FocusOptions): void {
  element.value?.focus(options)
}

defineExpose({ element, focus })
</script>

<template>
  <button
    ref="element"
    v-bind="$attrs"
    :class="$style.button"
    :type="type"
    :disabled="blocked"
    :data-color="color"
    :data-variant="resolvedVariant"
    :data-size="size"
    :data-loading="loading ? '' : undefined"
    :data-icon-only="iconOnly ? '' : undefined"
    :aria-label="ariaLabel"
    :aria-busy="loading || undefined"
    @click="onClick"
  >
    <span :class="$style.content" :aria-hidden="iconOnly || undefined">
      <slot name="leading" />
      <slot />
      <slot name="trailing" />
    </span>
    <span v-if="loading" :class="$style.loader" aria-hidden="true">
      <svg :class="$style.spinner" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" opacity=".25" />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </span>
  </button>
</template>
<style module lang="scss">
$palettes: (
  brand: (
    primary,
    secondary,
    tertiary,
  ),
  neutral: (
    primary,
    secondary,
    tertiary,
    quaternary,
    quinary,
  ),
);

.button {
  --_button-height: var(--schedule-button-min-height);
  --_button-padding-block: var(--schedule-space-control-block);
  --_button-padding-inline: var(--schedule-space-control-inline);
  --_button-font-size: var(--schedule-font-size-body);
  --_button-line-height: var(--schedule-line-height-body);
  --_button-weight: var(--schedule-button-weight);
  --_button-radius: var(--schedule-radius-control);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-block-size: var(--_button-height);
  padding: var(--_button-padding-block) var(--_button-padding-inline);
  border: 0;
  border-radius: var(--_button-radius);
  font-family: var(--schedule-font-family), system-ui, sans-serif;
  font-size: var(--_button-font-size);
  font-weight: var(--_button-weight);
  line-height: var(--_button-line-height);
  letter-spacing: var(--figma-tracking-tracking-m);
  color: var(--_button-text-default);
  background: var(--_button-bg-default);
  box-shadow: inset 0 0 0 var(--_button-stroke-width) var(--_button-border-default);
  cursor: pointer;

  &[data-icon-only] {
    inline-size: var(--_button-height);
    padding-inline: 0;
  }
  &[data-size='compact'] {
    --_button-height: var(--schedule-button-compact-min-height);
    --_button-padding-block: var(--schedule-button-compact-padding);
    --_button-padding-inline: var(--schedule-button-compact-padding);
    --_button-font-size: var(--schedule-font-size-small);
    --_button-line-height: var(--schedule-line-height-small);
    --_button-weight: var(--schedule-button-compact-weight);
  }

  @each $color, $variants in $palettes {
    @each $variant in $variants {
      &[data-color='#{$color}'][data-variant='#{$variant}'] {
        @if $variant == tertiary or $variant == quaternary {
          --_button-stroke-width: var(--schedule-button-border-width);
        } @else {
          --_button-stroke-width: 0px;
        }
        @if $variant == quinary {
          --_button-radius: var(--schedule-button-quinary-radius);
        }
        @each $state in default, hover, active, disabled {
          @each $part in bg, text, border {
            --_button-#{$part}-#{$state}: var(
              --schedule-button-#{$color}-#{$variant}-#{$part}-#{$state}
            );
          }
        }
      }
    }
  }

  @each $state in hover, active {
    &:#{$state}:not(:disabled) {
      color: var(--_button-text-#{$state});
      background: var(--_button-bg-#{$state});
      box-shadow: inset 0 0 0 var(--_button-stroke-width) var(--_button-border-#{$state});
    }
  }
  &:disabled {
    color: var(--_button-text-disabled);
    background: var(--_button-bg-disabled);
    box-shadow: inset 0 0 0 var(--_button-stroke-width) var(--_button-border-disabled);
    cursor: default;
  }
  &:focus-visible {
    outline: var(--schedule-focus-width) solid var(--schedule-color-focus);
    outline-offset: var(--schedule-focus-offset);
  }
  &[data-loading] .content {
    opacity: 0;
  }
}
.content {
  display: inline-flex;
  align-items: center;
  gap: var(--schedule-button-gap);
}
.loader {
  position: absolute;
}
.spinner {
  display: block;
  inline-size: 20px;
  block-size: 20px;
  animation: spin 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
