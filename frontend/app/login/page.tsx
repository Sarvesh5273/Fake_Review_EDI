"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      await login(email, password);
      console.log("LOGIN SUCCESS");
      window.location.href = "/dashboard";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="h-full w-full object-cover object-center opacity-70"
        >
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none opacity-20">
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

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col px-6 lg:px-12">
        <header className="flex items-center justify-between py-8 lg:py-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-display tracking-tight text-white">VERTEXSHIELD</span>
            <span className="font-mono text-xs text-white/40">TM</span>
          </Link>
          <Link href="/" className="text-sm text-white/60 transition-colors hover:text-white">
            Back home
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 pb-12 lg:grid-cols-12 lg:pb-20">
          <section className="lg:col-span-7 lg:max-w-[780px]">
            <div
              className={`mb-8 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-sm font-mono text-white/60">
                <span className="h-px w-8 bg-white/30" />
                Secure access
              </span>
            </div>

            <h1
              className={`text-left text-[clamp(3rem,7vw,7rem)] font-display leading-[0.92] tracking-tight transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              Sign in to
              <br />
              <span className="text-white/40">VertexShield.</span>
            </h1>

            <p
              className={`mt-8 max-w-2xl text-xl leading-relaxed text-white/65 transition-all duration-700 delay-150 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Monitor marketplaces, prove coordinated review attacks, and move straight into your dashboard.
            </p>

            <div
              className={`mt-12 grid gap-4 sm:grid-cols-3 transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {[
                { value: "Real-time", label: "attack detection" },
                { value: "Evidence", label: "export ready" },
                { value: "Fast", label: "dashboard access" },
              ].map((stat) => (
                <div key={stat.label} className="border border-white/10 bg-black/30 p-5 backdrop-blur-sm">
                  <div className="text-2xl font-display">{stat.value}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-5 lg:justify-self-end lg:w-full lg:max-w-[520px]">
            <div
              className={`border border-white/10 bg-black/55 p-8 shadow-2xl backdrop-blur-xl transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="mb-8">
                <div className="mb-4 inline-flex items-center gap-2 text-sm font-mono text-white/40">
                  <ShieldCheck className="h-4 w-4 text-white/60" />
                  Authentication
                </div>
                <h2 className="text-3xl font-display tracking-tight">Welcome back</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/55">
                  Sign in to continue reviewing alerts, disputes, and marketplace coverage.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSignIn}>
                <div>
                  <label className="mb-2 block text-sm text-white/55">Email Address</label>
                  <div className="border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/30">
                    <input
                      name="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent p-4 text-sm text-white placeholder:text-white/25 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/55">Password</label>
                  <div className="border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/30">
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-transparent p-4 pr-12 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-4 flex items-center text-white/45 transition-colors hover:text-white"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {authError && (
                  <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    {authError}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 w-full rounded-none bg-white text-black hover:bg-white/90"
                >
                  {isLoading ? "Signing in..." : "Access Dashboard"}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between gap-4 text-sm text-white/50">
                  <span>New to VertexShield?</span>
                  <Link href="/signup" className="text-white transition-colors hover:text-white/70">
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
