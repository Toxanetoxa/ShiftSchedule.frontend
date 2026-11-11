import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import TimeField from './TimeField.vue'

const meta = {
  title: 'Schedule/TimeField',
  component: TimeField,
  tags: ['autodocs'],
  args: { modelValue: '', label: 'Начало', error: '', disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          'М: поле 48 px, label 12 px / 140%. Р: HH:mm pattern, связанная ошибка, focus, disabled. Частичный ввод сохраняется; валидацией операции управляет форма.',
      },
    },
  },
  render: (args) => ({
    components: { TimeField },
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
    template: '<div style="max-width: 180px"><TimeField v-bind="args" v-model="value" /></div>',
  }),
} satisfies Meta<typeof TimeField>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Filled: Story = { args: { modelValue: '09:30' } }
export const InvalidProposed: Story = {
  args: { modelValue: '25:40', error: 'Введите время от 00:00 до 23:59.' },
}
export const DisabledProposed: Story = { args: { modelValue: '09:30', disabled: true } }
