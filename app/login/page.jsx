'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Invalid login details.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#07101C] flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="w-full max-w-[420px]">

        {/* Login Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.35)]">

          {/* Brand */}
          <div className="flex flex-col items-center text-center mb-7 sm:mb-9">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-5">
              <Image
                src="/logo.png"
                alt="TEJUROLEX GLOBAL"
                fill
                priority
                sizes="96px"
                className="object-contain"
              />
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111111]">
              Welcome back
            </h1>

            <p className="text-xs sm:text-sm text-[#667085] mt-1.5">
              Sign in to your TejBot Sales Engine
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#111111] mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck="false"
                required
                className="
                  w-full
                  h-12
                  sm:h-[52px]
                  px-4
                  rounded-xl
                  border border-[#E5E7EB]
                  bg-[#FAFAFA]
                  text-sm
                  text-[#111111]
                  placeholder:text-[#98A2B3]
                  outline-none
                  transition
                  focus:bg-white
                  focus:border-[#63B99B]
                  focus:ring-4
                  focus:ring-[#63B99B]/10
                "
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[#111111] mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="
                  w-full
                  h-12
                  sm:h-[52px]
                  px-4
                  rounded-xl
                  border border-[#E5E7EB]
                  bg-[#FAFAFA]
                  text-sm
                  text-[#111111]
                  placeholder:text-[#98A2B3]
                  outline-none
                  transition
                  focus:bg-white
                  focus:border-[#63B99B]
                  focus:ring-4
                  focus:ring-[#63B99B]/10
                "
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-xs sm:text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                h-12
                sm:h-[52px]
                rounded-xl
                bg-[#111111]
                text-white
                text-sm
                font-semibold
                flex
                items-center
                justify-center
                transition-all
                hover:bg-black
                active:scale-[0.99]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Security */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-[#F0F0F0]">
            <LockKeyhole size={13} className="text-[#98A2B3]" />
            <span className="text-[11px] text-[#98A2B3]">
              Secure access to your sales dashboard
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/35 mt-5 px-4">
          TEJUROLEX GLOBAL · TejBot Sales Engine
        </p>
      </div>
    </main>
  );
}