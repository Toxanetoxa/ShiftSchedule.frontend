import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import SelectionToolbar from './SelectionToolbar.vue'

const meta = {
  title: 'Schedule/SelectionToolbar',
  component: SelectionToolbar,
  tags: ['autodocs'],
  args: { cellCount: 8, employeeCount: 2, dayCount: 4, disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          'Панель от 52 px с адаптивным переносом действий. Очистить ячейки и снять выделение — разные команды. Слот template-action заменяет кнопку выбора шаблона и получает disabled и chooseTemplate.',
      },
    },
  },
  render: (args) => ({
    components: { SelectionToolbar },
    setup() {
      const message = ref('')
      return { args, message }
    },
    template: `<SelectionToolbar v-bind="args" @choose-template="message = 'Открыть выбор шаблона'" @clear-cells="message = 'Очистить содержимое выбранных ячеек'" @clear-selection="message = 'Снять выделение без удаления смен'" /><p role="status" style="margin-top: 12px">{{ message }}</p>`,
  }),
} satisfies Meta<typeof SelectionToolbar>
export default meta
type Story = StoryObj<typeof meta>
export const Multiple: Story = {}
export const Single: Story = { args: { cellCount: 1, employeeCount: 1, dayCount: 1 } }
export const PendingProposed: Story = { args: { disabled: true } }
export const NarrowProposed: Story = {
  decorators: [() => ({ template: '<div style="max-width: 400px"><story /></div>' })],
}
