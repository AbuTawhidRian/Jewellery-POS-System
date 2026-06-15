import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Gem, ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = await response.json();

      if (!response.ok) {
        if (data.error === 'Invalid email or password') {
          // Try superadmin fallback
          const saResponse = await fetch('/api/auth/superadmin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (saResponse.ok) {
            response = saResponse;
            data = await saResponse.json();
          } else {
            throw new Error(data.error);
          }
        } else {
          throw new Error(data.error || 'Failed to login');
        }
      }

      login(data.token, data.user);
      navigate(data.user.role === 'SUPERADMIN' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs for premium glassmorphism effect */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 p-10 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-tr from-fuchsia-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/20 mb-4 transform transition hover:scale-105">
              <Gem className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Log in to manage your jewellery business
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl flex items-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl placeholder-zinc-500 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-fuchsia-500 transition-all shadow-lg shadow-fuchsia-500/25 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
          
          <div className="text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors">
              Start your free trial
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
