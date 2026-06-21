import api from './api';

export const login = async (name, password) => {
  const response = await api.post('/api/login', { name, password });
  return response.data; // { userId, name, role, token, message }
};

export const signup = async (name, password) => {
  const response = await api.post('/api/signup', { name, password });
  return response.data;
};

// ---- Session helpers ----

export const storeUser = (user) => {
  localStorage.setItem('user', JSON.stringify({
    userId: user.userId,
    name:   user.name,
    role:   user.role || 'USER',
  }));
  if (user.token) {
    localStorage.setItem('token', user.token);
  }
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export const clearUser = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

export const getCurrentUser = getStoredUser; // alias used in newer pages

export const isLoggedIn = () => Boolean(getStoredUser()?.userId);

export const isAdmin = () => getStoredUser()?.role === 'ADMIN';
