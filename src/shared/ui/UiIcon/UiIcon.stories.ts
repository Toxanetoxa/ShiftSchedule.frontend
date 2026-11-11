import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { iconPaths } from './icons'
import UiIcon from './UiIcon.vue'

const meta = {
  title: 'UI/UiIcon',
  component: UiIcon,
  tags: ['autodocs'],
  args: { name: 'calendar', title: 'Календарь' },
  argTypes: { name: { control: 'select', options: Object.keys(iconPaths) } },
  parameters: {
    docs: {
      description: {
        component:
          'Иконки реализации с currentColor. Исходные SVG Figma не входили в комплект; это не их точный экспорт.',
      },
    },
  },
} satisfies Meta<typeof UiIcon>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Gallery: Story = {
  render: () => ({
    components: { UiIcon },
    setup: () => ({ names: Object.keys(iconPaths) }),
    template:
      '<div style="display:flex;gap:24px;flex-wrap:wrap"><div v-for="name in names" :key="name" style="display:grid;gap:8px;justify-items:center"><UiIcon :name="name" :size="24" /><span>{{ name }}</span></div></div>',
  }),
}
