// Minimal hash-based router.
//
// Routes are registered as patterns like "/practice/:section"; the matching
// handler is called with the parsed params whenever the hash changes. A
// handler may return a cleanup function, which is invoked before the next
// route renders - pages that start timers, speech synthesis or global
// listeners rely on this to avoid leaking across navigation.

const routes = [];
let activeCleanup = null;
let fallbackPath = '/';
let enabled = false;

export function registerRoute(pattern, handler) {
  routes.push({ segments: pattern.split('/').filter(Boolean), handler });
}

function matchPath(path) {
  const parts = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.segments.length !== parts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < route.segments.length; i += 1) {
      const segment = route.segments[i];
      if (segment.startsWith(':')) params[segment.slice(1)] = decodeURIComponent(parts[i]);
      else if (segment !== parts[i]) { matched = false; break; }
    }
    if (matched) return { route, params };
  }
  return null;
}

export function currentPath() {
  return location.hash.replace(/^#/, '') || fallbackPath;
}

export function navigate(path, { replace = false } = {}) {
  if (location.hash === `#${path}`) {
    handleRoute();
    return;
  }
  if (replace) location.replace(`#${path}`);
  else location.hash = path;
}

function runCleanup() {
  if (!activeCleanup) return;
  try {
    activeCleanup();
  } catch (err) {
    // A failing cleanup must never block navigation.
  }
  activeCleanup = null;
}

async function handleRoute() {
  if (!enabled) return;
  const path = currentPath();
  const matched = matchPath(path) || matchPath(fallbackPath);
  if (!matched) return;
  runCleanup();
  const cleanup = await matched.route.handler(matched.params, path);
  if (typeof cleanup === 'function') activeCleanup = cleanup;
}

export function startRouter({ fallback = '/' } = {}) {
  fallbackPath = fallback;
  enabled = true;
  window.addEventListener('hashchange', handleRoute);
  if (!location.hash) navigate(fallback, { replace: true });
  else handleRoute();
}

export function stopRouter() {
  enabled = false;
  runCleanup();
}

export function refresh() {
  return handleRoute();
}
