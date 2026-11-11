/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SCHEDULE_ID?: string
  readonly VITE_STORYBOOK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
