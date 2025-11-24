/**
 * Performance utilities for Bolt
 * Includes lazy loading helpers, performance monitoring, and optimization utils
 */

import { lazy, type ComponentType } from 'react';

/**
 * Lazy load a component with preload capability
 * This allows us to preload components before they're needed
 */
export function lazyWithPreload<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  const component = lazy(factory);

  // Add preload method
  (component as any).preload = factory;

  return component as typeof component & { preload: typeof factory };
}

/**
 * Debounced resize observer for performance
 */
export function createDebouncedResizeObserver(callback: (entries: ResizeObserverEntry[]) => void, delay: number = 100) {
  let timeoutId: NodeJS.Timeout;

  return new ResizeObserver((entries) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(entries), delay);
  });
}

/**
 * Mark performance metrics
 */
export function markPerformance(name: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark);

      const measure = performance.getEntriesByName(name)[0];

      return measure?.duration || 0;
    } catch (e) {
      console.warn(`Failed to measure performance for ${name}:`, e);
      return 0;
    }
  }

  return 0;
}

/**
 * Get LCP (Largest Contentful Paint) metric
 */
export function observeLCP(callback: (lcp: number) => void) {
  if (typeof PerformanceObserver === 'undefined') {
    return undefined;
  }

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as any;
    callback(lastEntry?.renderTime || lastEntry?.loadTime || 0);
  });

  observer.observe({ entryTypes: ['largest-contentful-paint'] });

  return () => observer.disconnect();
}

/**
 * Get FID (First Input Delay) metric
 */
export function observeFID(callback: (fid: number) => void) {
  if (typeof PerformanceObserver === 'undefined') {
    return undefined;
  }

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry: any) => {
      callback(entry.processingStart - entry.startTime);
    });
  });

  observer.observe({ entryTypes: ['first-input'] });

  return () => observer.disconnect();
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Prefetch resources for future navigation
 */
export function prefetchResource(url: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}
