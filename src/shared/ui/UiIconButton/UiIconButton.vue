<script setup lang="ts">
import type { IconName } from '@ui/UiIcon/icons'
import UiButton from '@ui/UiButton/UiButton.vue'
import UiIcon from '@ui/UiIcon/UiIcon.vue'
import { ref } from 'vue'

defineOptions({ inheritAttrs: false })
withDefaults(
  defineProps<{
    ariaLabel: string
    icon?: IconName
    color?: 'brand' | 'neutral'
    variant?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'
    size?: 'default' | 'compact'
    disabled?: boolean
    loading?: boolean
  }>(),
  { color: 'neutral', variant: 'quaternary', size: 'default' },
)

const button = ref<InstanceType<typeof UiButton> | null>(null)
defineExpose({ focus: (options?: FocusOptions) => button.value?.focus(options) })
</script>

<template>
  <UiButton
    ref="button"
    v-bind="$attrs"
    icon-only
    :ariaLabel="ariaLabel"
    :color="color"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :loading="loading"
  >
    <slot><UiIcon v-if="icon" :name="icon" /></slot>
  </UiButton>
</template>
