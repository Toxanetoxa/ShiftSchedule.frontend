import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { UiButton } from '@ui'
import { ref } from 'vue'
import UiToast from './UiToast.vue'

const meta = {
  title: 'UI/UiToast',
  component: UiToast,
  args: {
    title: 'Изменения сохранены',
    description: 'Сохранено 8 назначений.',
    tone: 'success',
    duration: 5000,
  },
  render: (args) => ({
    components: { UiToast, UiButton },
    setup: () => ({ args, open: ref(false) }),
    template:
      '<UiButton @click="open = true">Показать уведомление</UiButton><UiToast v-bind="args" v-model:open="open" />',
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Уведомление о результате операции. Ошибки полей и форм дополнительно отображаются рядом с ними.',
      },
    },
  },
} satisfies Meta<typeof UiToast>
export default meta
type Story = StoryObj<typeof meta>
export const Success: Story = {}
export const Error: Story = {
  args: {
    tone: 'error',
    title: 'Не удалось сохранить',
    description: 'Ваши изменения остаются в черновике.',
  },
}
export const Info: Story = {
  args: {
    tone: 'info',
    title: 'На сервере новая версия',
    description: 'Проверьте изменения перед сохранением.',
  },
}
