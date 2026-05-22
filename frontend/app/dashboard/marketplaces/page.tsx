"use client";

import React, { useEffect, useState } from "react";
import { Globe, Plus, Store } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapMarketplaceRow, Marketplace, MarketplaceRow, toDbCadence } from "../utils";

export default function MarketplacesPage() {
  const { user } = useAuth();
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [isLoadingMarketplaces, setIsLoadingMarketplaces] = useState(false);
  const [platform, setPlatform] = useState("amazon");
  const [storeName, setStoreName] = useState("");
  const [region, setRegion] = useState("US");
  const [syncCadence, setSyncCadence] = useState("Real-time");
  const [isSavingMarketplace, setIsSavingMarketplace] = useState(false);

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

    loadMarketplaces();
  }, [user]);

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

  return (
    <section className="space-y-8">
      <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Store className="h-5 w-5" />
            Marketplace connections
          </CardTitle>
          <CardDescription className="text-white/60">
            Add and manage marketplace connections, sync cadence, and regional coverage.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-lg">Add a marketplace</CardTitle>
            <CardDescription className="text-white/60">Configure new store integrations for monitoring.</CardDescription>
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

            <Button onClick={addMarketplace} disabled={isSavingMarketplace} className="w-full bg-white text-black hover:bg-white/90">
              <Plus className="mr-2 h-4 w-4" />
              {isSavingMarketplace ? "Adding..." : "Add marketplace"}
            </Button>
            {marketplaceError && (
              <div className="border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{marketplaceError}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-lg">Connected marketplaces</CardTitle>
            <CardDescription className="text-white/60">All active integrations for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            {isLoadingMarketplaces && (
              <div className="border border-white/10 bg-white/[0.03] p-4 text-sm text-white/50">Loading marketplaces...</div>
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
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
