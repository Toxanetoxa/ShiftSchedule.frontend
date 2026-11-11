import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import CustomShiftForm from './CustomShiftForm.vue'

const meta = {
  title: 'Schedule/CustomShiftForm',
  component: CustomShiftForm,
  tags: ['autodocs'],
  args: { selectedCount: 8, disabled: false, onApply: fn() },
  parameters: {
    docs: {
      description: {
        component:
          'М: начало/конец и явная кнопка назначения. Р: валидация HH:mm, равных времён, отсутствие выделения и окончание на следующий день. Ввод не вызывает apply.',
      },
    },
  },
  decorators: [() => ({ template: '<div style="max-width: 335px"><story /></div>' })],
} satisfies Meta<typeof CustomShiftForm>
export default meta
type Story = StoryObj<typeof meta>
export const Pristine: Story = {}
export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Начало'), '10:00')
    await userEvent.type(canvas.getByLabelText('Конец'), '23:00')
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Поставить в выделенные' })).toBeEnabled()
  },
}
export const NightProposed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Начало'), '22:00')
    await userEvent.type(canvas.getByLabelText('Конец'), '06:00')
    await userEvent.tab()
    await expect(canvas.getByText(/Окончание на следующий день/)).toBeVisible()
  },
}
export const EqualTimesInvalidProposed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Начало'), '09:00')
    await userEvent.type(canvas.getByLabelText('Конец'), '09:00')
    await userEvent.tab()
    await expect(canvas.getByText('Начало и конец смены должны различаться.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Поставить в выделенные' })).toBeDisabled()
  },
}
export const PartialInvalidProposed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Начало'), '09:')
    await userEvent.tab()
    await expect(canvas.getByLabelText('Начало')).toHaveAttribute('aria-invalid', 'true')
  },
}
export const NoSelectionProposed: Story = { args: { selectedCount: 0 } }
export const DisabledProposed: Story = { args: { disabled: true } }
