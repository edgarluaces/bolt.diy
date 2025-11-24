import { atom } from 'nanostores';

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  favorite: boolean;

  // Optional preview URL or path if available in your app
  url?: string;
};

const STORAGE_KEY = 'bolt_user_projects';

function load(): Project[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

function save(list: readonly Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const projectsStore = atom<Project[]>(load());

projectsStore.listen((list) => save(list));

export function addProject(p: Omit<Project, 'id' | 'createdAt' | 'favorite'> & { name: string }) {
  const id = crypto.randomUUID();
  const proj: Project = { id, name: p.name, createdAt: new Date().toISOString(), favorite: false, url: p.url };
  const next = [proj, ...projectsStore.get()];
  projectsStore.set(next);

  return proj;
}

export function deleteProject(id: string) {
  const next = projectsStore.get().filter((p) => p.id !== id);
  projectsStore.set(next);
}

export function renameProject(id: string, name: string) {
  const next = projectsStore.get().map((p) => (p.id === id ? { ...p, name } : p));
  projectsStore.set(next);
}

export function toggleFavorite(id: string) {
  const next = projectsStore.get().map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p));
  projectsStore.set(next);
}

export function clearAllProjects() {
  projectsStore.set([]);
}
