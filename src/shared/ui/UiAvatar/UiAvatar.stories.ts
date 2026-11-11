import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiAvatar from './UiAvatar.vue'

const meta = {
  title: 'UI/UiAvatar',
  component: UiAvatar,
  tags: ['autodocs'],
  args: { name: 'Анна Смирнова' },
  parameters: {
    docs: {
      description: {
        component:
          'Декоративный аватар 40×40 px рядом с видимым ФИО. Reka Avatar показывает инициалы при отсутствии или ошибке изображения. Полная матрица Avatar в Figma не подтверждена.',
      },
    },
  },
} satisfies Meta<typeof UiAvatar>

export default meta
type Story = StoryObj<typeof meta>

export const Initials: Story = {}
export const ImageFallback: Story = {
  args: { src: 'data:image/png;base64,invalid' },
  parameters: {
    docs: {
      description: {
        story: 'Расширение реализации: недоступное изображение заменяется инициалами.',
      },
    },
  },
}
