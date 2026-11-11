import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import ScheduleHeader from './ScheduleHeader.vue'

const meta = {
  title: 'Schedule/ScheduleHeader',
  component: ScheduleHeader,
  tags: ['autodocs'],
  args: {
    title: 'График сотрудников',
    dirtyCount: 4,
    saving: false,
    publishing: false,
    canSave: true,
    canPublish: true,
    onBack: fn(),
    onSave: fn(),
    onPublish: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'М: назад «Графики смен», заголовок 32/32, Brand Primary и Secondary. Р: dirty-статус, условия блокировки, pending. Во время операции повторные действия блокируются.',
      },
    },
  },
} satisfies Meta<typeof ScheduleHeader>
export default meta
type Story = StoryObj<typeof meta>
export const Dirty: Story = {}
export const SavedProposed: Story = { args: { dirtyCount: 0, canSave: false } }
export const SavingProposed: Story = { args: { saving: true } }
export const PublishingProposed: Story = { args: { publishing: true } }
export const ReadonlyProposed: Story = {
  args: { dirtyCount: 0, canSave: false, canPublish: false },
}
export const NarrowProposed: Story = {
  decorators: [() => ({ template: '<div style="max-width: 360px"><story /></div>' })],
}
