import type { ShiftViewModel } from '@schedule/domain/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShiftChip from './ShiftChip.vue'

const morning: ShiftViewModel = {
  label: 'Утро',
  colorKey: 'morning',
  startTime: '08:00',
  endTime: '16:00',
  endDayOffset: 0,
  sourceTemplateId: 'morning',
  durationMinutes: 480,
}
const day: ShiftViewModel = {
  ...morning,
  label: 'День',
  colorKey: 'day',
  startTime: '12:00',
  endTime: '20:00',
  sourceTemplateId: 'day',
}
const evening: ShiftViewModel = {
  ...morning,
  label: 'Вечер',
  colorKey: 'evening',
  startTime: '14:00',
  endTime: '22:00',
  sourceTemplateId: 'evening',
}
const custom: ShiftViewModel = {
  ...morning,
  label: 'Своя смена',
  colorKey: 'custom',
  startTime: '10:00',
  endTime: '18:00',
  sourceTemplateId: null,
}

const meta = {
  title: 'Schedule/ShiftChip',
  component: ShiftChip,
  tags: ['autodocs'],
  args: { shift: morning, view: 'week', selected: false },
  argTypes: { view: { control: 'select', options: ['week', 'month'] } },
  render: (args) => ({
    components: { ShiftChip },
    setup: () => ({ args }),
    template:
      "<div :style=\"{width: args.view === 'month' ? '64px' : '98px'}\"><ShiftChip v-bind=\"args\" /></div>",
  }),
  parameters: {
    docs: {
      description: {
        component:
          'Восемь назначений ConinerShedule: Week/Month × Cornflower/Lavanda/Mint/Brand. Вместе с тремя ShiftTemplateCard составляют 11 прочитанных вариантов. Week показывает время и часы; Month — часы. Brand обозначает категорию собственной смены, а не выделение. Метка +1 день — расширение реализации; составной paint вечерней длительности остаётся сохранённым в исходных токенах без выдуманного HEX.',
      },
    },
  },
} satisfies Meta<typeof ShiftChip>

export default meta
type Story = StoryObj<typeof meta>

export const WeekMorning: Story = {}
export const WeekDay: Story = { args: { shift: day } }
export const WeekEvening: Story = { args: { shift: evening } }
export const WeekCustom: Story = { args: { shift: custom } }
export const MonthMorning: Story = { args: { view: 'month' } }
export const MonthDay: Story = { args: { view: 'month', shift: day } }
export const MonthEvening: Story = { args: { view: 'month', shift: evening } }
export const MonthCustom: Story = { args: { view: 'month', shift: custom } }
export const OvernightExtension: Story = {
  args: { shift: { ...custom, startTime: '22:00', endTime: '06:00', endDayOffset: 1 } },
}
