"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 backdrop-blur-sm transition-colors focus-within:border-indigo-500/70 focus-within:bg-indigo-500/10">
    {children}
  </div>
);

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms) {
      alert('Please agree to the Terms of Service');
      return;
    }
    setIsLoading(true);
    try {
      await signup(email, password, name);
      router.push('/dashboard');
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-black text-slate-50 selection:bg-indigo-500/30 relative overflow-hidden">
      
      {/* Subtle background grid for landing page consistency */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-10">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-white/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-white/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>

      {/* Glow effect */}
      <div className="absolute top-1/4 -left-96 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Left column: Sign-up form */}
      <section className="flex-1 flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <ShieldCheck className="h-8 w-8 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
              <span className="text-2xl font-display font-bold tracking-tight group-hover:text-indigo-400 transition-colors">VERTEXSHIELD</span>
            </Link>

            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight mb-2">
                Get Started Free
              </h1>
              <p className="text-zinc-400">Create your account and start detecting fake reviews today</p>
            </div>

            <form className="space-y-5 mt-4" onSubmit={handleSignUp}>
              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Full Name</label>
                <GlassInputWrapper>
                  <input 
                    name="name" 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent text-sm p-4 rounded-xl focus:outline-none placeholder:text-zinc-700" 
                    required 
                  />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Email Address</label>
                <GlassInputWrapper>
                  <input 
                    name="email" 
                    type="email" 
                    placeholder="you@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm p-4 rounded-xl focus:outline-none placeholder:text-zinc-700" 
                    required 
                  />
                </GlassInputWrapper>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 block mb-2">Password</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-xl focus:outline-none placeholder:text-zinc-700" 
                      required 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-zinc-500 hover:text-slate-200 transition-colors" /> : <Eye className="w-5 h-5 text-zinc-500 hover:text-slate-200 transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 rounded border-zinc-800 bg-zinc-950 text-indigo-500 focus:ring-indigo-500" 
                />
                <label htmlFor="terms" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                  I agree to VertexShield's{' '}
                  <a href="#" className="text-zinc-300 hover:text-zinc-200 underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-zinc-300 hover:text-zinc-200 underline">Privacy Policy</a>
                </label>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full rounded-xl bg-indigo-600 py-4 font-medium text-white hover:bg-indigo-500 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative flex items-center justify-center mt-4">
              <span className="w-full border-t border-zinc-800"></span>
              <span className="px-4 text-sm text-zinc-500 bg-black absolute">Already have an account?</span>
            </div>

            <Link href="/login" className="w-full flex items-center justify-center gap-2 border border-zinc-800/50 bg-zinc-950/30 rounded-xl py-4 hover:bg-zinc-900/50 transition-colors text-sm font-medium text-white/80 hover:text-white">
                Sign In Instead
                <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Right column: Thematic Abstract Background */}
      <section className="hidden md:flex flex-1 relative bg-gradient-to-br from-zinc-950 via-black to-zinc-950 border-l border-zinc-900 items-center justify-center overflow-hidden">
        {/* Subtle glowing grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px]"></div>
        
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <ShieldCheck className="h-12 w-12 text-indigo-400" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-display font-semibold text-slate-200 mb-4">Ready to Protect Your Brand?</h2>
            <p className="text-zinc-400 leading-relaxed text-lg">
              Join hundreds of enterprises protecting their revenue from coordinated fake reviews and bot attacks.
            </p>
          </div>
          <div className="space-y-3 pt-4 text-sm text-zinc-400">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span>Connect your marketplace accounts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span>Detect suspicious patterns instantly</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
              <span>Automate dispute filing</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
