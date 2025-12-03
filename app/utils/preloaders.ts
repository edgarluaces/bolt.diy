/*
 * Lightweight preloader utilities for improving navigation performance
 * These functions preload route modules to eliminate navigation lag
 */

export async function preloadChatModule() {
  // Warm up the chat module chunk ahead of navigation
  try {
    await import('~/components/chat/Chat.client');
  } catch {
    // Ignore failures silently; preloading is best-effort
  }
}

export async function preloadSpaceModule() {
  // Preload Mi Espacio Personal components
  try {
    await import('~/routes/space');
  } catch {
    // Best-effort preloading
  }
}

export async function preloadProfileModule() {
  // Preload Profile page components
  try {
    await import('~/routes/profile');
  } catch {
    // Best-effort preloading
  }
}

export async function preloadLoginModule() {
  // Preload Login page components
  try {
    await import('~/routes/login');
  } catch {
    // Best-effort preloading
  }
}

export async function preloadDashboardModule() {
  // Preload entire Dashboard route (app.tsx + Chat)
  try {
    await Promise.all([import('~/routes/app'), import('~/components/chat/Chat.client')]);
  } catch {
    // Best-effort preloading
  }
}

// Preload all critical routes for instant navigation
export async function preloadAllCriticalRoutes() {
  try {
    await Promise.all([preloadDashboardModule(), preloadSpaceModule(), preloadProfileModule(), preloadLoginModule()]);
  } catch {
    // Best-effort preloading
  }
}
