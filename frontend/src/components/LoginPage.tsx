import React, { useState } from 'react';
import axios from 'axios';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      auth.login(response.data.access_token);
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(
          typeof detail === 'string'
            ? detail
            : 'Tên đăng nhập hoặc mật khẩu không đúng.'
        );
      } else {
        setError('Đã xảy ra lỗi kết nối. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 flex flex-col gap-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-primary rounded-xl text-white shadow-md shadow-primary/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold font-heading text-primary tracking-tight">Drug-Pred AI</h1>
            <p className="text-sm text-text/60 mt-1">Hệ thống hỗ trợ quyết định lâm sàng</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-semibold text-text">
              Tên đăng nhập
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition text-sm"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-text">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition text-sm"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text/40 hover:text-text/70 transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-text/40 pt-2 border-t border-gray-100">
          © 2026 PJ-Medicine — Hệ thống hỗ trợ quyết định lâm sàng
        </p>
      </div>
    </div>
  );
}
