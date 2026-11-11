import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WorkspaceStory from './ScheduleWorkspace.vue'

const meta = {
  title: 'Schedule/Workspace',
  component: WorkspaceStory,
  args: { view: 'week', state: 'filled', selected: false, scenario: 'default' },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Offline-композиция UI. М: геометрия, базовые варианты недели/месяца, выделение и карточки. Р: адаптивность, drawer ниже 1100 px, ошибки, чужие изменения и конфликт. Назначения меняются только в памяти истории; Save/Publish показывают команды без HTTP.',
      },
    },
    viewport: {
      options: {
        figma: { name: 'Figma · 1700 × 1024', styles: { width: '1700px', height: '1024px' } },
        laptop: { name: 'Laptop · 1366 × 768', styles: { width: '1366px', height: '768px' } },
        tablet: { name: 'Tablet · 768 × 1024', styles: { width: '768px', height: '1024px' } },
      },
    },
  },
} satisfies Meta<typeof WorkspaceStory>

export default meta
type Story = StoryObj<typeof meta>
export const EmptyWeek: Story = { args: { state: 'empty' } }
export const FilledWeek: Story = {}
export const DragAndDrop: Story = {
  name: 'Перетаскивание шаблонов и смен',
  args: { state: 'empty' },
}
export const DragAssignedShift: Story = {
  name: 'Перенос назначенной смены',
  args: { state: 'filled' },
}
export const DragMonth: Story = { name: 'Перетаскивание в месяце', args: { view: 'month' } }
export const InactiveDropTarget: Story = {
  name: 'Неактивный сотрудник — цель недоступна',
  args: { inactiveEmployee: true },
}
export const Month: Story = { args: { view: 'month' } }
export const EightSelected: Story = { args: { selected: true } }
export const Custom1000To2300: Story = { args: { scenario: 'custom' } }
export const SearchNoResultsProposed: Story = { args: { scenario: 'no-results' } }
export const LoadErrorProposed: Story = { args: { scenario: 'load-error' } }
export const SaveErrorDraftKeptProposed: Story = { args: { scenario: 'save-error' } }
export const RemoteUpdateProposed: Story = { args: { scenario: 'remote-update' } }
export const OneCellConflictProposed: Story = { args: { scenario: 'conflict' } }
export const Viewport1700: Story = { globals: { viewport: { value: 'figma' } } }
export const Viewport1366Proposed: Story = { globals: { viewport: { value: 'laptop' } } }
export const Drawer768Proposed: Story = {
  args: { selected: true },
  globals: { viewport: { value: 'tablet' } },
}
