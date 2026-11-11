import type { StorybookConfig } from '@storybook/vue3-vite'
import process from 'node:process'
import { mergeConfig } from 'vite'
import { sourceAliases } from '../config/aliases.ts'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      docgen: 'vue-component-meta',
    },
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal(viteConfig, { configType }) {
    const configWithAliases = mergeConfig(viteConfig, {
      resolve: {
        alias: sourceAliases,
      },
    })
    const clientPort = Number(process.env.STORYBOOK_HMR_PORT)

    if (configType === 'DEVELOPMENT' && Number.isInteger(clientPort) && clientPort > 0) {
      return mergeConfig(configWithAliases, {
        server: {
          hmr: {
            clientPort,
            host: process.env.STORYBOOK_HMR_HOST || 'localhost',
          },
        },
      })
    }

    return configWithAliases
  },
}

export default config
