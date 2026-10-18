/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** The build, e.g. "2026-10-18 224ad08" (vite.config.ts). */
declare const __APP_VERSION__: string
