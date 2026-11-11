import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { customShift, templates } from '@schedule/stories/fixtures'
import { ref } from 'vue'
import CellActionPopover from './CellActionPopover.vue'

const meta = {
  title: 'Schedule/CellActionPopover',
  component: CellActionPopover,
  args: {
    cell: { employeeId: 'employee-1', workDate: '2026-11-09' },
    templates,
    shift: customShift,
  },
  render: (args) => ({
    components: { CellActionPopover },
    setup: () => ({ args, open: ref(false), action: ref('') }),
    template:
      '<CellActionPopover v-bind="args" v-model:open="open" @apply-template="action = `Назначить ${$event}`" @edit-custom="action = `Открыть форму своей смены`" @clear="action = `Очистить назначение`" @start-move="action = `Начать перенос смены`" /><p v-if="action" role="status">{{ action }}</p>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Меню эмитит пользовательские намерения. Для пустой ячейки перенос и очистка недоступны.',
      },
    },
  },
} satisfies Meta<typeof CellActionPopover>
export default meta
type Story = StoryObj<typeof meta>
export const Assigned: Story = {}
export const Empty: Story = { args: { shift: null } }
export const Disabled: Story = { args: { disabled: true } }
