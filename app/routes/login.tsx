import { useState } from 'react';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useNavigate } from '@remix-run/react';
import { SharedHeader } from '~/components/header/SharedHeader';
import { login, register } from '~/lib/stores/auth';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Iniciar Sesión - FlashWeb' }, { name: 'description', content: 'Inicia sesión en FlashWeb' }];
};

export const loader = () => json({});

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    let success = false;

    if (mode === 'login') {
      success = login(email, password);
    } else {
      if (!userName) {
        setError('Por favor ingresa un nombre de usuario');
        return;
      }

      success = register(email, password, userName);
    }

    if (success) {
      navigate('/profile');
    } else {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <SharedHeader />

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-2xl shadow-lg p-8">
            {/* Título */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bolt-elements-item-contentAccent/10 mb-4">
                <span className="i-ph:user-circle-duotone text-4xl text-bolt-elements-item-contentAccent" />
              </div>
              <h1 className="text-2xl font-bold text-bolt-elements-textPrimary mb-2">
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h1>
              <p className="text-sm text-bolt-elements-textSecondary">
                {mode === 'login'
                  ? 'Accede a tu espacio personal en FlashWeb'
                  : 'Crea tu cuenta y comienza a usar FlashWeb'}
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-bolt-elements-textPrimary mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-bolt-elements-item-contentAccent text-white font-semibold hover:opacity-90 transition"
              >
                {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>

            {/* Toggle entre Login/Register */}
            <div className="mt-6 text-center text-sm">
              {mode === 'login' ? (
                <>
                  <span className="text-bolt-elements-textSecondary">¿No tienes cuenta? </span>
                  <button
                    onClick={() => setMode('register')}
                    className="text-bolt-elements-item-contentAccent hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Crear cuenta
                  </button>
                </>
              ) : (
                <>
                  <span className="text-bolt-elements-textSecondary">¿Ya tienes cuenta? </span>
                  <button
                    onClick={() => setMode('login')}
                    className="text-bolt-elements-item-contentAccent hover:underline font-semibold bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Iniciar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 px-6 py-4">
        <div className="max-w-md mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-bolt-elements-textSecondary">
          <div className="flex items-center gap-2">
            <span className="i-ph:copyright text-lg" />
            <span>2024 StackBlitz Labs</span>
          </div>
          <a
            href="https://stackblitz.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-bolt-elements-textPrimary hover:text-bolt-elements-item-contentAccent transition"
          >
            Powered by StackBlitz
          </a>
        </div>
      </footer>
    </div>
  );
}
