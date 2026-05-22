"use client";

import React from "react";
import { Activity, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <section className="space-y-8">
      <Card className="border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Reports & exports</CardTitle>
          <CardDescription className="text-white/60">
            Generate evidence packs, trend summaries, and executive-ready reports.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Latest report</CardTitle>
            <CardDescription className="text-white/60">Marketplace defense summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm text-white/60">Marketplace defense report • 12 pages</div>
              <div className="mt-2 text-xs text-white/45">Generated 2 hours ago</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="bg-white text-black hover:bg-white/90">
                <Download className="mr-2 h-4 w-4" />
                Download report
              </Button>
              <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Sparkles className="mr-2 h-4 w-4" />
                Schedule export
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/[0.06] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity log
            </CardTitle>
            <CardDescription className="text-white/60">
              Recent actions across your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 text-sm text-white/65">
            {[
              "Alert rule updated for Amazon (Burst detection).",
              "Dispute packet exported for NEX-PRO-MAX.",
              "Shopify Plus sync completed.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
