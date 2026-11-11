import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import AppShell from './AppShell.vue'

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { sidebarCollapsed: false },
} satisfies Meta<typeof AppShell>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {
  render: (args) => ({
    components: { AppShell },
    setup: () => ({
      args,
      collapsed: ref(args.sidebarCollapsed),
      active: ref('shifts'),
      message: ref(''),
    }),
    template:
      '<AppShell v-model:sidebar-collapsed="collapsed" :active-item="active" @navigate="active = $event" @notifications="message = \'Запрошены уведомления\'"><h1>{{ active === \'shifts\' ? \'Смены\' : \'Главная\' }}</h1><p role="status">{{ message }}</p><p>Содержимое страницы передаётся через slot.</p></AppShell>',
  }),
}
export const Collapsed: Story = { ...Default, args: { sidebarCollapsed: true } }
