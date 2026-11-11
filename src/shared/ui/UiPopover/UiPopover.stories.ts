import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import UiPopover from './UiPopover.vue'

const meta = {
  title: 'UI/UiPopover',
  component: UiPopover,
  args: { label: 'Действия', pending: false },
  render: (args) => ({
    components: { UiPopover, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template:
      '<UiPopover v-bind="args" v-model:open="open"><template #trigger><UiButton>Открыть панель</UiButton></template><template #default="{ close }"><p style="margin: 0 0 12px">Панель закрывается по Escape и клику снаружи.</p><UiButton color="neutral" variant="secondary" size="compact" @click="close">Готово</UiButton></template></UiPopover>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Headless Reka Popover с порталом в body, управляемым open и глобальными токенами. Геометрия оболочки — предлагаемое дополнение реализации.',
      },
    },
  },
} satisfies Meta<typeof UiPopover>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
