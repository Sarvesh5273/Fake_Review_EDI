"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
    </svg>
);

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm transition-colors focus-within:border-indigo-500/70 focus-within:bg-indigo-500/10">
    {children}
  </div>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, authenticate here. For the demo, route straight to dashboard.
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-black text-slate-50 selection:bg-indigo-500/30">
      
      {/* Left column: Sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-8 w-8 text-indigo-500" />
              <span className="text-2xl font-bold tracking-tight">VertexShield</span>
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Welcome back
            </h1>
            <p className="text-zinc-400">Authenticate to access the GhostWire Command Center.</p>

            <form className="space-y-5 mt-4" onSubmit={handleSignIn}>
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Email Address</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="admin@organization.org" className="w-full bg-transparent text-sm p-4 rounded-xl focus:outline-none placeholder:text-zinc-700" required />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full bg-transparent text-sm p-4 pr-12 rounded-xl focus:outline-none placeholder:text-zinc-700" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-zinc-500 hover:text-slate-200 transition-colors" /> : <Eye className="w-5 h-5 text-zinc-500 hover:text-slate-200 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-indigo-500" />
                  <span className="text-zinc-400">Keep me signed in</span>
                </label>
                <a href="#" className="hover:underline text-indigo-400 transition-colors">Reset password</a>
              </div>

              <button type="submit" className="w-full rounded-xl bg-indigo-600 py-4 font-medium text-white hover:bg-indigo-500 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                Access Command Center
              </button>
            </form>

            <div className="relative flex items-center justify-center mt-4">
              <span className="w-full border-t border-zinc-800"></span>
              <span className="px-4 text-sm text-zinc-500 bg-black absolute">Or</span>
            </div>

            <button className="w-full flex items-center justify-center gap-3 border border-zinc-800 bg-zinc-950/50 rounded-xl py-4 hover:bg-zinc-900 transition-colors text-sm font-medium">
                <GoogleIcon />
                Continue with Google
            </button>
          </div>
        </div>
      </section>

      {/* Right column: Thematic Abstract Background */}
      <section className="hidden md:flex flex-1 relative bg-zinc-950 border-l border-zinc-900 items-center justify-center overflow-hidden">
        {/* Subtle glowing grid effect to match VertexShield aesthetic */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 max-w-md text-center">
          <ShieldCheck className="h-16 w-16 text-indigo-500/50 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-slate-200 mb-4">Enterprise Data Integrity</h2>
          <p className="text-zinc-400 leading-relaxed">
            Securely access your isolated GhostWire environment. All telemetry is encrypted at rest and analyzed in real-time.
          </p>
        </div>
      </section>
    </div>
  );
}