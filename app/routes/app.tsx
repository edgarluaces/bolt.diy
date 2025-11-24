import { json, type MetaFunction } from '@remix-run/cloudflare';
import { lazy, Suspense } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Header } from '~/components/header/Header';
import { SharedHeader } from '~/components/header/SharedHeader';
import BackgroundRays from '~/components/ui/BackgroundRays';

// Lazy load Chat component to reduce initial bundle size
const Chat = lazy(() => import('~/components/chat/Chat.client').then((m) => ({ default: m.Chat })));

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

export default function AppRoute() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <SharedHeader />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => (
          <Suspense fallback={<BaseChat />}>
            <Chat />
          </Suspense>
        )}
      </ClientOnly>
    </div>
  );
}
