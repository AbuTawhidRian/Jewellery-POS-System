import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Loader2, Store, User, Mail, Lock } from 'lucide-react';

export default function Register() {
  const [shopName, setShopName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, userName, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register');
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12 animate-page-in">
      <div className="absolute top-0 -right-4 w-72 h-72 bg-[#C28C46] rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-blob"></div>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-[#334155] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-[#B48346] rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-blob animation-delay-4000"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 p-10 bg-[#151B23]/80 backdrop-blur-2xl border border-[#334155]/50 rounded-3xl shadow-2xl">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-[#B48346] to-[#8C622C] rounded-2xl flex items-center justify-center shadow-lg shadow-[#B48346]/20 mb-4 transform transition hover:scale-105">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M9 9l6 6" />
                <path d="M15 9l-6 6" />
              </svg>
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white tracking-tight">Create your shop</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Start managing your jewellery business today
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl flex items-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-[#94A3B8] mb-1" htmlFor="shopName">Shop Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Store className="h-5 w-5 text-[#64748B]" />
                </div>
                <input
                  id="shopName"
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-4 py-3 bg-[#0B0F19]/50 border border-[#334155] rounded-xl placeholder-[#64748B] text-white focus:outline-none focus:ring-2 focus:ring-[#C28C46] focus:border-transparent transition-all"
                  placeholder="My Jewellery Store"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#94A3B8] mb-1" htmlFor="userName">Your Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#64748B]" />
                </div>
                <input
                  id="userName"
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-4 py-3 bg-[#0B0F19]/50 border border-[#334155] rounded-xl placeholder-[#64748B] text-white focus:outline-none focus:ring-2 focus:ring-[#C28C46] focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#94A3B8] mb-1" htmlFor="email">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#64748B]" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-4 py-3 bg-[#0B0F19]/50 border border-[#334155] rounded-xl placeholder-[#64748B] text-white focus:outline-none focus:ring-2 focus:ring-[#C28C46] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-[#94A3B8] mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#64748B]" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-4 py-3 bg-[#0B0F19]/50 border border-[#334155] rounded-xl placeholder-[#64748B] text-white focus:outline-none focus:ring-2 focus:ring-[#C28C46] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-[#C28C46] to-[#8C622C] hover:from-[#B48346] hover:to-[#7A5526] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0F19] focus:ring-[#C28C46] transition-all shadow-lg shadow-[#C28C46]/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
          
          <div className="text-center text-sm text-[#94A3B8]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#C28C46] hover:text-[#B48346] transition-colors">
              Sign in here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
