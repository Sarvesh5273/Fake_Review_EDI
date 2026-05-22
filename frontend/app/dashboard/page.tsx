"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Building2, ShieldCheck, Sparkles, Store } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type AlertRowData = Database["public"]["Tables"]["alerts"]["Row"];

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/70">{label}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display text-white">{value}</div>
        <p className="mt-2 text-xs text-white/50">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [marketplacesCount, setMarketplacesCount] = useState<number | null>(null);
  const [alertsCount, setAlertsCount] = useState<number | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<
    { platform: string; product: string; signature: string; risk: number; node: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const greeting = useMemo(() => {
    if (user?.name) return user.name.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "Operator";
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadOverview = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoading(true);
      setOverviewError(null);

      const [{ count: marketplaceCount, error: marketplaceError }, { count: alertCount, error: alertsError }] =
        await Promise.all([
          supabase.from("marketplaces").select("id", { count: "exact", head: true }),
          supabase.from("alerts").select("id", { count: "exact", head: true }),
        ]);

      if (marketplaceError || alertsError) {
        console.error("Failed to load overview counts:", marketplaceError ?? alertsError);
        setOverviewError("Unable to load overview metrics. Check your Supabase policies.");
      }

      const { data: alertData } = await supabase
        .from("alerts")
        .select("id,node_id,risk_score,signature,marketplace:marketplace_id (platform, store_name)")
        .order("created_at", { ascending: false })
        .limit(3);

      const mapped = (alertData ?? []).map(
        (row: AlertRowData & { marketplace?: { platform: string; store_name: string } | null }) => ({
          platform: row.marketplace?.platform ?? "Unknown",
          product: row.marketplace?.store_name ?? "Unmapped",
          signature: row.signature ?? "Unclassified",
          risk: Number(row.risk_score),
          node: row.node_id,
        })
      );

      setMarketplacesCount(marketplaceCount ?? 0);
      setAlertsCount(alertCount ?? 0);
      setRecentAlerts(mapped);
      setIsLoading(false);
    };

    loadOverview();
  }, [user]);

  return (
    <section className="space-y-8">
      <Card className="border-white/10 bg-white/[0.08] shadow-[0_35px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-display">Good to see you, {greeting}.</CardTitle>
          <CardDescription className="text-white/60">
            Your marketplace defense center is live. Monitor threats, connect new stores, and export evidence in one place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-white text-black hover:bg-white/90">
              <a href="/dashboard/alerts">
                <Sparkles className="mr-2 h-4 w-4" />
                Review active alerts
              </a>
            </Button>
            <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <a href="/dashboard/marketplaces">
                <Store className="mr-2 h-4 w-4" />
                Add marketplace
              </a>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">Active monitoring</div>
              <div className="mt-3 text-2xl font-display">
                {isLoading ? "..." : `${marketplacesCount ?? 0} connected`}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">Threat readiness</div>
              <div className="mt-3 flex items-center gap-2">
                <Progress value={89} className="h-2 flex-1" />
                <span className="text-sm text-white/60">89%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {overviewError && (
        <div className="border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{overviewError}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monitored marketplaces"
          value={isLoading ? "..." : String(marketplacesCount ?? 0)}
          detail="Connected and syncing accounts"
          icon={<Building2 className="h-4 w-4 text-white/70" />}
        />
        <StatCard
          label="Alerts active"
          value={isLoading ? "..." : String(alertsCount ?? 0)}
          detail="Requires review"
          icon={<AlertTriangle className="h-4 w-4 text-white/70" />}
        />
        <StatCard
          label="Reviews scanned"
          value="8,405"
          detail="Last 24 hours"
          icon={<Activity className="h-4 w-4 text-white/70" />}
        />
        <StatCard
          label="Revenue protected"
          value="$14.2K"
          detail="Estimated saved this week"
          icon={<ShieldCheck className="h-4 w-4 text-white/70" />}
        />
      </div>

      <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recent alerts
          </CardTitle>
          <CardDescription className="text-white/60">
            Latest threat signals detected across marketplaces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-white/55">Platform</TableHead>
                <TableHead className="text-white/55">Product</TableHead>
                <TableHead className="text-white/55">Signature</TableHead>
                <TableHead className="text-right text-white/55">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-white/10">
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-white/50">
                    Loading alerts...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && recentAlerts.length === 0 && (
                <TableRow className="border-white/10">
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-white/50">
                    No alerts yet.
                  </TableCell>
                </TableRow>
              )}
              {recentAlerts.map((row) => (
                <TableRow key={`${row.platform}-${row.node}`} className="border-white/10">
                  <TableCell className="font-medium">{row.platform}</TableCell>
                  <TableCell className="font-mono text-xs text-white/60">{row.product}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">
                      {row.signature}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.risk}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
          <a href="/dashboard/alerts">
            View all alerts
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
