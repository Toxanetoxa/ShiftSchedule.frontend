import type { DateRange } from '@schedule/domain/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import PublishDialog from './PublishDialog.vue'

const meta = {
  title: 'Schedule/PublishDialog',
  component: PublishDialog,
  args: {
    range: { startDate: '2026-11-09', endDate: '2026-11-16' },
    hasDirty: false,
    pending: false,
    error: null,
  },
  render: (args) => ({
    components: { PublishDialog, UiButton },
    setup: () => {
      const open = ref(false)
      const range = ref({ ...args.range })
      const result = ref('')
      function confirm(value: DateRange): void {
        result.value = `Публикация ${value.startDate} — ${value.endDate} (окончание не включено)`
        open.value = false
      }
      return { args, open, range, result, confirm }
    },
    template:
      '<PublishDialog v-bind="args" v-model:open="open" v-model:range="range" @confirm="confirm"><template #trigger><UiButton>Опубликовать график</UiButton></template></PublishDialog><p v-if="result" role="status">{{ result }}</p>',
  }),
} satisfies Meta<typeof PublishDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Saved: Story = {}
export const SaveThenPublish: Story = { args: { hasDirty: true } }
export const Pending: Story = { args: { pending: true } }
export const InvalidRange: Story = {
  args: { range: { startDate: '2026-11-16', endDate: '2026-11-09' } },
}
export const Error: Story = {
  args: { error: 'Версия графика изменилась. Проверьте обновления перед повторной публикацией.' },
}
