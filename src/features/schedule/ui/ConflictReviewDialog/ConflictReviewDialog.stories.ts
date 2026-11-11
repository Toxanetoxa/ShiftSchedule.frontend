import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { conflicts } from '@schedule/stories/fixtures'
import { UiButton } from '@ui'
import { ref } from 'vue'
import ConflictReviewDialog from './ConflictReviewDialog.vue'

const meta = {
  title: 'Schedule/ConflictReviewDialog',
  component: ConflictReviewDialog,
  args: { conflicts, remoteVersion: 14, pending: false, error: null },
  render: (args) => ({
    components: { ConflictReviewDialog, UiButton },
    setup: () => ({ args, open: ref(false), result: ref('') }),
    template:
      '<ConflictReviewDialog v-bind="args" v-model:open="open" @confirm-rebase="result = `Согласована версия ${$event.remoteVersion}: ${$event.resolutions.length} решений`; open = false"><template #trigger><UiButton>Проверить конфликты</UiButton></template></ConflictReviewDialog><p v-if="result" role="status">{{ result }}</p>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Каждая ячейка требует явного выбора. При смене серверной версии решения сбрасываются. Компонент не отправляет PATCH и не изменяет baseline редактора.',
      },
    },
  },
} satisfies Meta<typeof ConflictReviewDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Conflicts: Story = {}
export const NoCellConflicts: Story = { args: { conflicts: [] } }
export const Pending: Story = { args: { pending: true } }
export const Error: Story = {
  args: {
    error: 'Серверная версия снова изменилась. Перечитайте данные и согласуйте их повторно.',
  },
}
