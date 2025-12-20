/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_MEMORY_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}