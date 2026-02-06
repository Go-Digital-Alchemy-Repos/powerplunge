import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, ChevronRight, ChevronDown, RefreshCw, FileText, Rocket,
  Layers, Sparkles, Code, Monitor, Server, Shield, Database, TestTube,
  Cloud, Terminal, Settings, Plug, AlertTriangle, BookOpen, History,
  FileJson, ClipboardList, Folder, ExternalLink, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Rocket, Layers, Sparkles, Code, Monitor, Server, Shield, Database,
  TestTube, Cloud, Terminal, Settings, Plug, AlertTriangle, BookOpen,
  History, FileJson, ClipboardList, Folder, FileText,
};

interface DocMeta {
  id: string;
  filename: string;
  title: string;
  category: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface CategoryGroup {
  id: string;
  displayName: string;
  icon: string;
  order: number;
  docs: DocMeta[];
}

interface DocDetail {
  id: string;
  filename: string;
  title: string;
  content: string;
  relativePath: string;
  sizeBytes: number;
  modifiedAt: string;
}

interface SyncResult {
  success: boolean;
  summary: { created: number; updated: number; skipped: number; errors: number };
  details: Array<{ domain: string; action: string; file: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function InlineContent({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="bg-gray-800 text-cyan-300 px-1.5 py-0.5 rounded text-sm font-mono">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      parts.push(
        <a key={key++} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1">
          {linkMatch[1]}<ExternalLink className="w-3 h-3" />
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/`|\*\*|\[/);
    if (nextSpecial === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    } else if (nextSpecial === 0) {
      parts.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    } else {
      parts.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{parts}</>;
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <div key={elements.length} className="my-3">
          {lang && <div className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-t border border-b-0 border-gray-700 font-mono">{lang}</div>}
          <pre className={`bg-gray-900 p-4 rounded${lang ? "-b" : ""} overflow-x-auto border border-gray-700 text-sm`}>
            <code className="text-green-300 font-mono">{codeLines.join("\n")}</code>
          </pre>
        </div>
      );
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={elements.length} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2"><InlineContent text={line.slice(2)} /></h1>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={elements.length} className="text-xl font-semibold text-white mt-5 mb-2"><InlineContent text={line.slice(3)} /></h2>);
      i++; continue;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={elements.length} className="text-lg font-medium text-gray-200 mt-4 mb-2"><InlineContent text={line.slice(4)} /></h3>);
      i++; continue;
    }
    if (line.startsWith("#### ")) {
      elements.push(<h4 key={elements.length} className="text-base font-medium text-gray-300 mt-3 mb-1"><InlineContent text={line.slice(5)} /></h4>);
      i++; continue;
    }

    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-cyan-500 pl-4 py-1 my-2 text-gray-400 italic">
          <InlineContent text={line.slice(2)} />
        </blockquote>
      );
      i++; continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      elements.push(<hr key={elements.length} className="border-gray-700 my-4" />);
      i++; continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(
          <li key={listItems.length} className="text-gray-300 ml-4">
            <InlineContent text={lines[i].slice(2)} />
          </li>
        );
        i++;
      }
      elements.push(<ul key={elements.length} className="list-disc pl-4 my-2 space-y-1">{listItems}</ul>);
      continue;
    }

    const numberedMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const m = lines[i].match(/^\d+\.\s+(.*)/);
        if (m) {
          listItems.push(
            <li key={listItems.length} className="text-gray-300 ml-4">
              <InlineContent text={m[1]} />
            </li>
          );
        }
        i++;
      }
      elements.push(<ol key={elements.length} className="list-decimal pl-4 my-2 space-y-1">{listItems}</ol>);
      continue;
    }

    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows: string[][] = [];
      let hasHeader = false;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        if (/^\|[\s-:|]+\|$/.test(row)) {
          hasHeader = true;
          i++; continue;
        }
        const cells = row.split("|").slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }

      if (tableRows.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-3">
            <table className="w-full text-sm border border-gray-700">
              {hasHeader && tableRows.length > 0 && (
                <thead>
                  <tr className="bg-gray-800">
                    {tableRows[0].map((cell, ci) => (
                      <th key={ci} className="px-3 py-2 text-left text-gray-300 font-medium border-b border-gray-700">
                        <InlineContent text={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.slice(hasHeader ? 1 : 0).map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-800 hover:bg-gray-800/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-400">
                        <InlineContent text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.startsWith("<!--")) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++; continue;
    }

    if (line.trim() === "") {
      i++; continue;
    }

    elements.push(<p key={elements.length} className="text-gray-300 my-1.5 leading-relaxed"><InlineContent text={line} /></p>);
    i++;
  }

  return <div className="prose prose-invert max-w-none">{elements}</div>;
}

export default function AdminDocs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasFullAccess, isLoading: adminLoading } = useAdmin();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: docsData, isLoading } = useQuery<{ categories: CategoryGroup[] }>({
    queryKey: ["/api/admin/docs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/docs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch docs");
      return res.json();
    },
  });

  const { data: selectedDoc, isLoading: docLoading } = useQuery<DocDetail>({
    queryKey: ["/api/admin/docs", selectedDocId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/docs/${selectedDocId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!selectedDocId,
  });

  const syncMutation = useMutation<SyncResult>({
    mutationFn: async () => {
      const res = await fetch("/api/admin/docs/sync", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `API Docs Synced: ${data.summary.created} created, ${data.summary.updated} updated` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: () => {
      toast({ title: "Failed to sync API docs", variant: "destructive" });
    },
  });

  const categories = docsData?.categories || [];

  const allDocsExpanded = useMemo(() => {
    if (expandedCategories.size === 0 && categories.length > 0) {
      return new Set(categories.map(c => c.id));
    }
    return expandedCategories;
  }, [expandedCategories, categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories
      .map(cat => ({
        ...cat,
        docs: cat.docs.filter(doc =>
          doc.title.toLowerCase().includes(q) ||
          doc.filename.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.docs.length > 0);
  }, [categories, searchQuery]);

  const totalDocs = categories.reduce((sum, cat) => sum + cat.docs.length, 0);

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const base = prev.size === 0 ? new Set(categories.map(c => c.id)) : new Set(prev);
      if (base.has(catId)) {
        base.delete(catId);
      } else {
        base.add(catId);
      }
      return base;
    });
  };

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

  return (
    <div className="min-h-screen bg-gray-950 text-white" data-testid="admin-docs-page">
      <AdminNav currentPage="docs" />

      <div className="flex h-[calc(100vh-64px)]">
        <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-950">
          <div className="p-3 border-b border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Documentation</h2>
              <Badge variant="secondary" className="text-xs" data-testid="badge-doc-count">{totalDocs} docs</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-900 border-gray-700 h-9 text-sm"
                data-testid="input-search-docs"
              />
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="flex-1 text-xs h-8 border-gray-700"
                data-testid="button-sync-api-docs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {syncMutation.isPending ? "Syncing..." : "Sync API Docs"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] })}
                className="h-8 px-2 border-gray-700"
                data-testid="button-refresh-docs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-gray-500 text-sm">Loading docs...</div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                {searchQuery ? "No matching documents" : "No documentation found"}
              </div>
            ) : (
              filteredCategories.map(cat => {
                const IconComponent = ICON_MAP[cat.icon] || FileText;
                const isExpanded = allDocsExpanded.has(cat.id);

                return (
                  <div key={cat.id} className="border-b border-gray-800/50" data-testid={`category-${cat.id}`}>
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-900 text-left text-sm"
                      data-testid={`button-toggle-category-${cat.id}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      )}
                      <IconComponent className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-gray-300 font-medium truncate flex-1">{cat.displayName}</span>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-gray-700 text-gray-500">
                        {cat.docs.length}
                      </Badge>
                    </button>

                    {isExpanded && (
                      <div className="pb-1">
                        {cat.docs.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className={`w-full text-left px-3 py-1.5 pl-10 text-sm truncate transition-colors ${
                              selectedDocId === doc.id
                                ? "bg-cyan-900/30 text-cyan-300 border-r-2 border-cyan-400"
                                : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                            }`}
                            data-testid={`button-select-doc-${doc.id}`}
                          >
                            {doc.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-950">
          {selectedDocId && selectedDoc ? (
            <div className="max-w-4xl mx-auto p-6" data-testid="doc-viewer">
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-800">
                <span>{selectedDoc.relativePath}</span>
                <span>|</span>
                <span>{formatBytes(selectedDoc.sizeBytes)}</span>
                <span>|</span>
                <span>Modified {formatDate(selectedDoc.modifiedAt)}</span>
              </div>
              <MarkdownRenderer content={selectedDoc.content} />
            </div>
          ) : docLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading document...
            </div>
          ) : (
            <div className="flex items-center justify-center h-full" data-testid="doc-welcome">
              <div className="text-center max-w-lg">
                <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-300 mb-2">App Documentation</h2>
                <p className="text-gray-500 mb-6">
                  Browse project documentation organized by category. Select a document from the sidebar to view its contents.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {categories.slice(0, 4).map(cat => {
                    const IconComp = ICON_MAP[cat.icon] || FileText;
                    return (
                      <Card
                        key={cat.id}
                        className="bg-gray-900 border-gray-800 hover:border-cyan-800 cursor-pointer transition-colors"
                        onClick={() => {
                          setExpandedCategories(prev => {
                            const base = new Set(prev);
                            base.add(cat.id);
                            return base;
                          });
                          if (cat.docs.length > 0) setSelectedDocId(cat.docs[0].id);
                        }}
                        data-testid={`card-quick-link-${cat.id}`}
                      >
                        <CardContent className="p-3 flex items-center gap-2">
                          <IconComp className="w-5 h-5 text-cyan-400" />
                          <div>
                            <div className="text-sm text-gray-300 font-medium">{cat.displayName}</div>
                            <div className="text-xs text-gray-500">{cat.docs.length} doc{cat.docs.length !== 1 ? "s" : ""}</div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
