import type { CellKey } from '@schedule/domain/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { emptyRows, monthDates, weekDates, weekRows } from '@schedule/stories/fixtures'
import { ref } from 'vue'
import ScheduleGrid from './ScheduleGrid.vue'

const meta = {
  title: 'Schedule/ScheduleGrid',
  component: ScheduleGrid,
  tags: ['autodocs'],
  args: { rows: weekRows, dates: weekDates, view: 'week' },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Одна CSS-сетка для недели и месяца. Клик выделяет ячейку, повторный клик снимает её выделение, сохраняя остальные выбранные ячейки. Выделение и фокус независимы. Стрелки, Home/End, Ctrl+Home/End, Shift+стрелки, Space, Enter, Ctrl+Enter, Escape и Delete передают типизированные намерения. HTTP и сохранение находятся вне компонента.',
      },
    },
  },
  render: (args) => ({
    components: { ScheduleGrid },
    setup: () => ({
      args,
      selected: ref<CellKey[]>([]),
      active: ref<CellKey | null>(null),
      message: ref(''),
    }),
    template:
      '<div style="padding:12px"><ScheduleGrid v-bind="args" :selected-keys="selected" :active-key="active" @change-selection="selected = $event" @focus-cell="active = $event.employeeId + \':\' + $event.workDate" @activate-cell="message = \'Запрошено редактирование \' + $event.workDate" @request-date-action="message = \'Действия даты: \' + $event" @clear-cells="message = \'Запрошена очистка ячеек: \' + $event.length" @request-move="message = \'Запрошен перенос: \' + $event.workDate" @open-cell-actions="message = \'Запрошено меню: \' + $event.workDate" /><p role="status">Выделено: {{ selected.length }}. {{ message }}</p></div>',
  }),
} satisfies Meta<typeof ScheduleGrid>
export default meta
type Story = StoryObj<typeof meta>
export const Week: Story = {}
export const EmptyWeek: Story = { args: { rows: emptyRows } }
export const Month: Story = { args: { dates: monthDates, view: 'month' } }
export const Loading: Story = { args: { loading: true } }
export const EmptyRoster: Story = { args: { rows: [] } }
export const NoSearchResults: Story = { args: { rows: [], searchActive: true } }
export const Readonly: Story = { args: { disabled: true } }
export const DirtyAndConflict: Story = {
  args: {
    rows: weekRows.map((row, index) =>
      index
        ? row
        : { ...row, dirtyDates: [weekDates[0]!.date], conflictDates: [weekDates[1]!.date] },
    ),
  },
}
