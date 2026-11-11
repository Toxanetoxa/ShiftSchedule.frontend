import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiIconButton from './UiIconButton.vue'

const meta = {
  title: 'UI/UiIconButton',
  component: UiIconButton,
  tags: ['autodocs'],
  args: { ariaLabel: 'Уведомления', icon: 'bell' },
} satisfies Meta<typeof UiIconButton>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
export const Loading: Story = { args: { loading: true } }
export const Compact: Story = {
  args: { size: 'compact', ariaLabel: 'Добавить смену', icon: 'plus' },
}
