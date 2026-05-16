/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SKILL_REGISTRY_ADDRESS: string;
  readonly VITE_ZERO_G_CHAIN_ID: string;
  readonly VITE_ZERO_G_RPC_URL: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
