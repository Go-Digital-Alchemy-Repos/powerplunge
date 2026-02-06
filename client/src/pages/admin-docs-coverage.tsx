import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw, Download, CheckCircle, XCircle, AlertCircle, FileText, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";

interface ApiDomain {
  domain: string;
  displayName: string;
  endpointCount: number;
  hasDoc: boolean;
  hasAuthNotes: boolean;
  hasExamples: boolean;
}

interface FunctionalDoc {
  id: string;
  name: string;
  exists: boolean;
  isEmpty: boolean;
  wordCount: number;
}

interface CoverageData {
  apiCoveragePct: number;
  funcCoveragePct: number;
  apiDomains: ApiDomain[];
  functionalDocs: FunctionalDoc[];
  summary: {
    apiTotal: number;
    apiDocumented: number;
    funcTotal: number;
    funcComplete: number;
  };
}

function ProgressBar({ value, color = "cyan" }: { value: number; color?: string }) {
  const colorClasses = color === "cyan" ? "bg-cyan-500" : color === "green" ? "bg-green-500" : "bg-amber-500";
  return (
    <div className="w-full bg-gray-800 rounded-full h-3">
      <div
        className={`${colorClasses} rounded-full h-3 transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatusIcon({ status }: { status: "complete" | "partial" | "missing" }) {
  if (status === "complete") return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === "partial") return <AlertCircle className="w-4 h-4 text-amber-400" />;
  return <XCircle className="w-4 h-4 text-red-400" />;
}

export default function AdminDocsCoverage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const { data: coverage, isLoading } = useQuery<CoverageData>({
    queryKey: ["/api/admin/docs/coverage"],
    queryFn: async () => {
      const res = await fetch("/api/admin/docs/coverage", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coverage");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/docs/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Synced: ${data.summary.created} created, ${data.summary.updated} updated` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs/coverage"] });
    },
    onError: () => {
      toast({ title: "Failed to sync API docs", variant: "destructive" });
    },
  });

  if (adminLoading || !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <AdminNav currentPage="docs" />
        <div className="p-8 text-center text-gray-400">
          {adminLoading ? "Loading..." : "Access Denied"}
        </div>
      </div>
    );
  }

  const missingApiDocs = coverage?.apiDomains.filter(d => !d.hasDoc) || [];
  const incompleteApiDocs = coverage?.apiDomains.filter(d => d.hasDoc && (!d.hasAuthNotes || !d.hasExamples)) || [];
  const missingFuncDocs = coverage?.functionalDocs.filter(d => !d.exists || d.isEmpty) || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-docs-coverage-page">
      <AdminNav currentPage="docs" />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              Documentation Coverage
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track documentation completeness across API endpoints and functional areas</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="border-gray-700"
              data-testid="button-sync-coverage"
            >
              <Download className="w-4 h-4 mr-1" />
              {syncMutation.isPending ? "Syncing..." : "Sync API Docs"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/docs/coverage"] })}
              className="border-gray-700"
              data-testid="button-refresh-coverage"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-gray-500 text-center py-12">Loading coverage data...</div>
        ) : coverage ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-800" data-testid="card-api-coverage-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">API Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-white">{coverage.apiCoveragePct}%</span>
                    <span className="text-gray-500 text-sm mb-1">{coverage.summary.apiDocumented} / {coverage.summary.apiTotal} domains</span>
                  </div>
                  <ProgressBar value={coverage.apiCoveragePct} color={coverage.apiCoveragePct >= 80 ? "green" : coverage.apiCoveragePct >= 40 ? "cyan" : "amber"} />
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-func-coverage-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400 font-medium">Functional Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-white">{coverage.funcCoveragePct}%</span>
                    <span className="text-gray-500 text-sm mb-1">{coverage.summary.funcComplete} / {coverage.summary.funcTotal} complete</span>
                  </div>
                  <ProgressBar value={coverage.funcCoveragePct} color={coverage.funcCoveragePct >= 80 ? "green" : coverage.funcCoveragePct >= 40 ? "cyan" : "amber"} />
                </CardContent>
              </Card>
            </div>

            {(missingApiDocs.length > 0 || incompleteApiDocs.length > 0 || missingFuncDocs.length > 0) && (
              <Card className="bg-gray-900 border-amber-800/50" data-testid="card-missing-docs">
                <CardHeader>
                  <CardTitle className="text-sm text-amber-400 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Missing or Incomplete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {missingApiDocs.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Missing API Docs</div>
                      <div className="flex flex-wrap gap-1.5">
                        {missingApiDocs.map(d => (
                          <Badge key={d.domain} variant="outline" className="border-red-800 text-red-400 text-xs">{d.displayName}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {incompleteApiDocs.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Incomplete API Docs (missing auth notes or examples)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {incompleteApiDocs.map(d => (
                          <Badge key={d.domain} variant="outline" className="border-amber-800 text-amber-400 text-xs">{d.displayName}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {missingFuncDocs.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase mb-1">Missing or Empty Functional Docs</div>
                      <div className="flex flex-wrap gap-1.5">
                        {missingFuncDocs.map(d => (
                          <Badge key={d.id} variant="outline" className="border-red-800 text-red-400 text-xs">{d.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-gray-900 border-gray-800" data-testid="card-api-domains-detail">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400 font-medium">API Domains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {coverage.apiDomains.map(domain => {
                      const status = !domain.hasDoc ? "missing" : (!domain.hasAuthNotes || !domain.hasExamples) ? "partial" : "complete";
                      return (
                        <div key={domain.domain} className="flex items-center gap-2 text-sm" data-testid={`api-domain-${domain.domain}`}>
                          <StatusIcon status={status} />
                          <span className="text-gray-300 flex-1 truncate">{domain.displayName}</span>
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                            {domain.endpointCount} endpoint{domain.endpointCount !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800" data-testid="card-func-docs-detail">
                <CardHeader>
                  <CardTitle className="text-sm text-gray-400 font-medium">Functional Docs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {coverage.functionalDocs.map(doc => {
                      const status = !doc.exists ? "missing" : doc.isEmpty ? "partial" : "complete";
                      return (
                        <div key={doc.id} className="flex items-center gap-2 text-sm" data-testid={`func-doc-${doc.id}`}>
                          <StatusIcon status={status} />
                          <span className="text-gray-300 flex-1 truncate">{doc.name}</span>
                          {doc.exists && (
                            <span className="text-xs text-gray-500">{doc.wordCount} words</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
