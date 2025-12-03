import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { isAuthenticatedStore } from '~/lib/stores/auth';
import { preloadAllCriticalRoutes } from '~/utils/preloaders';

/**
 * RoutePreloader component
 * Preloads all critical routes in the background after initial page load
 * This eliminates navigation lag by warming up route chunks ahead of time
 */
export function RoutePreloader() {
  const isAuthenticated = useStore(isAuthenticatedStore);

  useEffect(() => {
    // Wait 2 seconds after mount to avoid interfering with initial page load
    const timeoutId = setTimeout(() => {
      if (isAuthenticated) {
        // User is authenticated, preload all dashboard routes
        preloadAllCriticalRoutes();
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated]);

  // This component doesn't render anything
  return null;
}
