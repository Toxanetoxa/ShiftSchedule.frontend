import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import ConfirmReplaceDialog from './ConfirmReplaceDialog.vue'

const meta = {
  title: 'Schedule/ConfirmReplaceDialog',
  component: ConfirmReplaceDialog,
  args: {
    source: { employeeId: 'employee-1', workDate: '2026-11-09' },
    target: { employeeId: 'employee-2', workDate: '2026-11-10' },
    pending: false,
    error: null,
  },
  render: (args) => ({
    components: { ConfirmReplaceDialog, UiButton },
    setup: () => ({ args, open: ref(false), confirmed: ref(false) }),
    template:
      '<ConfirmReplaceDialog v-bind="args" v-model:open="open" @confirm="confirmed = true; open = false"><template #trigger><UiButton>Перенести на занятую ячейку</UiButton></template></ConfirmReplaceDialog><p v-if="confirmed" role="status">Замена подтверждена. Демонстрация не меняет график.</p>',
  }),
} satisfies Meta<typeof ConfirmReplaceDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
export const ValidationError: Story = {
  args: { error: 'Назначение пересекается со сменой на соседней дате.' },
}
