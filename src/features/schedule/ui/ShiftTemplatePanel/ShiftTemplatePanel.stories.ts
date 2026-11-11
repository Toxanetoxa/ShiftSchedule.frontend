import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { templates } from '@schedule/stories/fixtures'
import { fn } from 'storybook/test'
import ShiftTemplatePanel from './ShiftTemplatePanel.vue'

const meta = {
  title: 'Schedule/ShiftTemplatePanel',
  component: ShiftTemplatePanel,
  tags: ['autodocs'],
  args: {
    templates,
    selectionCount: 8,
    disabled: false,
    onApplyTemplate: fn(),
    onApplyCustom: fn(),
  },
  parameters: {
    docs: {
      description: {
        component:
          'М: панель 335 px, padding 16 px, три шаблона и своя смена. Р: disabled/no selection/empty и stacked-ширина ниже 1100 px. Шаблон назначается явным действием; сетевой код отсутствует.',
      },
    },
  },
  decorators: [() => ({ template: '<div style="max-width: 335px"><story /></div>' })],
} satisfies Meta<typeof ShiftTemplatePanel>
export default meta
type Story = StoryObj<typeof meta>
export const DesktopPanel: Story = {}
export const NoSelectionProposed: Story = { args: { selectionCount: 0 } }
export const DisabledProposed: Story = { args: { disabled: true } }
export const EmptyProposed: Story = { args: { templates: [] } }
