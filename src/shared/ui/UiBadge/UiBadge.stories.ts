import type { Meta, StoryObj } from '@storybook/vue3-vite'
import UiBadge from './UiBadge.vue'

const meta = {
  title: 'UI/UiBadge',
  component: UiBadge,
  tags: ['autodocs'],
  args: { label: 'Бейдж', color: 'neutral' },
  argTypes: { color: { control: 'select', options: ['neutral', 'blue'] } },
  parameters: {
    docs: {
      description: {
        component:
          'Два прочитанных варианта Badge: Fill / Neutral и Fill / Blue. Высота 26 px, padding 4 / 8 / 6 px, Caption/XS с фактическим weight 600. Метка шаблона — отдельный TemplateHint.',
      },
    },
  },
} satisfies Meta<typeof UiBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Neutral: Story = {}
export const Blue: Story = { args: { color: 'blue' } }
