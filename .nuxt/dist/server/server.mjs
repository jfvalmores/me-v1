import { reactive, hasInjectionContext, getCurrentInstance, toRef, isRef, inject, nextTick, shallowRef, shallowReactive, isReadonly, version, unref, ref, watchEffect, watch, isShallow, isReactive, toRaw, computed, readonly, defineComponent, mergeProps, useSSRContext, provide, h, Suspense, Transition, defineAsyncComponent, onErrorCaptured, onServerPrefetch, createVNode, resolveDynamicComponent, createApp } from "vue";
import { $fetch as $fetch$1 } from "ofetch";
import { useRuntimeConfig as useRuntimeConfig$1 } from "#internal/nitro";
import { createHooks } from "hookable";
import { getContext, executeAsync } from "unctx";
import { createMemoryHistory, createRouter, START_LOCATION, RouterView } from "vue-router";
import { sanitizeStatusCode, createError as createError$1, sendRedirect, appendHeader } from "h3";
import { withQuery, hasProtocol, parseURL, joinURL } from "ufo";
import "devalue";
import { renderSSRHead } from "@unhead/ssr";
import { createServerHead as createServerHead$1, getActiveHead } from "unhead";
import { defineHeadPlugin } from "@unhead/shared";
import "destr";
import "klona";
import getURL from "requrl";
import { defu } from "defu";
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderSuspense, ssrRenderVNode } from "vue/server-renderer";
const appConfig = useRuntimeConfig$1().app;
const baseURL = () => appConfig.baseURL;
const nuxtAppCtx = /* @__PURE__ */ getContext("nuxt-app");
const NuxtPluginIndicator = "__nuxt_plugin";
function createNuxtApp(options) {
  let hydratingCount = 0;
  const nuxtApp = {
    provide: void 0,
    globalName: "nuxt",
    versions: {
      get nuxt() {
        return "3.6.2";
      },
      get vue() {
        return nuxtApp.vueApp.version;
      }
    },
    payload: reactive({
      data: {},
      state: {},
      _errors: {},
      ...{ serverRendered: true }
    }),
    static: {
      data: {}
    },
    runWithContext: (fn) => callWithNuxt(nuxtApp, fn),
    isHydrating: false,
    deferHydration() {
      if (!nuxtApp.isHydrating) {
        return () => {
        };
      }
      hydratingCount++;
      let called = false;
      return () => {
        if (called) {
          return;
        }
        called = true;
        hydratingCount--;
        if (hydratingCount === 0) {
          nuxtApp.isHydrating = false;
          return nuxtApp.callHook("app:suspense:resolve");
        }
      };
    },
    _asyncDataPromises: {},
    _asyncData: {},
    _payloadRevivers: {},
    ...options
  };
  nuxtApp.hooks = createHooks();
  nuxtApp.hook = nuxtApp.hooks.hook;
  {
    async function contextCaller(hooks, args) {
      for (const hook of hooks) {
        await nuxtApp.runWithContext(() => hook(...args));
      }
    }
    nuxtApp.hooks.callHook = (name, ...args) => nuxtApp.hooks.callHookWith(contextCaller, name, ...args);
  }
  nuxtApp.callHook = nuxtApp.hooks.callHook;
  nuxtApp.provide = (name, value) => {
    const $name = "$" + name;
    defineGetter(nuxtApp, $name, value);
    defineGetter(nuxtApp.vueApp.config.globalProperties, $name, value);
  };
  defineGetter(nuxtApp.vueApp, "$nuxt", nuxtApp);
  defineGetter(nuxtApp.vueApp.config.globalProperties, "$nuxt", nuxtApp);
  {
    if (nuxtApp.ssrContext) {
      nuxtApp.ssrContext.nuxt = nuxtApp;
      nuxtApp.ssrContext._payloadReducers = {};
      nuxtApp.payload.path = nuxtApp.ssrContext.url;
    }
    nuxtApp.ssrContext = nuxtApp.ssrContext || {};
    if (nuxtApp.ssrContext.payload) {
      Object.assign(nuxtApp.payload, nuxtApp.ssrContext.payload);
    }
    nuxtApp.ssrContext.payload = nuxtApp.payload;
    nuxtApp.ssrContext.config = {
      public: options.ssrContext.runtimeConfig.public,
      app: options.ssrContext.runtimeConfig.app
    };
  }
  const runtimeConfig = options.ssrContext.runtimeConfig;
  nuxtApp.provide("config", runtimeConfig);
  return nuxtApp;
}
async function applyPlugin(nuxtApp, plugin2) {
  if (plugin2.hooks) {
    nuxtApp.hooks.addHooks(plugin2.hooks);
  }
  if (typeof plugin2 === "function") {
    const { provide: provide2 } = await nuxtApp.runWithContext(() => plugin2(nuxtApp)) || {};
    if (provide2 && typeof provide2 === "object") {
      for (const key in provide2) {
        nuxtApp.provide(key, provide2[key]);
      }
    }
  }
}
async function applyPlugins(nuxtApp, plugins2) {
  const parallels = [];
  const errors = [];
  for (const plugin2 of plugins2) {
    const promise = applyPlugin(nuxtApp, plugin2);
    if (plugin2.parallel) {
      parallels.push(promise.catch((e) => errors.push(e)));
    } else {
      await promise;
    }
  }
  await Promise.all(parallels);
  if (errors.length) {
    throw errors[0];
  }
}
/*! @__NO_SIDE_EFFECTS__ */
function defineNuxtPlugin(plugin2) {
  if (typeof plugin2 === "function") {
    return plugin2;
  }
  delete plugin2.name;
  return Object.assign(plugin2.setup || (() => {
  }), plugin2, { [NuxtPluginIndicator]: true });
}
function callWithNuxt(nuxt, setup, args) {
  const fn = () => args ? setup(...args) : setup();
  {
    return nuxt.vueApp.runWithContext(() => nuxtAppCtx.callAsync(nuxt, fn));
  }
}
/*! @__NO_SIDE_EFFECTS__ */
function useNuxtApp() {
  var _a;
  let nuxtAppInstance;
  if (hasInjectionContext()) {
    nuxtAppInstance = (_a = getCurrentInstance()) == null ? void 0 : _a.appContext.app.$nuxt;
  }
  nuxtAppInstance = nuxtAppInstance || nuxtAppCtx.tryUse();
  if (!nuxtAppInstance) {
    {
      throw new Error("[nuxt] instance unavailable");
    }
  }
  return nuxtAppInstance;
}
/*! @__NO_SIDE_EFFECTS__ */
function useRuntimeConfig() {
  return useNuxtApp().$config;
}
function defineGetter(obj, key, val) {
  Object.defineProperty(obj, key, { get: () => val });
}
const useStateKeyPrefix = "$s";
function useState(...args) {
  const autoKey = typeof args[args.length - 1] === "string" ? args.pop() : void 0;
  if (typeof args[0] !== "string") {
    args.unshift(autoKey);
  }
  const [_key, init] = args;
  if (!_key || typeof _key !== "string") {
    throw new TypeError("[nuxt] [useState] key must be a string: " + _key);
  }
  if (init !== void 0 && typeof init !== "function") {
    throw new Error("[nuxt] [useState] init must be a function: " + init);
  }
  const key = useStateKeyPrefix + _key;
  const nuxt = useNuxtApp();
  const state = toRef(nuxt.payload.state, key);
  if (state.value === void 0 && init) {
    const initialValue = init();
    if (isRef(initialValue)) {
      nuxt.payload.state[key] = initialValue;
      return initialValue;
    }
    state.value = initialValue;
  }
  return state;
}
const LayoutMetaSymbol = Symbol("layout-meta");
const PageRouteSymbol = Symbol("route");
const useRouter = () => {
  var _a;
  return (_a = useNuxtApp()) == null ? void 0 : _a.$router;
};
const useRoute = () => {
  if (hasInjectionContext()) {
    return inject(PageRouteSymbol, useNuxtApp()._route);
  }
  return useNuxtApp()._route;
};
/*! @__NO_SIDE_EFFECTS__ */
function defineNuxtRouteMiddleware(middleware) {
  return middleware;
}
const addRouteMiddleware = (name, middleware, options = {}) => {
  const nuxtApp = useNuxtApp();
  const global = options.global || typeof name !== "string";
  const mw = typeof name !== "string" ? name : middleware;
  if (!mw) {
    console.warn("[nuxt] No route middleware passed to `addRouteMiddleware`.", name);
    return;
  }
  if (global) {
    nuxtApp._middleware.global.push(mw);
  } else {
    nuxtApp._middleware.named[name] = mw;
  }
};
const isProcessingMiddleware = () => {
  try {
    if (useNuxtApp()._processingMiddleware) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
};
const navigateTo = (to, options) => {
  if (!to) {
    to = "/";
  }
  const toPath = typeof to === "string" ? to : withQuery(to.path || "/", to.query || {}) + (to.hash || "");
  if (options == null ? void 0 : options.open) {
    return Promise.resolve();
  }
  const isExternal = (options == null ? void 0 : options.external) || hasProtocol(toPath, { acceptRelative: true });
  if (isExternal && !(options == null ? void 0 : options.external)) {
    throw new Error("Navigating to external URL is not allowed by default. Use `navigateTo (url, { external: true })`.");
  }
  if (isExternal && parseURL(toPath).protocol === "script:") {
    throw new Error("Cannot navigate to an URL with script protocol.");
  }
  const inMiddleware = isProcessingMiddleware();
  const router = useRouter();
  const nuxtApp = useNuxtApp();
  {
    if (nuxtApp.ssrContext) {
      const fullPath = typeof to === "string" || isExternal ? toPath : router.resolve(to).fullPath || "/";
      const location2 = isExternal ? toPath : joinURL(useRuntimeConfig().app.baseURL, fullPath);
      async function redirect(response) {
        await nuxtApp.callHook("app:redirected");
        const encodedLoc = location2.replace(/"/g, "%22");
        nuxtApp.ssrContext._renderResponse = {
          statusCode: sanitizeStatusCode((options == null ? void 0 : options.redirectCode) || 302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: location2 }
        };
        return response;
      }
      if (!isExternal && inMiddleware) {
        router.afterEach((final) => final.fullPath === fullPath ? redirect(false) : void 0);
        return to;
      }
      return redirect(!inMiddleware ? void 0 : (
        /* abort route navigation */
        false
      ));
    }
  }
  if (isExternal) {
    if (options == null ? void 0 : options.replace) {
      location.replace(toPath);
    } else {
      location.href = toPath;
    }
    if (inMiddleware) {
      if (!nuxtApp.isHydrating) {
        return false;
      }
      return new Promise(() => {
      });
    }
    return Promise.resolve();
  }
  return (options == null ? void 0 : options.replace) ? router.replace(to) : router.push(to);
};
const useError = () => toRef(useNuxtApp().payload, "error");
const showError = (_err) => {
  const err = createError(_err);
  try {
    const nuxtApp = useNuxtApp();
    const error = useError();
    if (false)
      ;
    error.value = error.value || err;
  } catch {
    throw err;
  }
  return err;
};
const isNuxtError = (err) => !!(err && typeof err === "object" && "__nuxt_error" in err);
const createError = (err) => {
  const _err = createError$1(err);
  _err.__nuxt_error = true;
  return _err;
};
const __nuxt_page_meta$4 = { middleware: "auth" };
const __nuxt_page_meta$3 = {
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: "/me"
  }
};
const __nuxt_page_meta$2 = { middleware: "auth" };
const __nuxt_page_meta$1 = { middleware: "auth" };
const __nuxt_page_meta = { auth: false };
const _routes = [
  {
    name: (__nuxt_page_meta$4 == null ? void 0 : __nuxt_page_meta$4.name) ?? "index",
    path: (__nuxt_page_meta$4 == null ? void 0 : __nuxt_page_meta$4.path) ?? "/",
    meta: __nuxt_page_meta$4 || {},
    alias: (__nuxt_page_meta$4 == null ? void 0 : __nuxt_page_meta$4.alias) || [],
    redirect: (__nuxt_page_meta$4 == null ? void 0 : __nuxt_page_meta$4.redirect) || void 0,
    component: () => import("./_nuxt/index-a59f773c.js").then((m) => m.default || m)
  },
  {
    name: (__nuxt_page_meta$3 == null ? void 0 : __nuxt_page_meta$3.name) ?? "login",
    path: (__nuxt_page_meta$3 == null ? void 0 : __nuxt_page_meta$3.path) ?? "/login",
    meta: __nuxt_page_meta$3 || {},
    alias: (__nuxt_page_meta$3 == null ? void 0 : __nuxt_page_meta$3.alias) || [],
    redirect: (__nuxt_page_meta$3 == null ? void 0 : __nuxt_page_meta$3.redirect) || void 0,
    component: () => import("./_nuxt/login-b08ddee2.js").then((m) => m.default || m)
  },
  {
    name: (__nuxt_page_meta$2 == null ? void 0 : __nuxt_page_meta$2.name) ?? "me",
    path: (__nuxt_page_meta$2 == null ? void 0 : __nuxt_page_meta$2.path) ?? "/me",
    meta: __nuxt_page_meta$2 || {},
    alias: (__nuxt_page_meta$2 == null ? void 0 : __nuxt_page_meta$2.alias) || [],
    redirect: (__nuxt_page_meta$2 == null ? void 0 : __nuxt_page_meta$2.redirect) || void 0,
    component: () => import("./_nuxt/me-20aedef8.js").then((m) => m.default || m)
  },
  {
    name: (__nuxt_page_meta$1 == null ? void 0 : __nuxt_page_meta$1.name) ?? "protected",
    path: (__nuxt_page_meta$1 == null ? void 0 : __nuxt_page_meta$1.path) ?? "/protected",
    meta: __nuxt_page_meta$1 || {},
    alias: (__nuxt_page_meta$1 == null ? void 0 : __nuxt_page_meta$1.alias) || [],
    redirect: (__nuxt_page_meta$1 == null ? void 0 : __nuxt_page_meta$1.redirect) || void 0,
    component: () => import("./_nuxt/protected-f34ac804.js").then((m) => m.default || m)
  },
  {
    name: (__nuxt_page_meta == null ? void 0 : __nuxt_page_meta.name) ?? "public",
    path: (__nuxt_page_meta == null ? void 0 : __nuxt_page_meta.path) ?? "/public",
    meta: __nuxt_page_meta || {},
    alias: (__nuxt_page_meta == null ? void 0 : __nuxt_page_meta.alias) || [],
    redirect: (__nuxt_page_meta == null ? void 0 : __nuxt_page_meta.redirect) || void 0,
    component: () => import("./_nuxt/public-56c456c4.js").then((m) => m.default || m)
  }
];
const appHead = { "meta": [{ "name": "viewport", "content": "width=device-width, initial-scale=1" }, { "charset": "utf-8" }], "link": [], "style": [], "script": [], "noscript": [] };
const appPageTransition = false;
const appKeepalive = false;
const routerOptions0 = {
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp();
    let position = savedPosition || void 0;
    if (!position && from && to && to.meta.scrollToTop !== false && _isDifferentRoute(from, to)) {
      position = { left: 0, top: 0 };
    }
    if (to.path === from.path) {
      if (from.hash && !to.hash) {
        return { left: 0, top: 0 };
      }
      if (to.hash) {
        return { el: to.hash, top: _getHashElementScrollMarginTop(to.hash) };
      }
    }
    const hasTransition = (route) => !!(route.meta.pageTransition ?? appPageTransition);
    const hookToWait = hasTransition(from) && hasTransition(to) ? "page:transition:finish" : "page:finish";
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce(hookToWait, async () => {
        await nextTick();
        if (to.hash) {
          position = { el: to.hash, top: _getHashElementScrollMarginTop(to.hash) };
        }
        resolve(position);
      });
    });
  }
};
function _getHashElementScrollMarginTop(selector) {
  try {
    const elem = document.querySelector(selector);
    if (elem) {
      return parseFloat(getComputedStyle(elem).scrollMarginTop);
    }
  } catch {
  }
  return 0;
}
function _isDifferentRoute(from, to) {
  const samePageComponent = to.matched.every((comp, index) => {
    var _a, _b, _c;
    return ((_a = comp.components) == null ? void 0 : _a.default) === ((_c = (_b = from.matched[index]) == null ? void 0 : _b.components) == null ? void 0 : _c.default);
  });
  if (!samePageComponent) {
    return true;
  }
  if (samePageComponent && JSON.stringify(from.params) !== JSON.stringify(to.params)) {
    return true;
  }
  return false;
}
const configRouterOptions = {};
const routerOptions = {
  ...configRouterOptions,
  ...routerOptions0
};
const validate = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  var _a;
  let __temp, __restore;
  if (!((_a = to.meta) == null ? void 0 : _a.validate)) {
    return;
  }
  useRouter();
  const result = ([__temp, __restore] = executeAsync(() => Promise.resolve(to.meta.validate(to))), __temp = await __temp, __restore(), __temp);
  if (result === true) {
    return;
  }
  {
    return result;
  }
});
const globalMiddleware = [
  validate
];
const namedMiddleware = {
  auth: () => Promise.resolve().then(function() {
    return auth;
  })
};
const plugin = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:router",
  enforce: "pre",
  async setup(nuxtApp) {
    var _a, _b;
    let __temp, __restore;
    let routerBase = useRuntimeConfig().app.baseURL;
    if (routerOptions.hashMode && !routerBase.includes("#")) {
      routerBase += "#";
    }
    const history = ((_a = routerOptions.history) == null ? void 0 : _a.call(routerOptions, routerBase)) ?? createMemoryHistory(routerBase);
    const routes = ((_b = routerOptions.routes) == null ? void 0 : _b.call(routerOptions, _routes)) ?? _routes;
    let startPosition;
    const initialURL = nuxtApp.ssrContext.url;
    const router = createRouter({
      ...routerOptions,
      scrollBehavior: (to, from, savedPosition) => {
        var _a2;
        if (from === START_LOCATION) {
          startPosition = savedPosition;
          return;
        }
        router.options.scrollBehavior = routerOptions.scrollBehavior;
        return (_a2 = routerOptions.scrollBehavior) == null ? void 0 : _a2.call(routerOptions, to, START_LOCATION, startPosition || savedPosition);
      },
      history,
      routes
    });
    nuxtApp.vueApp.use(router);
    const previousRoute = shallowRef(router.currentRoute.value);
    router.afterEach((_to, from) => {
      previousRoute.value = from;
    });
    Object.defineProperty(nuxtApp.vueApp.config.globalProperties, "previousRoute", {
      get: () => previousRoute.value
    });
    const _route = shallowRef(router.resolve(initialURL));
    const syncCurrentRoute = () => {
      _route.value = router.currentRoute.value;
    };
    nuxtApp.hook("page:finish", syncCurrentRoute);
    router.afterEach((to, from) => {
      var _a2, _b2, _c, _d;
      if (((_b2 = (_a2 = to.matched[0]) == null ? void 0 : _a2.components) == null ? void 0 : _b2.default) === ((_d = (_c = from.matched[0]) == null ? void 0 : _c.components) == null ? void 0 : _d.default)) {
        syncCurrentRoute();
      }
    });
    const route = {};
    for (const key in _route.value) {
      Object.defineProperty(route, key, {
        get: () => _route.value[key]
      });
    }
    nuxtApp._route = shallowReactive(route);
    nuxtApp._middleware = nuxtApp._middleware || {
      global: [],
      named: {}
    };
    useError();
    try {
      if (true) {
        ;
        [__temp, __restore] = executeAsync(() => router.push(initialURL)), await __temp, __restore();
        ;
      }
      ;
      [__temp, __restore] = executeAsync(() => router.isReady()), await __temp, __restore();
      ;
    } catch (error2) {
      [__temp, __restore] = executeAsync(() => nuxtApp.runWithContext(() => showError(error2))), await __temp, __restore();
    }
    const initialLayout = useState("_layout");
    router.beforeEach(async (to, from) => {
      var _a2, _b2;
      to.meta = reactive(to.meta);
      if (nuxtApp.isHydrating && initialLayout.value && !isReadonly(to.meta.layout)) {
        to.meta.layout = initialLayout.value;
      }
      nuxtApp._processingMiddleware = true;
      if (!((_a2 = nuxtApp.ssrContext) == null ? void 0 : _a2.islandContext)) {
        const middlewareEntries = /* @__PURE__ */ new Set([...globalMiddleware, ...nuxtApp._middleware.global]);
        for (const component of to.matched) {
          const componentMiddleware = component.meta.middleware;
          if (!componentMiddleware) {
            continue;
          }
          if (Array.isArray(componentMiddleware)) {
            for (const entry2 of componentMiddleware) {
              middlewareEntries.add(entry2);
            }
          } else {
            middlewareEntries.add(componentMiddleware);
          }
        }
        for (const entry2 of middlewareEntries) {
          const middleware = typeof entry2 === "string" ? nuxtApp._middleware.named[entry2] || await ((_b2 = namedMiddleware[entry2]) == null ? void 0 : _b2.call(namedMiddleware).then((r) => r.default || r)) : entry2;
          if (!middleware) {
            throw new Error(`Unknown route middleware: '${entry2}'.`);
          }
          const result = await nuxtApp.runWithContext(() => middleware(to, from));
          {
            if (result === false || result instanceof Error) {
              const error2 = result || createError$1({
                statusCode: 404,
                statusMessage: `Page Not Found: ${initialURL}`
              });
              await nuxtApp.runWithContext(() => showError(error2));
              return false;
            }
          }
          if (result || result === false) {
            return result;
          }
        }
      }
    });
    router.onError(() => {
      delete nuxtApp._processingMiddleware;
    });
    router.afterEach(async (to, _from, failure) => {
      var _a2;
      delete nuxtApp._processingMiddleware;
      if ((failure == null ? void 0 : failure.type) === 4) {
        return;
      }
      if (to.matched.length === 0 && !((_a2 = nuxtApp.ssrContext) == null ? void 0 : _a2.islandContext)) {
        await nuxtApp.runWithContext(() => showError(createError$1({
          statusCode: 404,
          fatal: false,
          statusMessage: `Page not found: ${to.fullPath}`
        })));
      } else if (to.redirectedFrom && to.fullPath !== initialURL) {
        await nuxtApp.runWithContext(() => navigateTo(to.fullPath || "/"));
      }
    });
    nuxtApp.hooks.hookOnce("app:created", async () => {
      try {
        await router.replace({
          ...router.resolve(initialURL),
          name: void 0,
          // #4920, #4982
          force: true
        });
        router.options.scrollBehavior = routerOptions.scrollBehavior;
      } catch (error2) {
        await nuxtApp.runWithContext(() => showError(error2));
      }
    });
    return { provide: { router } };
  }
});
function resolveUnref(r) {
  return typeof r === "function" ? r() : unref(r);
}
function resolveUnrefHeadInput(ref2, lastKey = "") {
  if (ref2 instanceof Promise)
    return ref2;
  const root = resolveUnref(ref2);
  if (!ref2 || !root)
    return root;
  if (Array.isArray(root))
    return root.map((r) => resolveUnrefHeadInput(r, lastKey));
  if (typeof root === "object") {
    return Object.fromEntries(
      Object.entries(root).map(([k, v]) => {
        if (k === "titleTemplate" || k.startsWith("on"))
          return [k, unref(v)];
        return [k, resolveUnrefHeadInput(v, k)];
      })
    );
  }
  return root;
}
const Vue3 = version.startsWith("3");
const headSymbol = "usehead";
function injectHead() {
  return getCurrentInstance() && inject(headSymbol) || getActiveHead();
}
function vueInstall(head) {
  const plugin2 = {
    install(app) {
      if (Vue3) {
        app.config.globalProperties.$unhead = head;
        app.config.globalProperties.$head = head;
        app.provide(headSymbol, head);
      }
    }
  };
  return plugin2.install;
}
function createServerHead(options = {}) {
  const head = createServerHead$1({
    ...options,
    plugins: [
      VueReactiveUseHeadPlugin(),
      ...(options == null ? void 0 : options.plugins) || []
    ]
  });
  head.install = vueInstall(head);
  return head;
}
function VueReactiveUseHeadPlugin() {
  return defineHeadPlugin({
    hooks: {
      "entries:resolve": function(ctx) {
        for (const entry2 of ctx.entries)
          entry2.resolvedInput = resolveUnrefHeadInput(entry2.input);
      }
    }
  });
}
function clientUseHead(input, options = {}) {
  const head = injectHead();
  const deactivated = ref(false);
  const resolvedInput = ref({});
  watchEffect(() => {
    resolvedInput.value = deactivated.value ? {} : resolveUnrefHeadInput(input);
  });
  const entry2 = head.push(resolvedInput.value, options);
  watch(resolvedInput, (e) => {
    entry2.patch(e);
  });
  getCurrentInstance();
  return entry2;
}
function serverUseHead(input, options = {}) {
  const head = injectHead();
  return head.push(input, options);
}
function useHead(input, options = {}) {
  var _a;
  const head = injectHead();
  if (head) {
    const isBrowser = !!((_a = head.resolvedOptions) == null ? void 0 : _a.document);
    if (options.mode === "server" && isBrowser || options.mode === "client" && !isBrowser)
      return;
    return isBrowser ? clientUseHead(input, options) : serverUseHead(input, options);
  }
}
function definePayloadReducer(name, reduce) {
  {
    useNuxtApp().ssrContext._payloadReducers[name] = reduce;
  }
}
const reducers = {
  NuxtError: (data) => isNuxtError(data) && data.toJSON(),
  EmptyShallowRef: (data) => isRef(data) && isShallow(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  EmptyRef: (data) => isRef(data) && !data.value && (typeof data.value === "bigint" ? "0n" : JSON.stringify(data.value) || "_"),
  ShallowRef: (data) => isRef(data) && isShallow(data) && data.value,
  ShallowReactive: (data) => isReactive(data) && isShallow(data) && toRaw(data),
  Ref: (data) => isRef(data) && data.value,
  Reactive: (data) => isReactive(data) && toRaw(data)
};
const revive_payload_server_eJ33V7gbc6 = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:revive-payload:server",
  setup() {
    for (const reducer in reducers) {
      definePayloadReducer(reducer, reducers[reducer]);
    }
  }
});
const components_plugin_KR1HBZs4kY = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:global-components"
});
const unhead_KgADcZ0jPj = /* @__PURE__ */ defineNuxtPlugin({
  name: "nuxt:head",
  setup(nuxtApp) {
    const createHead = createServerHead;
    const head = createHead();
    head.push(appHead);
    nuxtApp.vueApp.use(head);
    {
      nuxtApp.ssrContext.renderMeta = async () => {
        const meta = await renderSSRHead(head);
        return {
          ...meta,
          bodyScriptsPrepend: meta.bodyTagsOpen,
          // resolves naming difference with NuxtMeta and Unhead
          bodyScripts: meta.bodyTags
        };
      };
    }
  }
});
function useRequestHeaders(include) {
  var _a;
  const headers = ((_a = useNuxtApp().ssrContext) == null ? void 0 : _a.event.node.req.headers) ?? {};
  if (!include) {
    return headers;
  }
  return Object.fromEntries(include.map((key) => key.toLowerCase()).filter((key) => headers[key]).map((key) => [key, headers[key]]));
}
function useRequestEvent(nuxtApp = useNuxtApp()) {
  var _a;
  return (_a = nuxtApp.ssrContext) == null ? void 0 : _a.event;
}
function useRequestFetch() {
  var _a;
  const event = (_a = useNuxtApp().ssrContext) == null ? void 0 : _a.event;
  return (event == null ? void 0 : event.$fetch) || globalThis.$fetch;
}
const makeCommonAuthState = () => {
  var _a;
  const data = useState("auth:data", () => void 0);
  const hasInitialSession = computed(() => !!data.value);
  const lastRefreshedAt = useState("auth:lastRefreshedAt", () => {
    if (hasInitialSession.value) {
      return /* @__PURE__ */ new Date();
    }
    return void 0;
  });
  const loading = useState("auth:loading", () => false);
  const status = computed(() => {
    if (loading.value) {
      return "loading";
    } else if (data.value) {
      return "authenticated";
    } else {
      return "unauthenticated";
    }
  });
  let baseURL2;
  const { origin, pathname, fullBaseUrl } = useRuntimeConfig().public.auth.computed;
  if (origin) {
    baseURL2 = fullBaseUrl;
  } else {
    const determinedOrigin = getURL((_a = useRequestEvent()) == null ? void 0 : _a.node.req, false);
    baseURL2 = joinURL(determinedOrigin, pathname);
  }
  return {
    data,
    loading,
    lastRefreshedAt,
    status,
    _internal: {
      baseURL: baseURL2
    }
  };
};
const useAuthState = () => makeCommonAuthState();
const getRequestURL = (includePath = true) => {
  var _a;
  return getURL((_a = useRequestEvent()) == null ? void 0 : _a.node.req, includePath);
};
const joinPathToApiURL = (path) => joinURL(useAuthState()._internal.baseURL, path);
const navigateToAuthPages = (href) => {
  const nuxtApp = useNuxtApp();
  {
    if (nuxtApp.ssrContext && nuxtApp.ssrContext.event) {
      return nuxtApp.callHook("app:redirected").then(() => sendRedirect(nuxtApp.ssrContext.event, href, 302));
    }
  }
  window.location.href = href;
  if (href.includes("#")) {
    window.location.reload();
  }
  const router = nuxtApp.$router;
  const waitForNavigationWithFallbackToRouter = new Promise((resolve) => setTimeout(resolve, 60 * 1e3)).then(() => router.push(href));
  return waitForNavigationWithFallbackToRouter;
};
const determineCallbackUrl = (authConfig, getOriginalTargetPath) => {
  var _a;
  const authConfigCallbackUrl = (_a = authConfig.globalAppMiddleware) == null ? void 0 : _a.addDefaultCallbackUrl;
  if (typeof authConfigCallbackUrl !== "undefined") {
    if (typeof authConfigCallbackUrl === "string") {
      return authConfigCallbackUrl;
    }
    if (typeof authConfigCallbackUrl === "boolean") {
      if (authConfigCallbackUrl) {
        return getOriginalTargetPath();
      }
    }
  }
};
const navigateToAuthPageWN = (nuxt, href) => callWithNuxt(nuxt, navigateToAuthPages, [href]);
const getRequestURLWN = (nuxt) => callWithNuxt(nuxt, getRequestURL);
const joinPathToApiURLWN = (nuxt, path) => callWithNuxt(nuxt, joinPathToApiURL, [path]);
const makeCWN = (func) => (nuxt) => callWithNuxt(nuxt, func);
const _fetch = async (nuxt, path, fetchOptions) => {
  const joinedPath = await callWithNuxt(nuxt, () => joinPathToApiURL(path));
  try {
    return $fetch(joinedPath, fetchOptions);
  } catch (error) {
    console.error("Error in `nuxt-auth`-app-side data fetching: Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`? Error is:");
    console.error(error);
    throw new Error("Runtime error, checkout the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem");
  }
};
const isNonEmptyObject = (obj) => typeof obj === "object" && Object.keys(obj).length > 0;
process.env.NODE_ENV === "production";
const useTypedBackendConfig = (runtimeConfig, type) => {
  if (runtimeConfig.public.auth.provider.type === type) {
    return runtimeConfig.public.auth.provider;
  }
  throw new Error("RuntimeError: Type must match at this point");
};
const getRequestCookies = async (nuxt) => {
  const { cookie } = await callWithNuxt(nuxt, () => useRequestHeaders(["cookie"]));
  if (cookie) {
    return { cookie };
  }
  return {};
};
const getCsrfToken = async () => {
  const nuxt = useNuxtApp();
  const headers = await getRequestCookies(nuxt);
  return _fetch(nuxt, "csrf", { headers }).then((response) => response.csrfToken);
};
const getCsrfTokenWithNuxt = makeCWN(getCsrfToken);
const signIn = async (provider, options, authorizationParams) => {
  const nuxt = useNuxtApp();
  const configuredProviders = await getProviders();
  if (!configuredProviders) {
    const errorUrl = await joinPathToApiURLWN(nuxt, "error");
    return navigateToAuthPageWN(nuxt, errorUrl);
  }
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig);
  const backendConfig = useTypedBackendConfig(runtimeConfig, "authjs");
  if (typeof provider === "undefined") {
    provider = backendConfig.defaultProvider;
  }
  const { redirect = true } = options ?? {};
  let { callbackUrl } = options ?? {};
  if (typeof callbackUrl === "undefined" && backendConfig.addDefaultCallbackUrl) {
    callbackUrl = await determineCallbackUrl(runtimeConfig.public.auth, () => getRequestURLWN(nuxt));
  }
  const signinUrl = await joinPathToApiURLWN(nuxt, "signin");
  const queryParams = callbackUrl ? `?${new URLSearchParams({ callbackUrl })}` : "";
  const hrefSignInAllProviderPage = `${signinUrl}${queryParams}`;
  if (!provider) {
    return navigateToAuthPageWN(nuxt, hrefSignInAllProviderPage);
  }
  const selectedProvider = configuredProviders[provider];
  if (!selectedProvider) {
    return navigateToAuthPageWN(nuxt, hrefSignInAllProviderPage);
  }
  const isCredentials = selectedProvider.type === "credentials";
  const isEmail = selectedProvider.type === "email";
  const isSupportingReturn = isCredentials || isEmail;
  let action = "signin";
  if (isCredentials) {
    action = "callback";
  }
  const csrfToken = await callWithNuxt(nuxt, getCsrfToken);
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    ...await getRequestCookies(nuxt)
  };
  const body = new URLSearchParams({
    ...options,
    csrfToken,
    callbackUrl,
    json: true
  });
  const fetchSignIn = () => _fetch(nuxt, `${action}/${provider}`, {
    method: "post",
    params: authorizationParams,
    headers,
    body
  }).catch((error2) => error2.data);
  const data = await callWithNuxt(nuxt, fetchSignIn);
  if (redirect || !isSupportingReturn) {
    const href = data.url ?? callbackUrl;
    return navigateToAuthPageWN(nuxt, href);
  }
  const error = new URL(data.url).searchParams.get("error");
  await getSessionWithNuxt(nuxt);
  return {
    error,
    status: 200,
    ok: true,
    url: error ? null : data.url
  };
};
const getProviders = () => _fetch(useNuxtApp(), "providers");
const getSession = async (getSessionOptions) => {
  const nuxt = useNuxtApp();
  const callbackUrlFallback = await getRequestURLWN(nuxt);
  const { required, callbackUrl, onUnauthenticated } = defu(getSessionOptions || {}, {
    required: false,
    callbackUrl: void 0,
    onUnauthenticated: () => signIn(void 0, {
      callbackUrl: (getSessionOptions == null ? void 0 : getSessionOptions.callbackUrl) || callbackUrlFallback
    })
  });
  const { data, status, loading, lastRefreshedAt } = await callWithNuxt(nuxt, useAuthState);
  const onError = () => {
    loading.value = false;
  };
  const headers = await getRequestCookies(nuxt);
  return _fetch(nuxt, "session", {
    onResponse: ({ response }) => {
      const sessionData = response._data;
      {
        const setCookieValue = response.headers.get("set-cookie");
        if (setCookieValue && nuxt.ssrContext) {
          appendHeader(nuxt.ssrContext.event, "set-cookie", setCookieValue);
        }
      }
      data.value = isNonEmptyObject(sessionData) ? sessionData : null;
      loading.value = false;
      if (required && status.value === "unauthenticated") {
        return onUnauthenticated();
      }
      return sessionData;
    },
    onRequest: ({ options }) => {
      lastRefreshedAt.value = /* @__PURE__ */ new Date();
      options.params = {
        ...options.params || {},
        callbackUrl: callbackUrl || callbackUrlFallback
      };
    },
    onRequestError: onError,
    onResponseError: onError,
    headers
  });
};
const getSessionWithNuxt = makeCWN(getSession);
const signOut = async (options) => {
  const nuxt = useNuxtApp();
  const requestURL = await getRequestURLWN(nuxt);
  const { callbackUrl = requestURL, redirect = true } = options ?? {};
  const csrfToken = await getCsrfTokenWithNuxt(nuxt);
  if (!csrfToken) {
    throw createError({ statusCode: 400, statusMessage: "Could not fetch CSRF Token for signing out" });
  }
  const callbackUrlFallback = requestURL;
  const signoutData = await _fetch(nuxt, "signout", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    onRequest: ({ options: options2 }) => {
      options2.body = new URLSearchParams({
        csrfToken,
        callbackUrl: callbackUrl || callbackUrlFallback,
        json: "true"
      });
    }
  }).catch((error) => error.data);
  if (redirect) {
    const url = signoutData.url ?? callbackUrl;
    return navigateToAuthPageWN(nuxt, url);
  }
  await getSessionWithNuxt(nuxt);
  return signoutData;
};
const useAuth = () => {
  const {
    data,
    status,
    lastRefreshedAt
  } = useAuthState();
  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt)
  };
  const actions = {
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut
  };
  return {
    ...actions,
    ...getters
  };
};
const authMiddleware = /* @__PURE__ */ defineNuxtRouteMiddleware((to) => {
  const metaAuth = to.meta.auth;
  if (metaAuth === false) {
    return;
  }
  const authConfig = useRuntimeConfig().public.auth;
  const { status, signIn: signIn2 } = useAuth();
  const isGuestMode = typeof metaAuth === "object" && metaAuth.unauthenticatedOnly;
  if (isGuestMode && status.value === "unauthenticated") {
    return;
  }
  if (typeof metaAuth === "object" && !metaAuth.unauthenticatedOnly) {
    return;
  }
  if (status.value === "authenticated") {
    if (isGuestMode) {
      return navigateTo(metaAuth.navigateAuthenticatedTo ?? "/");
    }
    return;
  }
  if (authConfig.globalAppMiddleware.allow404WithoutAuth) {
    const matchedRoute = to.matched.length > 0;
    if (!matchedRoute) {
      return;
    }
  }
  if (authConfig.provider.type === "authjs") {
    const signInOptions = { error: "SessionRequired", callbackUrl: determineCallbackUrl(authConfig, () => to.path) };
    return signIn2(void 0, signInOptions);
  } else {
    return navigateTo(authConfig.provider.pages.login);
  }
});
const auth = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  default: authMiddleware
});
const plugin_AOuQ1DYzjk = /* @__PURE__ */ defineNuxtPlugin(async (nuxtApp) => {
  let __temp, __restore;
  const { data, lastRefreshedAt } = useAuthState();
  const { getSession: getSession2 } = useAuth();
  if (typeof data.value === "undefined") {
    [__temp, __restore] = executeAsync(() => getSession2()), await __temp, __restore();
  }
  const { enableRefreshOnWindowFocus, enableRefreshPeriodically } = useRuntimeConfig().public.auth.session;
  const visibilityHandler = () => {
    if (enableRefreshOnWindowFocus && document.visibilityState === "visible") {
      getSession2();
    }
  };
  let refetchIntervalTimer;
  nuxtApp.hook("app:mounted", () => {
    document.addEventListener("visibilitychange", visibilityHandler, false);
    if (enableRefreshPeriodically !== false) {
      const intervalTime = enableRefreshPeriodically === true ? 1e3 : enableRefreshPeriodically;
      refetchIntervalTimer = setInterval(() => {
        if (data.value) {
          getSession2();
        }
      }, intervalTime);
    }
  });
  const _unmount = nuxtApp.vueApp.unmount;
  nuxtApp.vueApp.unmount = function() {
    document.removeEventListener("visibilitychange", visibilityHandler, false);
    clearInterval(refetchIntervalTimer);
    lastRefreshedAt.value = void 0;
    data.value = void 0;
    _unmount();
  };
  const { globalAppMiddleware } = useRuntimeConfig().public.auth;
  if (globalAppMiddleware === true || globalAppMiddleware.isEnabled) {
    addRouteMiddleware("auth", authMiddleware, {
      global: true
    });
  }
});
const plugins = [
  plugin,
  revive_payload_server_eJ33V7gbc6,
  components_plugin_KR1HBZs4kY,
  unhead_KgADcZ0jPj,
  plugin_AOuQ1DYzjk
];
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "NavBar",
  __ssrInlineRender: true,
  setup(__props) {
    const { status, data, signOut: signOut2 } = useAuth();
    console.log("!!! ", { status: status.value, data: data.value });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "navbar" }, _attrs))} data-v-a6cccd77> Hi this is navbar `);
      if (unref(status) === "authenticated") {
        _push(`<button class="btn btn-secondary" data-v-a6cccd77>Log out</button>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
    };
  }
});
const NavBar_vue_vue_type_style_index_0_scoped_a6cccd77_lang = "";
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/NavBar.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_0 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-a6cccd77"]]);
const interpolatePath = (route, match) => {
  return match.path.replace(/(:\w+)\([^)]+\)/g, "$1").replace(/(:\w+)[?+*]/g, "$1").replace(/:\w+/g, (r) => {
    var _a;
    return ((_a = route.params[r.slice(1)]) == null ? void 0 : _a.toString()) || "";
  });
};
const generateRouteKey = (routeProps, override) => {
  const matchedRoute = routeProps.route.matched.find((m) => {
    var _a;
    return ((_a = m.components) == null ? void 0 : _a.default) === routeProps.Component.type;
  });
  const source = override ?? (matchedRoute == null ? void 0 : matchedRoute.meta.key) ?? (matchedRoute && interpolatePath(routeProps.route, matchedRoute));
  return typeof source === "function" ? source(routeProps.route) : source;
};
const wrapInKeepAlive = (props, children) => {
  return { default: () => children };
};
const RouteProvider = /* @__PURE__ */ defineComponent({
  name: "RouteProvider",
  props: {
    vnode: {
      type: Object,
      required: true
    },
    route: {
      type: Object,
      required: true
    },
    vnodeRef: Object,
    renderKey: String,
    trackRootNodes: Boolean
  },
  setup(props) {
    const previousKey = props.renderKey;
    const previousRoute = props.route;
    const route = {};
    for (const key in props.route) {
      Object.defineProperty(route, key, {
        get: () => previousKey === props.renderKey ? props.route[key] : previousRoute[key]
      });
    }
    provide(PageRouteSymbol, shallowReactive(route));
    return () => {
      return h(props.vnode, { ref: props.vnodeRef });
    };
  }
});
const _wrapIf = (component, props, slots) => {
  props = props === true ? {} : props;
  return { default: () => {
    var _a;
    return props ? h(component, props, slots) : (_a = slots.default) == null ? void 0 : _a.call(slots);
  } };
};
const __nuxt_component_1 = /* @__PURE__ */ defineComponent({
  name: "NuxtPage",
  inheritAttrs: false,
  props: {
    name: {
      type: String
    },
    transition: {
      type: [Boolean, Object],
      default: void 0
    },
    keepalive: {
      type: [Boolean, Object],
      default: void 0
    },
    route: {
      type: Object
    },
    pageKey: {
      type: [Function, String],
      default: null
    }
  },
  setup(props, { attrs, expose }) {
    const nuxtApp = useNuxtApp();
    const pageRef = ref();
    inject(PageRouteSymbol, null);
    expose({ pageRef });
    inject(LayoutMetaSymbol, null);
    let vnode;
    return () => {
      return h(RouterView, { name: props.name, route: props.route, ...attrs }, {
        default: (routeProps) => {
          if (!routeProps.Component) {
            return;
          }
          const key = generateRouteKey(routeProps, props.pageKey);
          const done = nuxtApp.deferHydration();
          const hasTransition = !!(props.transition ?? routeProps.route.meta.pageTransition ?? appPageTransition);
          const transitionProps = hasTransition && _mergeTransitionProps([
            props.transition,
            routeProps.route.meta.pageTransition,
            appPageTransition,
            { onAfterLeave: () => {
              nuxtApp.callHook("page:transition:finish", routeProps.Component);
            } }
          ].filter(Boolean));
          vnode = _wrapIf(
            Transition,
            hasTransition && transitionProps,
            wrapInKeepAlive(
              props.keepalive ?? routeProps.route.meta.keepalive ?? appKeepalive,
              h(Suspense, {
                suspensible: true,
                onPending: () => nuxtApp.callHook("page:start", routeProps.Component),
                onResolve: () => {
                  nextTick(() => nuxtApp.callHook("page:finish", routeProps.Component).finally(done));
                }
              }, {
                // @ts-expect-error seems to be an issue in vue types
                default: () => h(RouteProvider, {
                  key,
                  vnode: routeProps.Component,
                  route: routeProps.route,
                  renderKey: key,
                  trackRootNodes: hasTransition,
                  vnodeRef: pageRef
                })
              })
            )
          ).default();
          return vnode;
        }
      });
    };
  }
});
function _toArray(val) {
  return Array.isArray(val) ? val : val ? [val] : [];
}
function _mergeTransitionProps(routeProps) {
  const _props = routeProps.map((prop) => ({
    ...prop,
    onAfterLeave: _toArray(prop.onAfterLeave)
  }));
  return defu(..._props);
}
const _sfc_main$2 = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_NavBar = __nuxt_component_0;
  const _component_NuxtPage = __nuxt_component_1;
  _push(`<!--[-->`);
  _push(ssrRenderComponent(_component_NavBar, null, null, _parent));
  _push(ssrRenderComponent(_component_NuxtPage, null, null, _parent));
  _push(`<!--]-->`);
}
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("app.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const AppComponent = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["ssrRender", _sfc_ssrRender]]);
const _sfc_main$1 = {
  __name: "nuxt-error-page",
  __ssrInlineRender: true,
  props: {
    error: Object
  },
  setup(__props) {
    const props = __props;
    const _error = props.error;
    (_error.stack || "").split("\n").splice(1).map((line) => {
      const text = line.replace("webpack:/", "").replace(".vue", ".js").trim();
      return {
        text,
        internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
      };
    }).map((i) => `<span class="stack${i.internal ? " internal" : ""}">${i.text}</span>`).join("\n");
    const statusCode = Number(_error.statusCode || 500);
    const is404 = statusCode === 404;
    const statusMessage = _error.statusMessage ?? (is404 ? "Page Not Found" : "Internal Server Error");
    const description = _error.message || _error.toString();
    const stack = void 0;
    const _Error404 = /* @__PURE__ */ defineAsyncComponent(() => import("./_nuxt/error-404-9fd56e46.js").then((r) => r.default || r));
    const _Error = /* @__PURE__ */ defineAsyncComponent(() => import("./_nuxt/error-500-2b8d35be.js").then((r) => r.default || r));
    const ErrorTemplate = is404 ? _Error404 : _Error;
    return (_ctx, _push, _parent, _attrs) => {
      _push(ssrRenderComponent(unref(ErrorTemplate), mergeProps({ statusCode: unref(statusCode), statusMessage: unref(statusMessage), description: unref(description), stack: unref(stack) }, _attrs), null, _parent));
    };
  }
};
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-error-page.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const ErrorComponent = _sfc_main$1;
const _sfc_main = {
  __name: "nuxt-root",
  __ssrInlineRender: true,
  setup(__props) {
    const IslandRenderer = /* @__PURE__ */ defineAsyncComponent(() => import("./_nuxt/island-renderer-0ac45f03.js").then((r) => r.default || r));
    const nuxtApp = useNuxtApp();
    nuxtApp.deferHydration();
    nuxtApp.ssrContext.url;
    const SingleRenderer = false;
    provide(PageRouteSymbol, useRoute());
    nuxtApp.hooks.callHookWith((hooks) => hooks.map((hook) => hook()), "vue:setup");
    const error = useError();
    onErrorCaptured((err, target, info) => {
      nuxtApp.hooks.callHook("vue:error", err, target, info).catch((hookError) => console.error("[nuxt] Error in `vue:error` hook", hookError));
      {
        const p = nuxtApp.runWithContext(() => showError(err));
        onServerPrefetch(() => p);
        return false;
      }
    });
    const { islandContext } = nuxtApp.ssrContext;
    return (_ctx, _push, _parent, _attrs) => {
      ssrRenderSuspense(_push, {
        default: () => {
          if (unref(error)) {
            _push(ssrRenderComponent(unref(ErrorComponent), { error: unref(error) }, null, _parent));
          } else if (unref(islandContext)) {
            _push(ssrRenderComponent(unref(IslandRenderer), { context: unref(islandContext) }, null, _parent));
          } else if (unref(SingleRenderer)) {
            ssrRenderVNode(_push, createVNode(resolveDynamicComponent(unref(SingleRenderer)), null, null), _parent);
          } else {
            _push(ssrRenderComponent(unref(AppComponent), null, null, _parent));
          }
        },
        _: 1
      });
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("node_modules/nuxt/dist/app/components/nuxt-root.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const RootComponent = _sfc_main;
if (!globalThis.$fetch) {
  globalThis.$fetch = $fetch$1.create({
    baseURL: baseURL()
  });
}
let entry;
{
  entry = async function createNuxtAppServer(ssrContext) {
    const vueApp = createApp(RootComponent);
    const nuxt = createNuxtApp({ vueApp, ssrContext });
    try {
      await applyPlugins(nuxt, plugins);
      await nuxt.hooks.callHook("app:created", vueApp);
    } catch (err) {
      await nuxt.hooks.callHook("app:error", err);
      nuxt.payload.error = nuxt.payload.error || err;
    }
    if (ssrContext == null ? void 0 : ssrContext._renderResponse) {
      throw new Error("skipping render");
    }
    return vueApp;
  };
}
const entry$1 = (ctx) => entry(ctx);
export {
  _export_sfc as _,
  useHead as a,
  useAuth as b,
  createError as c,
  useNuxtApp as d,
  entry$1 as default,
  useRequestFetch as e,
  navigateTo as n,
  useRouter as u
};
//# sourceMappingURL=server.mjs.map
