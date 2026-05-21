"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, Search, Activity, Database, DollarSign, Download, ArrowRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const [targetNode, setTargetNode] = useState<string>("104");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ probability: number; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInference = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id: parseInt(targetNode) }),
      });

      if (!response.ok) {
        throw new Error("Backend inference failed. Is Python FastAPI running on port 8000?");
      }

      const data = await response.json();
      setResult({
        probability: data.threat_probability,
        status: data.status,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-50 selection:bg-indigo-500/30 flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">VertexShield Command Center</span>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2"></div>
            GhostWire Middleware Active
          </Badge>
        </div>
      </header>

      <main className="flex-1">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-black to-black" />
          <div className="relative container py-8 space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Monitored SKUs</CardTitle>
                  <Database className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,240</div>
                  <p className="text-xs text-muted-foreground">+12 from last week</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Reviews Scanned (24h)</CardTitle>
                  <Activity className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8,405</div>
                  <p className="text-xs text-muted-foreground">Across 4 platforms</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Anomalies</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">3</div>
                  <p className="text-xs text-muted-foreground">Requires immediate review</p>
                </CardContent>
              </Card>
              <Card className="bg-zinc-950/50 backdrop-blur-md border border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Revenue Protected</CardTitle>
                  <DollarSign className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$14,200</div>
                  <p className="text-xs text-muted-foreground">Estimated conversion saved</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
              <Card className="col-span-4 bg-zinc-950/50 backdrop-blur-md border border-zinc-800">
                <CardHeader>
                  <CardTitle>Active Review Bombing Alerts</CardTitle>
                  <CardDescription>Anomalous temporal bursts and semantic patterns detected.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Platform</TableHead>
                        <TableHead>SKU / ASIN</TableHead>
                        <TableHead>Threat Signature</TableHead>
                        <TableHead className="text-right">Node ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Amazon</TableCell>
                        <TableCell className="font-mono text-xs">NEX-PRO-MAX (B08FX)</TableCell>
                        <TableCell><Badge variant="destructive">Temporal Burst (72h)</Badge></TableCell>
                        <TableCell className="text-right font-mono">104</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Shopify</TableCell>
                        <TableCell className="font-mono text-xs">NEX-LITE-W</TableCell>
                        <TableCell><Badge variant="secondary">Semantic Duplication</Badge></TableCell>
                        <TableCell className="text-right font-mono">342</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Walmart</TableCell>
                        <TableCell className="font-mono text-xs">NEX-CHARGER</TableCell>
                        <TableCell><Badge variant="secondary">Velocity Spike</Badge></TableCell>
                        <TableCell className="text-right font-mono">15</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="col-span-3 bg-zinc-950/50 backdrop-blur-md border border-zinc-800 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    Investigation Engine
                  </CardTitle>
                  <CardDescription>Execute bipartite graph mapping and feature extraction.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 mb-8">
                    <Select value={targetNode} onValueChange={setTargetNode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Threat Node" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="104">Node 104 (NEX-PRO-MAX)</SelectItem>
                        <SelectItem value="342">Node 342 (NEX-LITE-W)</SelectItem>
                        <SelectItem value="15">Node 15 (NEX-CHARGER)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={handleInference} disabled={isAnalyzing} className="w-full gap-2">
                      {isAnalyzing ? (
                        <><div className="h-4 w-4 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" /> Extracting Graph Data...</>
                      ) : (
                        <>Execute Threat Inference <ArrowRight className="h-4 w-4" /></>
                      )}
                    </Button>
                  </div>

                  <div className="mt-auto pt-6 border-t border-border/50">
                    {error ? (
                      <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
                    ) : result ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Threat Level Score</span>
                            <span className={`text-2xl font-bold ${result.probability > 0.5 ? 'text-destructive' : 'text-emerald-500'}`}>
                              {(result.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={result.probability * 100} className={`h-2 ${result.probability > 0.5 ? '[&>div]:bg-destructive' : '[&>div]:bg-emerald-500'}`} />
                          <p className="text-xs text-muted-foreground mt-3">
                            {result.probability > 0.5 
                              ? "Signature: High semantic similarity and degree centrality anomaly." 
                              : "Signature: Organic distribution. No coordinated attack detected."}
                          </p>
                        </div>
                        {result.probability > 0.5 && (
                          <Button variant="outline" className="w-full gap-2 text-foreground shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-shadow">
                            <Download className="h-4 w-4" /> Export Dispute Payload CSV
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="h-24 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/50 rounded-lg">
                        <Activity className="h-5 w-5 mb-2 opacity-30" />
                        <span className="text-xs">Awaiting Inference Execution</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}