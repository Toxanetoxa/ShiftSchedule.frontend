import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { AppShell } from '@ui'
import { ref, watch } from 'vue'
import AppSidebar from './AppSidebar.vue'

const meta = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  tags: ['autodocs'],
  args: { activeItem: 'shifts', collapsed: false },
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    components: { AppSidebar, AppShell },
    setup() {
      const active = ref(args.activeItem)
      const collapsed = ref(args.collapsed)
      watch(
        () => args.activeItem,
        (value) => {
          active.value = value
        },
      )
      watch(
        () => args.collapsed,
        (value) => {
          collapsed.value = value
        },
      )
      return { active, collapsed, message: ref('') }
    },
    template:
      '<AppShell :sidebar-collapsed="collapsed"><template #sidebar><AppSidebar :active-item="active" :collapsed="collapsed" @navigate="active = $event" @toggle="collapsed = !collapsed" @notifications="message = \'Запрошено открытие уведомлений\'" /></template><p role="status">{{ message }}</p></AppShell>',
  }),
} satisfies Meta<typeof AppSidebar>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Collapsed: Story = { args: { collapsed: true } }
