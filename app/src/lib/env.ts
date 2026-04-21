export interface RuntimeEnv {
  APP_ENV?: string;
  APP_VERSION?: string;
  APP_HOSTNAME?: string;
  APP_BASE_URL?: string;
  APP_COMMIT_SHA?: string;
}

export interface RuntimeInfo {
  env: string;
  version: string;
  hostname: string;
  baseUrl: string;
  commitSha: string;
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

export function runtimeEnv<K extends keyof RuntimeEnv>(
  key: K,
  fallback = '',
) {
  return window.__ENV__?.[key] || fallback;
}

export function readRuntimeInfo() {
  return {
    env: runtimeEnv('APP_ENV', 'development'),
    version: runtimeEnv('APP_VERSION', __APP_VERSION__),
    hostname: runtimeEnv('APP_HOSTNAME', 'resume-dev.example.com'),
    baseUrl: runtimeEnv('APP_BASE_URL', 'https://resume-dev.example.com'),
    commitSha: runtimeEnv('APP_COMMIT_SHA', 'bootstrap'),
  } satisfies RuntimeInfo;
}
