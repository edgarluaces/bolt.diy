import { atom } from 'nanostores';
import { logStore } from './logs';

export interface User {
  id: string;
  email: string;
  userName: string;
  bio: string;
  avatar: {
    type: 'icon' | 'image' | 'color';
    value: string; // icon name, image URL, or color hex
  };
  createdAt: string;
}

export const kAuthToken = 'bolt_auth_token';
export const kUserProfile = 'bolt_user_profile';
export const kUserPassword = 'bolt_user_password';

export const userStore = atom<User | null>(loadUserFromStorage());
export const isAuthenticatedStore = atom<boolean>(!!loadUserFromStorage());

function loadUserFromStorage(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const token = localStorage.getItem(kAuthToken);
    const profileData = localStorage.getItem(kUserProfile);

    if (token && profileData) {
      return JSON.parse(profileData);
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
  }

  return null;
}

export function login(email: string, password: string): boolean {
  // Simulación de login - en producción sería una llamada API real
  if (email && password.length >= 6) {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      userName: email.split('@')[0],
      bio: '',
      avatar: {
        type: 'icon',
        value: 'user-circle',
      },
      createdAt: new Date().toISOString(),
    };

    // Guardar token, usuario y contraseña simulada
    const token = crypto.randomUUID();
    localStorage.setItem(kAuthToken, token);
    localStorage.setItem(kUserProfile, JSON.stringify(user));
    localStorage.setItem(kUserPassword, password);

    // Actualizar stores
    userStore.set(user);
    isAuthenticatedStore.set(true);

    logStore.logSystem(`User logged in: ${email}`);

    return true;
  }

  return false;
}

export function register(email: string, password: string, userName: string): boolean {
  // Simulación de registro - en producción sería una llamada API real
  if (email && password.length >= 6 && userName) {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      userName,
      bio: '',
      avatar: {
        type: 'icon',
        value: 'user-circle',
      },
      createdAt: new Date().toISOString(),
    };

    // Guardar token y usuario
    const token = crypto.randomUUID();
    localStorage.setItem(kAuthToken, token);
    localStorage.setItem(kUserProfile, JSON.stringify(user));

    // Actualizar stores
    userStore.set(user);
    isAuthenticatedStore.set(true);

    logStore.logSystem(`User registered: ${email}`);

    return true;
  }

  return false;
}

export function logout() {
  // Limpiar localStorage
  localStorage.removeItem(kAuthToken);
  localStorage.removeItem(kUserProfile);
  localStorage.removeItem(kUserPassword);

  // Actualizar stores
  userStore.set(null);
  isAuthenticatedStore.set(false);

  logStore.logSystem('User logged out');
}

export function updateUserProfile(updates: Partial<User>) {
  const currentUser = userStore.get();

  if (!currentUser) {
    return false;
  }

  const updatedUser = { ...currentUser, ...updates };

  // Guardar en localStorage
  localStorage.setItem(kUserProfile, JSON.stringify(updatedUser));

  // Actualizar store
  userStore.set(updatedUser);

  logStore.logSystem('User profile updated');

  return true;
}

export function isAuthenticated(): boolean {
  return isAuthenticatedStore.get();
}

export function getCurrentUser(): User | null {
  return userStore.get();
}

export function changePassword(newPassword: string): boolean {
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return false;
  }

  try {
    localStorage.setItem(kUserPassword, newPassword);
    logStore.logSystem('User password changed');

    return true;
  } catch (e) {
    console.error('Error changing password', e);
    return false;
  }
}
