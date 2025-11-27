import { Link, useNavigate } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { themeStore, toggleTheme } from '~/lib/stores/theme';
import { isAuthenticatedStore, userStore, logout } from '~/lib/stores/auth';
import { useState } from 'react';
import { preloadChatModule } from '~/utils/preloaders';

export function SharedHeader() {
  const theme = useStore(themeStore);
  const isAuthenticated = useStore(isAuthenticatedStore);
  const user = useStore(userStore);
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const getAvatarDisplay = () => {
    if (!user || !user.avatar) {
      return <span className="i-ph:user-circle text-xl text-bolt-elements-textPrimary" />;
    }

    switch (user.avatar.type) {
      case 'icon':
        return <span className={`i-ph:${user.avatar.value}-duotone text-xl text-bolt-elements-textPrimary`} />;
      case 'image':
        return <img src={user.avatar.value} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />;
      case 'color':
        return (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: user.avatar.value }}
          >
            {user.userName?.charAt(0).toUpperCase() || 'U'}
          </div>
        );
      default:
        return <span className="i-ph:user-circle text-xl text-bolt-elements-textPrimary" />;
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 z-50">
      {/* Botón Inicio - Izquierda */}
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
        <span className="i-ph:sparkle-duotone text-bolt-elements-item-contentAccent text-2xl" />
        <h1 className="text-xl font-bold text-bolt-elements-textPrimary">FlashWeb</h1>
      </Link>

      {/* Centro - Dashboard y Mi Espacio Personal */}
      {isAuthenticated && (
        <div className="flex items-center gap-6">
          <Link
            to="/app"
            prefetch="intent"
            onMouseEnter={() => preloadChatModule()}
            onFocus={() => preloadChatModule()}
            className="text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent transition font-bold"
          >
            Dashboard
          </Link>
          <Link
            to="/space"
            className="text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent transition font-bold"
          >
            Mi Espacio Personal
          </Link>
        </div>
      )}

      {/* Spacer cuando no está autenticado */}
      {!isAuthenticated && <div className="flex-1" />}

      {/* Derecha - Controles */}
      <div className="flex items-center gap-3">
        {/* Toggle Tema */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 transition"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {theme === 'dark' ? (
            <span className="i-ph:sun-duotone text-xl text-bolt-elements-textPrimary" />
          ) : (
            <span className="i-ph:moon-duotone text-xl text-bolt-elements-textPrimary" />
          )}
        </button>

        {/* Botón Usuario/Login con menú desplegable */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 transition"
              aria-label="Menú de usuario"
            >
              {getAvatarDisplay()}
            </button>

            {/* Menú desplegable */}
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-bolt-elements-borderColor">
                    <p className="text-sm font-semibold text-bolt-elements-textPrimary">{user?.userName}</p>
                    <p className="text-xs text-bolt-elements-textSecondary">{user?.email}</p>
                  </div>
                  <Link
                    to="/app"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="i-ph:squares-four-duotone text-lg" />
                    Dashboard
                  </Link>
                  <Link
                    to="/space"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-3 transition"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="i-ph:clock-counter-clockwise-duotone text-lg" />
                    Mi Espacio Personal
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-bolt-elements-background-depth-3 transition"
                  >
                    <span className="i-ph:sign-out-duotone text-lg" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 transition"
            aria-label="Iniciar sesión"
            title="Iniciar sesión"
          >
            <span className="i-ph:user text-xl text-bolt-elements-textPrimary" />
          </Link>
        )}
      </div>
    </header>
  );
}
