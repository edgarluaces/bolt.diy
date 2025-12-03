import { useEffect, useRef } from 'react';

/**
 * Hook to prefetch routes when they're about to enter the viewport
 * This provides a balance between aggressive prefetching and bandwidth conservation
 */
export function useViewportPrefetch(prefetchFn: () => void, enabled = true) {
  const hasPreloaded = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || hasPreloaded.current || !elementRef.current) {
      return undefined;
    }

    // Use IntersectionObserver to detect when element is approaching viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Prefetch when element is within 200px of viewport
          if (entry.isIntersecting && !hasPreloaded.current) {
            hasPreloaded.current = true;
            prefetchFn();
          }
        });
      },
      {
        // Start prefetching when element is 200px away from viewport
        rootMargin: '200px',
      },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [prefetchFn, enabled]);

  return elementRef;
}
