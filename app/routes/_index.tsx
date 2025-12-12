import { json, type MetaFunction } from '@remix-run/cloudflare';
import { Link } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { SharedHeader } from '~/components/header/SharedHeader';
import BackgroundRays from '~/components/ui/BackgroundRays';
import { isAuthenticatedStore } from '~/lib/stores/auth';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  const isAuthenticated = useStore(isAuthenticatedStore);

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <SharedHeader />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-bolt-elements-textTertiary border border-bolt-elements-borderColor/60 rounded-full px-3 py-1 mb-5">
            <span className="i-ph:sparkle-duotone text-bolt-elements-item-contentAccent text-sm" />
            Build fast with AI
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-bolt-elements-textPrimary">
            Diseña, construye y lanza
          </h1>
          <p className="mt-4 text-base md:text-lg text-bolt-elements-textSecondary">
            Un espacio pensado para crear interfaces y proyectos en segundos. Diseña y construye con herramientas
            modernas, vista previa al instante y flujos sencillos directamente en el navegador, sin instalaciones ni
            configuraciones complejas. Empieza ahora, itera a tu ritmo y continúa cuando quieras.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isAuthenticated ? '/app' : '/login'}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-bolt-elements-item-contentAccent text-white hover:opacity-90 transition shadow-lg"
            >
              Entrar ahora
              <span className="i-ph:arrow-right" />
            </Link>
          </div>

          <section id="features" className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5">
              <div className="i-ph:magic-wand-duotone text-xl text-bolt-elements-item-contentAccent" />
              <h3 className="mt-3 font-semibold text-bolt-elements-textPrimary">Genera con IA</h3>
              <p className="mt-1 text-sm text-bolt-elements-textSecondary">
                Convierte prompts en código y vistas listas para usar.
              </p>
            </div>
            <div className="rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5">
              <div className="i-ph:heartbeat-duotone text-xl text-bolt-elements-item-contentAccent" />
              <h3 className="mt-3 font-semibold text-bolt-elements-textPrimary">Previsualiza al instante</h3>
              <p className="mt-1 text-sm text-bolt-elements-textSecondary">
                Arranca servidores en el navegador y prueba cambios en vivo.
              </p>
            </div>
            <div className="rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5">
              <div className="i-ph:git-branch-duotone text-xl text-bolt-elements-item-contentAccent" />
              <h3 className="mt-3 font-semibold text-bolt-elements-textPrimary">Integra y despliega</h3>
              <p className="mt-1 text-sm text-bolt-elements-textSecondary">
                Listo para Git, CI/CD y despliegues con un clic.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer con créditos */}
      <footer className="border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-6 py-4">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-bolt-elements-textSecondary">
          <div className="flex items-center gap-2">
            <span className="i-ph:copyright text-lg" />
            <span>2024 StackBlitz Labs</span>
            <span className="hidden md:inline">•</span>
            <a
              href="https://github.com/stackblitz/bolt.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-item-contentAccent hover:underline"
            >
              MIT License
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://stackblitz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent transition"
            >
              StackBlitz
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
