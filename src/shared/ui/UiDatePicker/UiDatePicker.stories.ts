import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiButton from '@ui/UiButton/UiButton.vue'
import UiDialog from '@ui/UiDialog/UiDialog.vue'
import { userEvent, within } from 'storybook/test'
import { ref, watch } from 'vue'
import UiDatePicker from './UiDatePicker.vue'

const meta = {
  title: 'UI/UiDatePicker',
  component: UiDatePicker,
  tags: ['autodocs'],
  args: {
    modelValue: '2026-11-09',
    label: 'Дата начала',
    disabled: false,
    invalid: false,
    required: false,
    hideLabel: false,
    size: 'default',
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['default', 'compact'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Календарь в стиле приложения: русская локаль, неделя с понедельника, выбор мышью и клавиатурой, ввод даты по сегментам. Значение v-model — строка YYYY-MM-DD; пустое значение — пустая строка. Поддерживаются границы min/max и использование внутри диалога.',
      },
    },
  },
  render: (args) => ({
    components: { UiDatePicker },
    setup() {
      const value = ref(args.modelValue)
      watch(
        () => args.modelValue,
        (next) => {
          value.value = next
        },
      )
      return { args, value }
    },
    template:
      '<div style="max-width: 320px; min-height: 400px;"><UiDatePicker v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof UiDatePicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const OpenCalendar: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Открыть календарь: Дата начала' }),
    )
  },
}
export const Empty: Story = { args: { modelValue: '' } }
export const Compact: Story = { args: { size: 'compact', hideLabel: true } }
export const Disabled: Story = { args: { disabled: true } }
export const Invalid: Story = { args: { invalid: true, required: true } }
export const Bounded: Story = {
  args: { min: '2026-11-05', max: '2026-11-20' },
}
export const InsideDialog: Story = {
  render: (args) => ({
    components: { UiButton, UiDatePicker, UiDialog },
    setup: () => ({ args, open: ref(false), value: ref(args.modelValue) }),
    template:
      '<UiDialog v-model:open="open" title="Выбрать дату" description="Календарь открывается поверх диалога и возвращает фокус в поле."><template #trigger><UiButton>Открыть диалог</UiButton></template><UiDatePicker v-bind="args" v-model="value" /><template #footer><UiButton color="neutral" variant="tertiary" @click="open = false">Готово</UiButton></template></UiDialog>',
  }),
}
