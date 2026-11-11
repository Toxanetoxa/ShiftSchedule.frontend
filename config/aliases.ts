import { fileURLToPath, URL } from 'node:url'

export const sourceAliases = {
  '@ui': fileURLToPath(new URL('../src/shared/ui', import.meta.url)),
  '@schedule': fileURLToPath(new URL('../src/features/schedule', import.meta.url)),
  '@': fileURLToPath(new URL('../src', import.meta.url)),
}
