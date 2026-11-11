import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref, watch } from 'vue'
import PeriodNavigator from './PeriodNavigator.vue'

function fromIso(value: string): Date {
  const [year = 2000, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function toIso(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const meta = {
  title: 'Schedule/PeriodNavigator',
  component: PeriodNavigator,
  tags: ['autodocs'],
  args: { activeDate: '2026-12-28', view: 'week', rangeLabel: '', disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          'Навигация по графику с календарём UiDatePicker. Контролируемые команды previous/next/today/chooseDate; компонент не меняет диапазон самостоятельно. Story обновляет дату и показывает переход года.',
      },
    },
  },
  render: (args) => ({
    components: { PeriodNavigator },
    setup() {
      const activeDate = ref(args.activeDate)
      watch(
        () => args.activeDate,
        (next) => {
          activeDate.value = next
        },
      )
      const rangeLabel = computed(() => {
        const start = fromIso(activeDate.value)
        if (args.view === 'month')
          return new Intl.DateTimeFormat('ru', { month: 'long', year: 'numeric' }).format(start)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        const format = new Intl.DateTimeFormat('ru', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
        return `${format.format(start)} — ${format.format(end)}`
      })
      function move(direction: number): void {
        const date = fromIso(activeDate.value)
        if (args.view === 'month') {
          date.setDate(1)
          date.setMonth(date.getMonth() + direction)
        } else date.setDate(date.getDate() + 7 * direction)
        activeDate.value = toIso(date)
      }
      function today(): void {
        activeDate.value = toIso(new Date())
      }
      return { args, activeDate, rangeLabel, move, today }
    },
    template:
      '<PeriodNavigator v-bind="args" :active-date="activeDate" :range-label="rangeLabel" @previous="move(-1)" @next="move(1)" @today="today" @choose-date="activeDate = $event" />',
  }),
} satisfies Meta<typeof PeriodNavigator>
export default meta
type Story = StoryObj<typeof meta>
export const WeekAcrossYearProposed: Story = {}
export const MonthProposed: Story = { args: { view: 'month', activeDate: '2027-01-01' } }
export const DisabledProposed: Story = { args: { disabled: true } }
