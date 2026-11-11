import type { ShiftTemplate } from '@schedule/domain/types'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShiftTemplateCard from './ShiftTemplateCard.vue'

const morning: ShiftTemplate = {
  id: 'morning',
  label: 'Утро',
  colorKey: 'morning',
  startTime: '08:00',
  endTime: '16:00',
  endDayOffset: 0,
  sourceTemplateId: 'morning',
  durationMinutes: 480,
}
const day: ShiftTemplate = {
  ...morning,
  id: 'day',
  label: 'День',
  colorKey: 'day',
  startTime: '12:00',
  endTime: '20:00',
  sourceTemplateId: 'day',
}
const evening: ShiftTemplate = {
  ...morning,
  id: 'evening',
  label: 'Вечер',
  colorKey: 'evening',
  startTime: '14:00',
  endTime: '22:00',
  sourceTemplateId: 'evening',
}

const meta = {
  title: 'Schedule/ShiftTemplateCard',
  component: ShiftTemplateCard,
  tags: ['autodocs'],
  args: { template: morning, badgeLabel: '1', disabled: false },
  decorators: [() => ({ template: '<div style="width:303px;max-width:100%"><story /></div>' })],
  parameters: {
    docs: {
      description: {
        component:
          'Три шаблона ConinerShedule: Утро=Cornflower, День=Lavanda, Вечер=Mint. Нейтральный фон и левый цветной border 3 px; карточка заполняет контейнер, экранная ширина 303 px. BadgeLabel — только визуальная метка, её бизнес-смысл не предположен. Apply и dragStart передаются контейнеру без записи данных.',
      },
    },
  },
} satisfies Meta<typeof ShiftTemplateCard>

export default meta
type Story = StoryObj<typeof meta>

export const Morning: Story = {}
export const Day: Story = { args: { template: day, badgeLabel: '2' } }
export const Evening: Story = { args: { template: evening, badgeLabel: '3' } }
export const DisabledExtension: Story = { args: { disabled: true } }
export const DraggingExtension: Story = { args: { dragging: true } }
