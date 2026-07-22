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

export default api;
