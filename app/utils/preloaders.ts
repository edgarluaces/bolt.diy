// Lightweight preloader utilities for improving navigation performance

export async function preloadChatModule() {
  // Warm up the chat module chunk ahead of navigation
  try {
    await import('~/components/chat/Chat.client');
  } catch {
    // Ignore failures silently; preloading is best-effort
  }
}
