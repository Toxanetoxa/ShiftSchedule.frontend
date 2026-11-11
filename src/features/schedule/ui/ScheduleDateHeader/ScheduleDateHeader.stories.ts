import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ScheduleDateHeader from './ScheduleDateHeader.vue'

const meta = {
  title: 'Schedule/ScheduleDateHeader',
  component: ScheduleDateHeader,
  tags: ['autodocs'],
  args: {
    date: '2026-11-10',
    weekdayLabel: 'Вт',
    dayLabel: '10',
    covered: false,
    isToday: false,
    disabled: false,
  },
  decorators: [
    () => ({
      template:
        '<div role="grid" aria-label="Заголовок календаря"><div role="row" style="width:110px"><story /></div></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Заголовок даты использует ту же колонку, что ячейки и покрытие. Покрытие определяется числом назначений, today не заменяет его. Hover, focus и today — расширения реализации. tabIndex позволяет контейнеру исключить кнопку из Tab-порядка ARIA grid.',
      },
    },
  },
} satisfies Meta<typeof ScheduleDateHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Uncovered: Story = {}
export const Covered: Story = { args: { covered: true } }
export const TodayExtension: Story = { args: { isToday: true } }
export const CoveredTodayExtension: Story = { args: { covered: true, isToday: true } }
export const DisabledExtension: Story = { args: { disabled: true } }
