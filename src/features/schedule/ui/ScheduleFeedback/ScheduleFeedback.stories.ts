import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ScheduleFeedback from './ScheduleFeedback.vue'

const meta = {
  title: 'Schedule/ScheduleFeedback',
  component: ScheduleFeedback,
  tags: ['autodocs'],
  args: { loading: false, error: null, offline: false, remoteUpdated: false, savedAt: null },
  decorators: [() => ({ template: '<div style="max-width:840px"><story /></div>' })],
  parameters: {
    docs: {
      description: {
        component:
          'Расширение реализации: ненавязчивый статус загрузки, ошибки, отсутствия сети, удалённого обновления и сохранения. Компонент не запускает запросы и не удаляет содержимое таблицы при фоновой ошибке; retry/reviewConflicts обрабатывает контейнер.',
      },
    },
  },
} satisfies Meta<typeof ScheduleFeedback>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { args: { loading: true } }
export const InitialError: Story = {
  args: { error: 'Не удалось загрузить график. Попробуйте ещё раз.' },
}
export const BackgroundError: Story = {
  args: { error: 'Не удалось обновить график. Отображаемые смены и локальные изменения доступны.' },
}
export const Offline: Story = { args: { offline: true } }
export const RemoteUpdated: Story = { args: { remoteUpdated: true } }
export const Saved: Story = { args: { savedAt: '2026-11-10T12:24:00+03:00' } }
