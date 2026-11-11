import { BoardsState, DiscState, StudyFile, User } from '../types';

const TOKEN_KEY = 'kanban-auth-token';
const USER_KEY = 'kanban-auth-user';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (user: User | null, token: string | null) => {
  try {
    if (token && user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {}
};

const getHeaders = () => {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiRegister = async (name: string, email: string, password: string) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha no cadastro');
  }
  setStoredAuth(data.user, data.token);
  return data;
};

export const apiLogin = async (email: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha no login');
  }
  setStoredAuth(data.user, data.token);
  return data;
};

export const apiGetMe = async (): Promise<User | null> => {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: getHeaders(),
    });
    if (!res.ok) {
      setStoredAuth(null, null);
      return null;
    }
    const data = await res.json();
    return data.user as User;
  } catch {
    return null;
  }
};

export const apiLogout = async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch {}
  setStoredAuth(null, null);
};

export const apiSyncSave = async (boards: BoardsState, disc: DiscState) => {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ boards, disc }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Sync failed:', err);
    return null;
  }
};

export const apiSyncFetch = async () => {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/sync', {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as { boards: BoardsState; disc: DiscState } | null;
  } catch {
    return null;
  }
};

// Aliases for convenience
export const apiSyncData = apiSyncSave;
export const apiPullCloudData = apiSyncFetch;

// File Management APIs
export const apiUploadFile = async (
  file: File,
  disciplineId?: string,
  topicId?: string
): Promise<StudyFile> => {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('file', file);
  if (disciplineId) formData.append('disciplineId', disciplineId);
  if (topicId) formData.append('topicId', topicId);

  const res = await fetch('/api/files/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao carregar arquivo');
  }
  return data.file as StudyFile;
};

export const apiListFiles = async (
  disciplineId?: string,
  topicId?: string
): Promise<StudyFile[]> => {
  const token = getStoredToken();
  if (!token) return [];
  const params = new URLSearchParams();
  if (disciplineId) params.append('disciplineId', disciplineId);
  if (topicId) params.append('topicId', topicId);

  const res = await fetch(`/api/files?${params.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.files || []) as StudyFile[];
};

export const apiDeleteFile = async (fileId: string): Promise<boolean> => {
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.ok;
};
