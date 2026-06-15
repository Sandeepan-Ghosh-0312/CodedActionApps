/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    UIPATH_BASE_URL: string;
    UIPATH_ORG_NAME: string;
    UIPATH_TENANT_NAME: string;
    UIPATH_BEARER_TOKEN: string;
  }
}
