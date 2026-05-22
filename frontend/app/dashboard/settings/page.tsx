"use client";

import React, { useMemo, useState } from "react";
import { ShieldCheck, Upload, UserRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { user } = useAuth();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "V";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <section className="space-y-8">
      <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <UserRound className="h-5 w-5" />
            Profile settings
          </CardTitle>
          <CardDescription className="text-white/60">
            Manage your profile, workspace branding, and access controls.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Workspace profile
            </CardTitle>
            <CardDescription className="text-white/60">Update your account branding and contact info.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-white/10">
                {logoPreview ? <AvatarImage src={logoPreview} alt="Uploaded logo preview" /> : null}
                <AvatarFallback className="bg-white/10 text-xl text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="text-sm font-medium">{user?.name || "VertexShield Account"}</div>
                <div className="text-sm text-white/45">{user?.email}</div>
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 border border-white/10 bg-white/[0.03] px-4 py-3 text-sm transition-colors hover:bg-white/10">
              <Upload className="h-4 w-4" />
              Upload logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setLogoPreview(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Security status</CardTitle>
            <CardDescription className="text-white/60">Multi-factor and audit protections.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 text-sm text-white/65">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/55">MFA status</div>
              <div className="mt-1 font-medium text-white">Optional</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/55">Audit logging</div>
              <div className="mt-1 font-medium text-white">Enabled</div>
            </div>
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              Update security settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
