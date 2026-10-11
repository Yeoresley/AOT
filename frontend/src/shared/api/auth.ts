import { http } from './http';

const ACCESS_TOKEN_KEY = 'rapitrans.accessToken';
const REFRESH_TOKEN_KEY = 'rapitrans.refreshToken';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAuth(response: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  if (response.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(username: string, password: string) {
  const { data } = await http.post<AuthResponse>('/auth/login', { username, password });
  saveAuth(data);
  return data.user;
}

export async function getCurrentUser() {
  const { data } = await http.get<AuthUser>('/auth/me');
  return data;
}

export async function logout() {
  try {
    await http.post('/auth/logout');
  } finally {
    clearAuth();
  }
}
