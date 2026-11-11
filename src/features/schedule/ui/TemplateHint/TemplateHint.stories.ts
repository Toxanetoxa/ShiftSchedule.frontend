import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TemplateHint from './TemplateHint.vue'

const meta = {
  title: 'Schedule/TemplateHint',
  component: TemplateHint,
  tags: ['autodocs'],
  args: { label: '1' },
  parameters: {
    backgrounds: { default: 'gray' },
    docs: {
      description: {
        component:
          'Прямоугольная метка шаблона: высота 20 px, radius 4 px, padding 2×8 px. Значение цифры не подтверждено, поэтому метка не объявляет горячую клавишу и не имеет действия.',
      },
    },
  },
} satisfies Meta<typeof TemplateHint>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
