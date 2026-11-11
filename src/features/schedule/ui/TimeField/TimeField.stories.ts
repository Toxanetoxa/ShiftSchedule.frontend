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
          'Маска ЧЧ:ММ подставляет двоеточие: 0930 → 09:30. Часы ограничены диапазоном 00–23, минуты — 00–59. Поддерживаются вставка, удаление и замена цифр в середине. Частичный ввод сохраняется без дополнения нулями; валидацией операции управляет форма.',
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
  args: { modelValue: '09:3', error: 'Введите время полностью в формате ЧЧ:ММ.' },
}
export const DisabledProposed: Story = { args: { modelValue: '09:30', disabled: true } }
