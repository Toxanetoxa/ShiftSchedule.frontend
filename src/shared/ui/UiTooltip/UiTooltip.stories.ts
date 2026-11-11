import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import UiTooltip from './UiTooltip.vue'

const meta = {
  title: 'UI/UiTooltip',
  component: UiTooltip,
  args: { label: 'Добавить смену', delayDuration: 150 },
  render: (args) => ({
    components: { UiTooltip, UiButton },
    setup: () => ({ args }),
    template:
      '<UiTooltip v-bind="args"><UiButton :icon-only="true" aria-label="Добавить смену">+</UiButton></UiTooltip>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Подсказка открывается при наведении и фокусе. Она дополняет доступное имя icon-only кнопки.',
      },
    },
  },
} satisfies Meta<typeof UiTooltip>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const LongText: Story = {
  args: { label: 'Назначить смену всем видимым после поиска сотрудникам на выбранную дату.' },
}
