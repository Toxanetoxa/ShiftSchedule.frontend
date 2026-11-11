import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { templates } from '@schedule/stories/fixtures'
import { ref } from 'vue'
import TemplatePickerPopover from './TemplatePickerPopover.vue'

const meta = {
  title: 'Schedule/TemplatePickerPopover',
  component: TemplatePickerPopover,
  args: { templates, targetSummary: 'Выделено 8 ячеек · 4 сотрудника · 2 дня' },
  render: (args) => ({
    components: { TemplatePickerPopover },
    setup: () => ({ args, open: ref(false), selected: ref('') }),
    template:
      '<TemplatePickerPopover v-bind="args" v-model:open="open" @select-template="selected = $event" /><p v-if="selected" role="status">Выбран шаблон: {{ selected }}</p>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Выбор эмитит только ID шаблона и закрывает панель. Данные графика компонент не изменяет.',
      },
    },
  },
} satisfies Meta<typeof TemplatePickerPopover>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Empty: Story = { args: { templates: [] } }
export const Disabled: Story = { args: { disabled: true } }
