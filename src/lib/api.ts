import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBranchId = localStorage.getItem('activeBranchId');
  if (activeBranchId) {
    config.headers['X-Branch-Id'] = activeBranchId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('activeBranchId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
