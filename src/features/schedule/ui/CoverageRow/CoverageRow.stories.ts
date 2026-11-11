import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { weekDates } from '@schedule/stories/fixtures'
import CoverageRow from './CoverageRow.vue'

const dates = weekDates.slice(0, 3)
const emptyCounts = Object.fromEntries(dates.map((date) => [date.date, 0]))

const meta = {
  title: 'Schedule/CoverageRow',
  component: CoverageRow,
  tags: ['autodocs'],
  args: { dates, counts: emptyCounts },
  decorators: [
    () => ({
      template:
        '<div role="grid" aria-label="Покрытие графика" style="--calendar-columns:220px repeat(3,110px);width:550px;max-width:100%;overflow:auto"><story /></div>',
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Нулевое покрытие — исходное розовое состояние, положительное — синее. Компонент получает готовые counts по датам; агрегаты вычисляются вне UI по полному диапазону и локальным изменениям. Использует единую переменную --calendar-columns контейнера календаря.',
      },
    },
  },
} satisfies Meta<typeof CoverageRow>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}
export const Covered: Story = {
  args: { counts: Object.fromEntries(dates.map((date, index) => [date.date, index + 1])) },
}
export const Mixed: Story = {
  args: {
    counts: Object.fromEntries(dates.map((date, index) => [date.date, index % 2 === 0 ? 0 : 3])),
  },
}
