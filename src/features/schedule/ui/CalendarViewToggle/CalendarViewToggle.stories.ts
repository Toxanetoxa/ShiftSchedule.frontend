import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import CalendarViewToggle from './CalendarViewToggle.vue'

const meta = {
  title: 'Schedule/CalendarViewToggle',
  component: CalendarViewToggle,
  tags: ['autodocs'],
  args: { modelValue: 'week', disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          'М: Месяц/Неделя, 301 × 48 px, выбранный сегмент 44 px. Reka RadioGroup поддерживает стрелки и Tab. Р: focus и disabled.',
      },
    },
  },
  render: (args) => ({
    components: { CalendarViewToggle },
    setup() {
      const value = ref(args.modelValue)
      watch(
        () => args.modelValue,
        (next) => {
          value.value = next
        },
      )
      return { args, value }
    },
    template: '<CalendarViewToggle v-bind="args" v-model="value" />',
  }),
} satisfies Meta<typeof CalendarViewToggle>
export default meta
type Story = StoryObj<typeof meta>
export const Week: Story = {}
export const Month: Story = { args: { modelValue: 'month' } }
export const DisabledProposed: Story = { args: { disabled: true } }
