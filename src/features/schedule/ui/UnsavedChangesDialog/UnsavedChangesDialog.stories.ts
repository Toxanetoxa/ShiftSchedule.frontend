import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'

const meta = {
  title: 'Schedule/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
  args: { pending: false, error: null },
  render: (args) => ({
    components: { UnsavedChangesDialog, UiButton },
    setup: () => ({ args, open: ref(false), result: ref('') }),
    template:
      '<UnsavedChangesDialog v-bind="args" v-model:open="open" @save-and-continue="result = `Сохранить и перейти`; open = false" @discard-and-continue="result = `Перейти без сохранения`; open = false" @stay="result = `Остаться в редакторе`"><template #trigger><UiButton>Перейти к другому периоду</UiButton></template></UnsavedChangesDialog><p v-if="result" role="status">{{ result }}</p>',
  }),
} satisfies Meta<typeof UnsavedChangesDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
export const SaveError: Story = {
  args: { error: 'Не удалось сохранить изменения. Черновик остаётся в редакторе.' },
}
