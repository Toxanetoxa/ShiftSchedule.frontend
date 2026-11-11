import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { userEvent, within } from 'storybook/test'
import { ref, watch } from 'vue'
import EmployeeSearch from './EmployeeSearch.vue'

const meta = {
  title: 'Schedule/EmployeeSearch',
  component: EmployeeSearch,
  tags: ['autodocs'],
  args: { modelValue: '', color: 'white', disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          'М: White/Gray × Default/Hover/Active, высота 48 px. Hover проверяется наведением; Active означает введённый текст. Р: фокус с клавиатуры, disabled, очистка Gray.',
      },
    },
  },
  render: (args) => ({
    components: { EmployeeSearch },
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
      '<div style="max-width: 398px"><EmployeeSearch v-bind="args" v-model="value" /><p style="font-size: 12px; margin-top: 12px">Поиск: {{ value || "не задан" }}</p></div>',
  }),
} satisfies Meta<typeof EmployeeSearch>
export default meta
type Story = StoryObj<typeof meta>
export const WhiteDefault: Story = {}
export const WhiteHover: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('searchbox'))
  },
}
export const WhiteActive: Story = { args: { modelValue: 'Анна Иванова' } }
export const GrayDefault: Story = { args: { color: 'gray' } }
export const GrayHover: Story = { args: { color: 'gray' }, play: WhiteHover.play }
export const GrayActive: Story = { args: { color: 'gray', modelValue: 'Анна' } }
export const DisabledProposed: Story = { args: { modelValue: 'Анна', disabled: true } }
