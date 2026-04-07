/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BE_URL_LOCAL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly VITE_WS_PEOPLE_COUNTER_URL: string;
  readonly VITE_AI_STREAM_URL: string;
  readonly VITE_AI_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
