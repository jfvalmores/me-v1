import type { NavigationGuard } from 'vue-router'
export type MiddlewareKey = "auth"
declare module "/Users/justine/projects/me/my-nuxt-app/node_modules/nuxt/dist/pages/runtime/composables" {
  interface PageMeta {
    middleware?: MiddlewareKey | NavigationGuard | Array<MiddlewareKey | NavigationGuard>
  }
}