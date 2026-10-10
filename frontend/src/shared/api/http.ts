import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const ACCESS_TOKEN_KEY = 'rapitrans.accessToken';
const REFRESH_TOKEN_KEY = 'rapitrans.refreshToken';

export const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      request.url === '/auth/login' ||
      request.url === '/auth/refresh' ||
      !refreshToken
    ) {
      return Promise.reject(error);
    }

    request._retry = true;
    try {
      const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
      request.headers.Authorization = `Bearer ${response.data.accessToken}`;
      return http(request);
    } catch (refreshError) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return Promise.reject(refreshError);
    }
  },
);
