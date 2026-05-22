"use client";

import React, { useEffect, useState } from "react";
import { Bot, Download, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AlertRow, AlertRowData } from "../utils";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [analysisNode, setAnalysisNode] = useState("104");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ probability: number; status: string } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
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

    loadAlerts();
  }, []);

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
    <section className="space-y-8">
      <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="h-5 w-5" />
            Active review alerts
          </CardTitle>
          <CardDescription className="text-white/60">
            Monitor anomalies and take action on coordinated review attacks.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Threat queue</CardTitle>
            <CardDescription className="text-white/60">Marketplace threats detected across the current workspace.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {alertsError && (
              <div className="border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{alertsError}</div>
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

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Threat inference
            </CardTitle>
            <CardDescription className="text-white/60">
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
    </section>
  );
}
