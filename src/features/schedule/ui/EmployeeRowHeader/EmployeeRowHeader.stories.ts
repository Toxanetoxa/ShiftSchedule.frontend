import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EmployeeRowHeader from './EmployeeRowHeader.vue'

const meta = {
  title: 'Schedule/EmployeeRowHeader',
  component: EmployeeRowHeader,
  tags: ['autodocs'],
  args: {
    employee: { id: 'employee-1', name: 'Анна Смирнова', position: 'Администратор' },
    scheduledMinutes: 2400,
  },
  decorators: [
    () => ({
      template:
        '<div role="grid" aria-label="Сотрудник графика"><div role="row" style="width:220px"><story /></div></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'AgentCell: единственный прочитанный вариант Type=Default, CopyButton=False, 220×72 px; аватар 40 px. Длинное имя и неактивный сотрудник — расширения реализации. Фотография/инициалы рядом с ФИО декоративны.',
      },
    },
  },
} satisfies Meta<typeof EmployeeRowHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongName: Story = {
  args: {
    employee: {
      id: 'employee-2',
      name: 'Александра Константинопольская',
      position: 'Старший администратор зала',
    },
    scheduledMinutes: 2430,
  },
}
export const Inactive: Story = {
  args: {
    employee: { id: 'employee-3', name: 'Иван Петров', position: 'Администратор', active: false },
  },
}
