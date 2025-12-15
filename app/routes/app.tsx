import { json, type MetaFunction } from '@remix-run/cloudflare';
import { lazy, Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';

// Lazy load ALL heavy components to reduce initial bundle size
const Chat = lazy(() => import('~/components/chat/Chat.client').then((m) => ({ default: m.Chat })));
const BaseChat = lazy(() => import('~/components/chat/BaseChat').then((m) => ({ default: m.BaseChat })));
const Header = lazy(() => import('~/components/header/Header').then((m) => ({ default: m.Header })));
const SharedHeader = lazy(() => import('~/components/header/SharedHeader').then((m) => ({ default: m.SharedHeader })));
const BackgroundRays = lazy(() => import('~/components/ui/BackgroundRays'));

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="i-svg-spinners:90-ring-with-bg text-4xl text-bolt-elements-item-contentAccent" />
        <p className="text-bolt-elements-textSecondary">Cargando...</p>
      </div>
    </div>
  );
}

export default function AppRoute() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <BackgroundRays />
        <SharedHeader />
        <Header />
        <ClientOnly
          fallback={
            <Suspense fallback={<LoadingFallback />}>
              <BaseChat />
            </Suspense>
          }
        >
          {() => (
            <Suspense
              fallback={
                <Suspense fallback={<LoadingFallback />}>
                  <BaseChat />
                </Suspense>
              }
            >
              <Chat />
            </Suspense>
          )}
        </ClientOnly>
      </div>
    </Suspense>
  );
}
