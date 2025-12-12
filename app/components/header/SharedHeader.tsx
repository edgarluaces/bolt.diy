import { Link, useNavigate, useLocation } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { themeStore, toggleTheme } from '~/lib/stores/theme';
import { isAuthenticatedStore, userStore, logout } from '~/lib/stores/auth';
import { useState, useEffect, useRef } from 'react';
import { preloadChatModule } from '~/utils/preloaders';

export function SharedHeader() {
  const theme = useStore(themeStore);
  const isAuthenticated = useStore(isAuthenticatedStore);
  const user = useStore(userStore);
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRegisterPopup, setShowRegisterPopup] = useState(false);
  const popupDismissedThisSession = useRef(false);

  // Show register popup after 1 second if not authenticated and on landing page
  useEffect(() => {
    // Only show on landing page (/)
    if (location.pathname !== '/') {
      setShowRegisterPopup(false);
      return undefined;
    }

    if (isAuthenticated) {
      setShowRegisterPopup(false);
      return undefined;
    }

    // Only check session memory, not localStorage
    if (popupDismissedThisSession.current) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setShowRegisterPopup(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, location.pathname]);

  const handleDismissPopup = () => {
    setShowRegisterPopup(false);

    // Only remember for this session (in memory), not in localStorage
    popupDismissedThisSession.current = true;
  };

  const handleRegisterClick = () => {
    setShowRegisterPopup(false);
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  const getAvatarDisplay = () => {
    if (!user || !user.avatar) {
      return <span className="i-ph:user-circle text-xl text-bolt-elements-textPrimary" />;
    }

    // Get initials from userName or email
    const getInitials = () => {
      if (user.userName && user.userName.length > 0) {
        return user.userName.charAt(0).toUpperCase();
      }

      if (user.email && user.email.length > 0) {
        return user.email.charAt(0).toUpperCase();
      }

      return 'U';
    };

    switch (user.avatar.type) {
      case 'icon':
        return <span className={`i-ph:${user.avatar.value}-duotone text-xl text-bolt-elements-textPrimary`} />;
      case 'image':
        return <img src={user.avatar.value} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />;
      case 'color': {
        // Validate that value is a valid color (starts with #)
        const bgColor = user.avatar.value?.startsWith('#') ? user.avatar.value : '#8a7bff';
        return (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: bgColor }}
          >
            {getInitials()}
          </div>
        );
      }
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
          <div className="relative">
            <Link
              to="/login"
              className="flex items-center justify-center w-10 h-10 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 transition"
              aria-label="Iniciar sesión"
              title="Iniciar sesión"
            >
              <span className="i-ph:user text-xl text-bolt-elements-textPrimary" />
            </Link>

            {/* Popup de registro */}
            {showRegisterPopup && (
              <>
                <div className="fixed inset-0 z-40 pointer-events-none" />
                <div className="absolute right-0 mt-3 w-72 bg-gradient-to-br from-bolt-elements-item-contentAccent to-purple-600 rounded-xl shadow-2xl p-4 z-50 animate-fade-in">
                  {/* Flecha apuntando al icono */}
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-bolt-elements-item-contentAccent rotate-45" />

                  {/* Botón cerrar */}
                  <button
                    onClick={handleDismissPopup}
                    className="absolute top-2 right-2 text-white/70 hover:text-white transition"
                    aria-label="Cerrar"
                  >
                    <span className="i-ph:x text-lg" />
                  </button>

                  {/* Contenido */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="i-ph:rocket-launch-duotone text-2xl text-white" />
                      <h3 className="text-lg font-bold text-white">¿Quieres empezar a crear?</h3>
                    </div>
                    <p className="text-white/90 text-sm mb-4">
                      Regístrate gratis ahora y empieza a construir tus proyectos web con IA.
                    </p>
                    <button
                      onClick={handleRegisterClick}
                      className="w-full py-2.5 px-4 bg-white text-bolt-elements-item-contentAccent font-semibold rounded-lg hover:bg-white/90 transition flex items-center justify-center gap-2"
                    >
                      <span className="i-ph:user-plus-duotone text-lg" />
                      Registrarme gratis
                    </button>
                    <p className="text-white/60 text-xs text-center mt-2">Sin tarjeta de crédito requerida</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
