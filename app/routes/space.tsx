import { useState, useEffect, useRef, useCallback } from 'react';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useNavigate } from '@remix-run/react';
import { useStore } from '@nanostores/react';
import { SharedHeader } from '~/components/header/SharedHeader';
import { isAuthenticatedStore, userStore, updateUserProfile, logout, changePassword } from '~/lib/stores/auth';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Mi Espacio Personal' }, { name: 'description', content: 'Gestiona tu perfil de usuario' }];
};

export const loader = () => json({});

export default function Space() {
  const navigate = useNavigate();
  const isAuthenticated = useStore(isAuthenticatedStore);
  const user = useStore(userStore);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [userName, setUserName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarType, setAvatarType] = useState<'image' | 'color'>('color');
  const [selectedColor, setSelectedColor] = useState('#8a7bff');
  const [imageUrl, setImageUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Cargar datos del usuario
  useEffect(() => {
    if (user) {
      setUserName(user.userName || '');
      setBio(user.bio || '');

      if (user.avatar) {
        // Forzar a color o imagen si viniera como icono
        const t = user.avatar.type === 'icon' ? 'color' : user.avatar.type;
        setAvatarType(t as 'image' | 'color');

        if (t === 'color') {
          setSelectedColor(user.avatar.value);
        } else if (t === 'image') {
          setImageUrl(user.avatar.value);
        }
      }

      // Mark initial load as complete after a short delay
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
    }
  }, [user]);

  // Auto-save function
  const autoSave = useCallback(() => {
    if (isInitialLoad.current) {
      return;
    }

    let avatarValue = '';

    if (avatarType === 'color') {
      avatarValue = selectedColor;
    } else if (avatarType === 'image') {
      avatarValue = imageUrl;
    }

    setSaveStatus('saving');

    updateUserProfile({
      userName,
      bio,
      avatar: {
        type: avatarType,
        value: avatarValue,
      },
    });

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 300);
  }, [userName, bio, avatarType, selectedColor, imageUrl]);

  // Debounced auto-save when any profile field changes
  useEffect(() => {
    if (isInitialLoad.current) {
      return undefined;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [userName, bio, avatarType, selectedColor, imageUrl, autoSave]);

  const colorPalette = [
    '#8a7bff',
    '#00d4ff',
    '#ff7bc8',
    '#ff6b6b',
    '#4ecb71',
    '#ffd93d',
    '#a78bfa',
    '#fb923c',
    '#ec4899',
    '#10b981',
    '#3b82f6',
    '#f97316',
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result as string;
        setImageUrl(result);
        setAvatarType('image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAccount = () => {
    if (showDeleteConfirm) {
      logout();
      alert('🗑️ Cuenta eliminada. Redirigiendo...');
      navigate('/');
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const getAvatarPreview = () => {
    switch (avatarType) {
      case 'image':
        return imageUrl ? (
          <img src={imageUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="i-ph:image-duotone text-6xl text-bolt-elements-textSecondary" />
        );
      case 'color':
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-white font-bold text-4xl">
            {userName?.charAt(0).toUpperCase() || 'U'}
          </div>
        );
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <SharedHeader />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-bolt-elements-textPrimary mb-2">Mi Espacio Personal</h1>
            <p className="text-bolt-elements-textSecondary">
              Configura tu perfil, apariencia y preferencias de la cuenta.
            </p>
          </div>

          {/* Indicador de auto-guardado */}
          <div className="mb-6 flex items-center justify-end gap-2 text-sm">
            {saveStatus === 'saving' && (
              <>
                <span className="i-svg-spinners:90-ring-with-bg text-bolt-elements-item-contentAccent" />
                <span className="text-bolt-elements-textSecondary">Guardando...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <span className="i-ph:check-circle-duotone text-green-500" />
                <span className="text-green-500">Guardado</span>
              </>
            )}
            {saveStatus === 'idle' && (
              <span className="text-bolt-elements-textTertiary">Los cambios se guardan automáticamente</span>
            )}
          </div>

          {/* Sección: Avatar */}
          <section className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4 flex items-center gap-2">
              <span className="i-ph:image-duotone text-bolt-elements-item-contentAccent" />
              Avatar de Perfil
            </h2>

            {/* Preview del avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-24 h-24 rounded-full border-2 border-bolt-elements-item-contentAccent flex items-center justify-center overflow-hidden"
                style={avatarType === 'color' ? { backgroundColor: selectedColor } : {}}
              >
                {getAvatarPreview()}
              </div>
              <div>
                <p className="text-sm font-semibold text-bolt-elements-textPrimary mb-1">Vista previa de tu avatar</p>
                <p className="text-xs text-bolt-elements-textSecondary">Elige un color o sube una imagen</p>
              </div>
            </div>

            {/* Tabs para tipo de avatar */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAvatarType('color')}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  avatarType === 'color'
                    ? 'bg-bolt-elements-item-contentAccent text-white'
                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                }`}
              >
                <span className="i-ph:palette-duotone mr-2" />
                Colores
              </button>
              <button
                onClick={() => setAvatarType('image')}
                className={`flex-1 px-4 py-2 rounded-lg transition ${
                  avatarType === 'image'
                    ? 'bg-bolt-elements-item-contentAccent text-white'
                    : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                }`}
              >
                <span className="i-ph:image-duotone mr-2" />
                Imagen
              </button>
            </div>

            {/* Selector de colores */}
            {avatarType === 'color' && (
              <div className="grid grid-cols-6 gap-3">
                {colorPalette.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-14 h-14 rounded-lg transition ${
                      selectedColor === color
                        ? 'ring-4 ring-bolt-elements-item-contentAccent ring-offset-2 ring-offset-bolt-elements-background-depth-2'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}

            {/* Subir imagen */}
            {avatarType === 'image' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor hover:border-bolt-elements-item-contentAccent transition text-bolt-elements-textPrimary flex items-center justify-center gap-2"
                >
                  <span className="i-ph:upload-duotone text-xl" />
                  Subir imagen desde tu PC
                </button>
                {imageUrl && (
                  <div className="text-sm text-bolt-elements-textSecondary text-center">
                    ✅ Imagen cargada correctamente
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sección: Perfil */}
          <section className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4 flex items-center gap-2">
              <span className="i-ph:identification-card-duotone text-bolt-elements-item-contentAccent" />
              Perfil
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm mb-1 text-bolt-elements-textSecondary">Correo (solo lectura)</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textSecondary"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-bolt-elements-textSecondary">Nombre de usuario</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-bolt-elements-textSecondary">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-bolt-elements-textSecondary">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent"
                  />
                </div>
              </div>
              <div>
                <button
                  onClick={() => {
                    if (newPassword.length < 6) {
                      alert('La contraseña debe tener al menos 6 caracteres');
                      return;
                    }

                    if (newPassword !== confirmPassword) {
                      alert('Las contraseñas no coinciden');
                      return;
                    }

                    const ok = changePassword(newPassword);

                    if (ok) {
                      setNewPassword('');
                      setConfirmPassword('');
                      alert('✅ Contraseña actualizada');
                    } else {
                      alert('❌ No se pudo actualizar la contraseña');
                    }
                  }}
                  className="px-5 py-3 rounded-lg bg-bolt-elements-item-contentAccent text-white font-semibold hover:opacity-90 transition"
                >
                  Cambiar contraseña
                </button>
              </div>
            </div>
          </section>

          {/* Sección: Biografía */}
          <section className="bg-bolt-elements-background-depth-2 border border-bolt-elements-borderColor rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-bolt-elements-textPrimary mb-4 flex items-center gap-2">
              <span className="i-ph:note-duotone text-bolt-elements-item-contentAccent" />
              Biografía
            </h2>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos algo sobre ti..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-item-contentAccent resize-none"
            />
          </section>

          {/* Sección: Zona de Peligro */}
          <section className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span className="i-ph:warning-duotone" />
              Zona de Peligro
            </h2>
            <p className="text-sm text-bolt-elements-textSecondary mb-4">
              Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.
            </p>
            <button
              onClick={handleDeleteAccount}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                showDeleteConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              {showDeleteConfirm ? '⚠️ Confirmar Eliminación' : 'Eliminar Cuenta'}
            </button>
            {showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="ml-3 px-6 py-3 rounded-xl bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor hover:bg-bolt-elements-background-depth-4 transition"
              >
                Cancelar
              </button>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
