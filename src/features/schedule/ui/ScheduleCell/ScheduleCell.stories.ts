import type { ShiftViewModel } from '@schedule/domain/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ScheduleCell from './ScheduleCell.vue'

const shift: ShiftViewModel = {
  label: 'Утро',
  colorKey: 'morning',
  startTime: '08:00',
  endTime: '16:00',
  endDayOffset: 0,
  sourceTemplateId: 'morning',
  durationMinutes: 480,
}

const meta = {
  title: 'Schedule/ScheduleCell',
  component: ScheduleCell,
  tags: ['autodocs'],
  args: {
    cell: { employeeId: 'employee-1', workDate: '2026-11-10' },
    employeeName: 'Анна Смирнова',
    shift: null,
    view: 'week',
    selected: false,
    keyboardActive: true,
    disabled: false,
    dirty: false,
    conflict: false,
    dropState: 'none',
  },
  argTypes: {
    view: { control: 'select', options: ['week', 'month'] },
    dropState: { control: 'select', options: ['none', 'allowed', 'blocked'] },
  },
  decorators: [
    () => ({
      template:
        '<div role="grid" aria-label="Фрагмент графика" aria-multiselectable="true"><div role="row" style="display:flex"><story /></div></div>',
    }),
  ],
  render: (args) => ({
    components: { ScheduleCell },
    setup: () => ({ args }),
    template:
      "<ScheduleCell v-bind=\"args\" :style=\"{width: args.view === 'month' ? '64px' : '110px'}\" />",
  }),
  parameters: {
    docs: {
      description: {
        component:
          'CellShedule: шесть Week/Month × Default/Active/Shedule и неиспользуемый Default/Day. Active нормализован в selected, Shedule — в assigned. Focus, dirty, conflict, selected+assigned, drop и disabled — независимые расширения реализации. Day существует только как визуальная фиксация мастера и не расширяет CalendarView.',
      },
    },
  },
} satisfies Meta<typeof ScheduleCell>

export default meta
type Story = StoryObj<typeof meta>

export const WeekDefault: Story = {}
export const WeekActive: Story = { args: { selected: true } }
export const WeekAssigned: Story = { args: { shift } }
export const MonthDefault: Story = { args: { view: 'month' } }
export const MonthActive: Story = { args: { view: 'month', selected: true } }
export const MonthAssigned: Story = { args: { view: 'month', shift } }
export const DefaultDayDeprecated: Story = {
  name: 'Default / Day — только каталог',
  parameters: {
    docs: {
      description: {
        story:
          'Неиспользуемый Default/Day имеет геометрию 110×72 px. Story фиксирует эту геометрию; продуктовый режим Day не добавлен.',
      },
    },
  },
}
export const SelectedAssignedExtension: Story = { args: { shift, selected: true } }
export const DirtyExtension: Story = { args: { shift, dirty: true } }
export const ConflictExtension: Story = { args: { shift, dirty: true, conflict: true } }
export const DropAllowedExtension: Story = { args: { dropState: 'allowed' } }
export const DropBlockedExtension: Story = { args: { shift, dropState: 'blocked' } }
export const DisabledExtension: Story = { args: { shift, disabled: true } }
export const KeyboardFocusExtension: Story = {
  args: { shift },
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>('[role="gridcell"]')?.focus()
  },
}
