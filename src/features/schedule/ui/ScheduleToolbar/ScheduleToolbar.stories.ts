import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import ScheduleToolbar from './ScheduleToolbar.vue'

const meta = {
  title: 'Schedule/ScheduleToolbar',
  component: ScheduleToolbar,
  tags: ['autodocs'],
  args: {
    modelValue: '',
    view: 'week',
    selectionSummary: { cellCount: 0, employeeCount: 0, dayCount: 0 },
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'При пустом выделении доступны поиск и режим, при непустом — действия с ячейками. Оба состояния сохраняют общую высоту, поэтому таблица не сдвигается при переключении и адаптивном переносе. Скрытые контролы исключены из взаимодействия. Кнопка «Снять» возвращает фокус на поиск без прокрутки. Слот template-action позволяет встроить выбор шаблона в панель.',
      },
    },
  },
  render: (args) => ({
    components: { ScheduleToolbar },
    setup() {
      const search = ref(args.modelValue)
      const view = ref(args.view)
      const selection = ref(args.selectionSummary)
      const message = ref('')
      watch(
        () => args.modelValue,
        (next) => {
          search.value = next
        },
      )
      watch(
        () => args.view,
        (next) => {
          view.value = next
        },
      )
      watch(
        () => args.selectionSummary,
        (next) => {
          selection.value = next
        },
      )
      return { args, search, view, selection, message }
    },
    template: `<ScheduleToolbar v-bind="args" v-model="search" v-model:view="view" :selection-summary="selection" @choose-template="message = 'Выбор шаблона'" @clear-cells="message = 'Команда очистки ячеек'" @clear-selection="selection = { cellCount: 0, employeeCount: 0, dayCount: 0 }" /><p role="status" style="margin-top: 12px">{{ message || ('Поиск: ' + (search || 'не задан') + ' · ' + view) }}</p>`,
  }),
} satisfies Meta<typeof ScheduleToolbar>
export default meta
type Story = StoryObj<typeof meta>
export const Regular: Story = {}
export const Selected: Story = {
  args: { selectionSummary: { cellCount: 8, employeeCount: 2, dayCount: 4 } },
}
export const Month: Story = { args: { view: 'month' } }
export const DisabledProposed: Story = { args: { disabled: true } }
export const NarrowProposed: Story = {
  decorators: [() => ({ template: '<div style="max-width: 360px"><story /></div>' })],
}
export const NarrowSelected: Story = {
  ...NarrowProposed,
  args: { modelValue: 'Анна', selectionSummary: { cellCount: 8, employeeCount: 2, dayCount: 4 } },
}
