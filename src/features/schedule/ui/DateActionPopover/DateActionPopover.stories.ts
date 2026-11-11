import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { templates } from '@schedule/stories/fixtures'
import { ref } from 'vue'
import DateActionPopover from './DateActionPopover.vue'

const meta = {
  title: 'Schedule/DateActionPopover',
  component: DateActionPopover,
  args: { date: '2026-11-09', templates, visibleEmployeeCount: 8 },
  render: (args) => ({
    components: { DateActionPopover },
    setup: () => ({ args, open: ref(false), action: ref('') }),
    template:
      '<DateActionPopover v-bind="args" v-model:open="open" @apply-template="action = `Шаблон: ${$event}`" @select-date-cells="action = `Выделить ${args.visibleEmployeeCount} видимых ячеек`" /><p v-if="action" role="status">{{ action }}</p>',
  }),
} satisfies Meta<typeof DateActionPopover>
export default meta
type Story = StoryObj<typeof meta>
export const AllEmployees: Story = {}
export const FilteredEmployees: Story = { args: { visibleEmployeeCount: 3 } }
export const NoResults: Story = { args: { visibleEmployeeCount: 0 } }
