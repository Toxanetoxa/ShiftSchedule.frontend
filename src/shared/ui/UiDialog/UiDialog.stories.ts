import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import UiDialog from './UiDialog.vue'

const meta = {
  title: 'UI/UiDialog',
  component: UiDialog,
  args: {
    title: 'Настройки графика',
    description: 'Диалог с фокусом внутри, возвратом к кнопке и закрытием по Escape.',
    pending: false,
    error: null,
  },
  render: (args) => ({
    components: { UiDialog, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template:
      '<UiDialog v-bind="args" v-model:open="open"><template #trigger><UiButton>Открыть диалог</UiButton></template><p>Текст диалога может занимать несколько строк. Компонент ограничивает высоту и сохраняет доступ к действиям при прокрутке.</p><template #footer><UiButton color="neutral" variant="tertiary" :disabled="args.pending" @click="open = false">Отмена</UiButton><UiButton :loading="args.pending" @click="open = false">Готово</UiButton></template></UiDialog>',
  }),
} satisfies Meta<typeof UiDialog>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Pending: Story = { args: { pending: true } }
export const Error: Story = {
  args: { error: 'Не удалось завершить действие. Данные сохранены в диалоге.' },
}
export const LongDescription: Story = {
  args: { description: 'Пример длинного описания. '.repeat(16) },
}
