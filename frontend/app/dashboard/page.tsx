"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bot,
  Building2,
  Download,
  Globe,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Marketplace = {
  id: string;
  platform: string;
  storeName: string;
  region: string;
  syncCadence: string;
  status: "Connected" | "Syncing" | "Attention";
  logoUrl?: string;
};

type AlertRow = {
  platform: string;
  product: string;
  signature: string;
  risk: number;
  node: string;
};

type MarketplaceRow = Database["public"]["Tables"]["marketplaces"]["Row"];
type AlertRowData = Database["public"]["Tables"]["alerts"]["Row"];

const formatCadence = (value?: string | null) => {
  if (!value) return "Real-time";
  if (value === "real_time") return "Real-time";
  if (value === "real-time") return "Real-time";
  if (value === "5_min") return "5 min";
  if (value === "15_min") return "15 min";
  if (value === "hourly") return "Hourly";
  return value;
};

const toDbCadence = (value: string) => {
  if (value.toLowerCase() === "real-time") return "real_time";
  if (value.toLowerCase() === "5 min") return "5_min";
  if (value.toLowerCase() === "15 min") return "15_min";
  if (value.toLowerCase() === "hourly") return "hourly";
  return value.toLowerCase().replace(" ", "_");
};

const mapMarketplaceStatus = (value?: string | null): Marketplace["status"] => {
  if (value === "syncing") return "Syncing";
  if (value === "attention") return "Attention";
  return "Connected";
};

const mapMarketplaceRow = (row: MarketplaceRow): Marketplace => ({
  id: row.id,
  platform: row.platform,
  storeName: row.store_name,
  region: row.region ?? "US",
  syncCadence: formatCadence(row.sync_cadence),
  status: mapMarketplaceStatus(row.status),
});

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
    <Card className="border-white/10 bg-black/35 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/60">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display">{value}</div>
        <p className="mt-2 text-xs text-white/45">{detail}</p>
      </CardContent>
    </Card>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [isLoadingMarketplaces, setIsLoadingMarketplaces] = useState(false);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [platform, setPlatform] = useState("amazon");
  const [storeName, setStoreName] = useState("");
  const [region, setRegion] = useState("US");
  const [syncCadence, setSyncCadence] = useState("Real-time");
  const [isSavingMarketplace, setIsSavingMarketplace] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [analysisNode, setAnalysisNode] = useState("104");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ probability: number; status: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const initials = useMemo(() => {
    const source = user?.name || user?.email || "V";
    return source
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const loadMarketplaces = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoadingMarketplaces(true);
      setMarketplaceError(null);

      const { data, error } = await supabase
        .from("marketplaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load marketplaces:", error);
        setMarketplaceError("Unable to load marketplaces. Check your Supabase policies and connection.");
        setIsLoadingMarketplaces(false);
        return;
      }

      setMarketplaces((data ?? []).map(mapMarketplaceRow));
      setIsLoadingMarketplaces(false);
    };

    const loadAlerts = async () => {
      const supabase = getSupabaseBrowserClient();
      setIsLoadingAlerts(true);
      setAlertsError(null);

      const { data, error } = await supabase
        .from("alerts")
        .select("id,node_id,risk_score,signature,status,marketplace:marketplace_id (platform, store_name)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load alerts:", error);
        setAlertsError("Unable to load alerts. Add an RLS policy on alerts to allow user access.");
        setIsLoadingAlerts(false);
        return;
      }

      const mapped = (data ?? []).map((row: AlertRowData & { marketplace?: { platform: string; store_name: string } | null }) => ({
        platform: row.marketplace?.platform ?? "Unknown",
        product: row.marketplace?.store_name ?? "Unmapped",
        signature: row.signature ?? "Unclassified",
        risk: Number(row.risk_score),
        node: row.node_id,
      }));

      setAlerts(mapped);
      setIsLoadingAlerts(false);
    };

    loadMarketplaces();
    loadAlerts();
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };

  const addMarketplace = async () => {
    if (!user) {
      setMarketplaceError("You must be signed in to add a marketplace.");
      return;
    }

    const platformLabel =
      platform === "amazon"
        ? "Amazon Seller Central"
        : platform === "shopify"
          ? "Shopify Plus"
          : platform === "walmart"
            ? "Walmart Marketplace"
            : "Trustpilot";

    setIsSavingMarketplace(true);
    setMarketplaceError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("marketplaces")
      .insert({
        user_id: user.id,
        platform: platformLabel,
        store_name: storeName || "New marketplace",
        region,
        sync_cadence: toDbCadence(syncCadence),
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add marketplace:", error);
      setMarketplaceError("Unable to add marketplace. Verify your Supabase policy for marketplaces.");
      setIsSavingMarketplace(false);
      return;
    }

    setMarketplaces((prev) => [mapMarketplaceRow(data as MarketplaceRow), ...prev]);
    setStoreName("");
    setIsSavingMarketplace(false);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: parseInt(analysisNode) }),
      });

      if (!response.ok) {
        throw new Error("Backend inference failed. Is Python FastAPI running on port 8000?");
      }

      const data = await response.json();
      setAnalysis({ probability: data.threat_probability, status: data.status });
    } catch (error: any) {
      setAnalysisError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline aria-hidden="true" className="h-full w-full object-cover opacity-55">
          <source
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bg-hero-0BnFGdr81Ifnj3WbBZoNt1KE4D5DMT.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
      </div>

      <div className="absolute inset-0 z-[1] pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-white/10" style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-white/10" style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-4 py-8 lg:py-10">
          <div className="flex items-center gap-4">
            <a href="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-display tracking-tight">VERTEXSHIELD</span>
              <span className="font-mono text-xs text-white/40">TM</span>
            </a>
            <Badge className="border-white/10 bg-white/5 text-white/70">Dashboard</Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="border border-white/10 bg-white/5 text-white hover:bg-white/10">
              <Sparkles className="mr-2 h-4 w-4" />
              Sync status
            </Button>
            <Button onClick={handleLogout} size="sm" className="bg-white text-black hover:bg-white/90">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <main className="grid flex-1 gap-6 pb-12 xl:grid-cols-[280px_minmax(0,1fr)] xl:pb-16">
          <aside className="border border-white/10 bg-black/45 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-4 border-b border-white/10 pb-6">
              <Avatar className="h-14 w-14 border border-white/10">
                {logoPreview ? <AvatarImage src={logoPreview} alt="Brand logo preview" /> : null}
                <AvatarFallback className="bg-white/10 text-lg text-white">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-medium">{user?.name || user?.email}</div>
                <div className="text-sm text-white/45">Workspace owner</div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-white/65">
              <a href="#overview" className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
                <span>Overview</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#marketplaces" className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
                <span>Marketplace settings</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#alerts" className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
                <span>Active alerts</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#brand" className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10">
                <span>User logo</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-6 border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-mono text-white/50">
                <UserRound className="h-4 w-4" />
                Account
              </div>
              <p className="text-sm text-white/55">Manage access, platform connections, and brand assets from one place.</p>
            </div>
          </aside>

          <section className="space-y-6">
            <div id="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Monitored marketplaces"
                value={isLoadingMarketplaces ? "..." : String(marketplaces.length)}
                detail={marketplaceError ? "Unavailable" : "Connected and syncing accounts"}
                icon={<Building2 className="h-4 w-4 text-white/55" />}
              />
              <StatCard
                label="Alerts active"
                value={isLoadingAlerts ? "..." : String(alerts.length)}
                detail={alertsError ? "Unavailable" : "Requires review"}
                icon={<Bell className="h-4 w-4 text-white/55" />}
              />
              <StatCard label="Reviews scanned" value="8,405" detail="Last 24 hours" icon={<Activity className="h-4 w-4 text-white/55" />} />
              <StatCard label="Revenue protected" value="$14.2K" detail="Estimated saved this week" icon={<ShieldCheck className="h-4 w-4 text-white/55" />} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card id="marketplaces" className="border-white/10 bg-black/45 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Marketplace settings
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Add and manage marketplace connections, sync cadence, and regional coverage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/55">Platform</label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amazon">Amazon Seller Central</SelectItem>
                          <SelectItem value="shopify">Shopify Plus</SelectItem>
                          <SelectItem value="walmart">Walmart Marketplace</SelectItem>
                          <SelectItem value="trustpilot">Trustpilot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-white/55">Store / account name</label>
                      <div className="border border-white/10 bg-white/[0.03]">
                        <input
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="VertexShield Retail"
                          className="w-full bg-transparent p-3.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-white/55">Region</label>
                      <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">US</SelectItem>
                          <SelectItem value="US-East">US-East</SelectItem>
                          <SelectItem value="EU">EU</SelectItem>
                          <SelectItem value="Global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm text-white/55">Sync cadence</label>
                      <Select value={syncCadence} onValueChange={setSyncCadence}>
                        <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                          <SelectValue placeholder="Select cadence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Real-time">Real-time</SelectItem>
                          <SelectItem value="5 min">5 min</SelectItem>
                          <SelectItem value="15 min">15 min</SelectItem>
                          <SelectItem value="Hourly">Hourly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={addMarketplace}
                    disabled={isSavingMarketplace}
                    className="w-full bg-white text-black hover:bg-white/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isSavingMarketplace ? "Adding..." : "Add marketplace"}
                  </Button>
                  {marketplaceError && (
                    <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {marketplaceError}
                    </div>
                  )}

                  <div className="space-y-3">
                    {isLoadingMarketplaces && (
                      <div className="border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">
                        Loading marketplaces...
                      </div>
                    )}
                    {!isLoadingMarketplaces && marketplaces.length === 0 && (
                      <div className="border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
                        No marketplaces connected yet.
                      </div>
                    )}
                    {marketplaces.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 border border-white/10 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5">
                            <Globe className="h-5 w-5 text-white/65" />
                          </div>
                          <div>
                            <div className="font-medium">{item.platform}</div>
                            <div className="text-sm text-white/45">{item.storeName}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-white/65">
                            {item.region}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 bg-white/5 text-white/65">
                            {item.syncCadence}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              item.status === "Connected"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                : item.status === "Syncing"
                                  ? "border-blue-500/20 bg-blue-500/10 text-blue-300"
                                  : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div id="brand" className="space-y-6">
                <Card className="border-white/10 bg-black/45 backdrop-blur-xl">
                  <CardHeader className="border-b border-white/10">
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      User logo
                    </CardTitle>
                    <CardDescription className="text-white/45">Upload a brand mark or keep the default workspace avatar.</CardDescription>
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

                <Card className="border-white/10 bg-black/45 backdrop-blur-xl">
                  <CardHeader className="border-b border-white/10">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Threat inference
                    </CardTitle>
                    <CardDescription className="text-white/45">
                      Run graph inference on a suspicious node to generate a dispute payload.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <Select value={analysisNode} onValueChange={setAnalysisNode}>
                      <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                        <SelectValue placeholder="Select threat node" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="104">Node 104</SelectItem>
                        <SelectItem value="342">Node 342</SelectItem>
                        <SelectItem value="15">Node 15</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-white text-black hover:bg-white/90">
                      {isAnalyzing ? "Analyzing..." : "Execute inference"}
                      {!isAnalyzing && <Search className="ml-2 h-4 w-4" />}
                    </Button>

                    {analysisError ? (
                      <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{analysisError}</div>
                    ) : analysis ? (
                      <div className="space-y-3 border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/50">Threat score</span>
                          <span className="text-lg font-medium">{(analysis.probability * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={analysis.probability * 100} className="h-2" />
                        <p className="text-xs text-white/45">{analysis.status}</p>
                        <Button variant="outline" className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10">
                          <Download className="mr-2 h-4 w-4" />
                          Export dispute payload
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/40">
                        Awaiting inference execution
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div id="alerts" className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-white/10 bg-black/45 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Active review alerts
                  </CardTitle>
                  <CardDescription className="text-white/45">Marketplace threats detected across the current workspace.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {alertsError && (
                    <div className="border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                      {alertsError}
                    </div>
                  )}
                  {!alertsError && (
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
                        {isLoadingAlerts && (
                          <TableRow className="border-white/10">
                            <TableCell colSpan={4} className="py-6 text-center text-sm text-white/50">
                              Loading alerts...
                            </TableCell>
                          </TableRow>
                        )}
                        {!isLoadingAlerts && alerts.length === 0 && (
                          <TableRow className="border-white/10">
                            <TableCell colSpan={4} className="py-6 text-center text-sm text-white/50">
                              No active alerts yet.
                            </TableCell>
                          </TableRow>
                        )}
                        {alerts.map((row) => (
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
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/45 backdrop-blur-xl">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="flex items-center gap-2">
                    <BadgeCheck className="h-5 w-5" />
                    Brand workspace
                  </CardTitle>
                  <CardDescription className="text-white/45">
                    Quick controls for profile, asset branding, and release actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between border border-white/10 bg-white/[0.03] p-4">
                    <div>
                      <div className="text-sm text-white/50">Profile owner</div>
                      <div className="mt-1 font-medium">{user?.name || user?.email}</div>
                    </div>
                    <Avatar className="h-12 w-12 border border-white/10">
                      {logoPreview ? <AvatarImage src={logoPreview} alt="Profile preview" /> : null}
                      <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button className="bg-white text-black hover:bg-white/90">
                      <Plus className="mr-2 h-4 w-4" />
                      New alert rule
                    </Button>
                    <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                      <Download className="mr-2 h-4 w-4" />
                      Export report
                    </Button>
                  </div>

                  <div className="border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-mono text-white/45">
                      <Sparkles className="h-4 w-4" />
                      System readiness
                    </div>
                    <Progress value={89} className="h-2" />
                    <p className="mt-3 text-xs text-white/45">Marketplace sync, inference, and dispute export are operational.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
