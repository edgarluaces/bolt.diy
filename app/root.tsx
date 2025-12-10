import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { cssTransition, ToastContainer } from 'react-toastify';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },

  // Preload critical CSS
  { rel: 'preload', href: tailwindReset, as: 'style' },
  { rel: 'preload', href: globalStyles, as: 'style' },

  // Regular stylesheets
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },

  // DNS prefetch for faster font loading
  {
    rel: 'dns-prefetch',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',

    // Non-blocking font load
    media: 'print',
    onLoad: "this.media='all'",
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';
import { ErrorBoundary as ReactErrorBoundary } from './components/ui/ErrorBoundary';

// Patterns for transient DOM errors that should not show error overlay
const TRANSIENT_ERROR_PATTERNS = [
  'insertBefore',
  'removeChild',
  'appendChild',
  'replaceChild',
  'not a child',
  'no es un hijo',
];

function isTransientDOMError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error.message;
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()));
}

export default function App() {
  const theme = useStore(themeStore);

  useEffect(() => {
    // Suppress Vite error overlay for transient DOM errors
    const originalOnError = window.onerror;

    window.onerror = (message, source, lineno, colno, error) => {
      if (error && isTransientDOMError(error)) {
        console.log('🔇 [Global] Suprimiendo error overlay para error transitorio de DOM');
        return true; // Prevent default error handling
      }

      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error);
      }

      return false;
    };

    // Also handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && isTransientDOMError(event.reason)) {
        console.log('🔇 [Global] Suprimiendo unhandled rejection para error transitorio de DOM');
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // Initialize debug logging with improved error handling
    import('./utils/debugLogger')
      .then(({ debugLogger }) => {
        /*
         * The debug logger initializes itself and starts disabled by default
         * It will only start capturing when enableDebugMode() is called
         */
        const status = debugLogger.getStatus();
        logStore.logSystem('Debug logging ready', {
          initialized: status.initialized,
          capturing: status.capturing,
          enabled: status.enabled,
        });
      })
      .catch((error) => {
        logStore.logError('Failed to initialize debug logging', error);
      });

    return () => {
      window.onerror = originalOnError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ReactErrorBoundary>
      <Layout>
        <Outlet />
      </Layout>
    </ReactErrorBoundary>
  );
}

// Remix ErrorBoundary to catch errors at route level
export function ErrorBoundary() {
  const error = useRouteError();

  // Check if it's a transient DOM error
  const errorMessage = error instanceof Error ? error.message : String(error);
  const isTransient = TRANSIENT_ERROR_PATTERNS.some((pattern) =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase()),
  );

  console.group('🚨 [Remix ErrorBoundary] Error capturado');
  console.log('📍 Mensaje:', errorMessage);
  console.log('🔄 Es transitorio:', isTransient);
  console.groupEnd();

  // For transient DOM errors, try to recover by reloading
  if (isTransient) {
    console.log('🔄 [Remix ErrorBoundary] Intentando recuperar...');

    // Use useEffect equivalent for class-less component
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        console.log('🔄 [Remix ErrorBoundary] Recargando página...');
        window.location.reload();
      }, 100);
    }

    return (
      <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
        <div className="text-center">
          <div className="i-svg-spinners:90-ring-with-bg text-4xl text-bolt-elements-loader-progress mb-4"></div>
          <p className="text-bolt-elements-textSecondary">Recuperando...</p>
        </div>
      </div>
    );
  }

  // For other errors, show error page
  return (
    <div className="flex items-center justify-center h-screen bg-bolt-elements-background-depth-1">
      <div className="text-center max-w-md p-6">
        <div className="i-ph:warning-circle text-6xl text-bolt-elements-icon-error mb-4"></div>
        <h1 className="text-2xl font-bold text-bolt-elements-textPrimary mb-2">Error de aplicación</h1>
        <p className="text-bolt-elements-textSecondary mb-4">{errorMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-md hover:brightness-110"
        >
          Recargar página
        </button>
      </div>
    </div>
  );
}
