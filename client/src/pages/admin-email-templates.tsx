import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlideOutPanel, PanelFooter } from "@/components/ui/slide-out-panel";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Mail, Save, FileText, Eye, Code, RefreshCw } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const MERGE_TAGS = [
  { tag: "{{ORDER_NUMBER}}", description: "Order ID" },
  { tag: "{{ORDER_DATE}}", description: "Order date" },
  { tag: "{{ORDER_TOTAL}}", description: "Order total (formatted)" },
  { tag: "{{CUSTOMER_NAME}}", description: "Customer's name" },
  { tag: "{{CUSTOMER_EMAIL}}", description: "Customer's email" },
  { tag: "{{CUSTOMER_PHONE}}", description: "Customer's phone" },
  { tag: "{{SHIPPING_ADDRESS}}", description: "Full shipping address (HTML)" },
  { tag: "{{ORDER_ITEMS_HTML}}", description: "Order items list (HTML)" },
  { tag: "{{ORDER_ITEMS_TEXT}}", description: "Order items list (text)" },
  { tag: "{{COMPANY_NAME}}", description: "Your company name" },
  { tag: "{{SUPPORT_EMAIL}}", description: "Support email address" },
  { tag: "{{CARRIER}}", description: "Shipping carrier name" },
  { tag: "{{TRACKING_NUMBER}}", description: "Tracking number" },
  { tag: "{{TRACKING_URL}}", description: "Tracking URL" },
  { tag: "{{ADMIN_ORDER_URL}}", description: "Admin order link" },
];

export default function AdminEmailTemplates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"html" | "text">("html");

  const { data: templates, isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    queryFn: async () => {
      const res = await fetch("/api/admin/email-templates", { credentials: "include" });
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      setEditedTemplate({
        subject: selectedTemplate.subject,
        bodyHtml: selectedTemplate.bodyHtml,
        bodyText: selectedTemplate.bodyText || "",
        isEnabled: selectedTemplate.isEnabled,
      });
    }
  }, [selectedTemplate]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<EmailTemplate>) => {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const res = await fetch(`/api/admin/email-templates/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (selectedTemplate) {
      updateMutation.mutate({ id: selectedTemplate.id, ...editedTemplate });
    }
  };

  const insertMergeTag = (tag: string) => {
    if (activeTab === "html") {
      setEditedTemplate({ ...editedTemplate, bodyHtml: (editedTemplate.bodyHtml || "") + tag });
    } else {
      setEditedTemplate({ ...editedTemplate, bodyText: (editedTemplate.bodyText || "") + tag });
    }
  };

  const getPreviewHtml = () => {
    const sampleData: Record<string, string> = {
      "{{ORDER_NUMBER}}": "ORD-12345",
      "{{ORDER_DATE}}": "January 9, 2026",
      "{{ORDER_TOTAL}}": "2,250.00",
      "{{CUSTOMER_NAME}}": "John Smith",
      "{{CUSTOMER_EMAIL}}": "john@example.com",
      "{{CUSTOMER_PHONE}}": "(555) 123-4567",
      "{{SHIPPING_ADDRESS}}": "123 Main Street<br>Austin, TX 78701<br>USA",
      "{{ORDER_ITEMS_HTML}}": '<div style="padding:10px 0;border-bottom:1px solid #333;"><strong>Power Plunge™ Tub</strong> x 1<br>$2,250.00</div>',
      "{{ORDER_ITEMS_TEXT}}": "- Power Plunge™ Tub x 1 @ $2,250.00",
      "{{COMPANY_NAME}}": "Power Plunge",
      "{{SUPPORT_EMAIL}}": "support@powerplunge.com",
      "{{CARRIER}}": "UPS",
      "{{TRACKING_NUMBER}}": "1Z999AA10123456784",
      "{{TRACKING_URL}}": "https://www.ups.com/track",
      "{{ADMIN_ORDER_URL}}": "/admin/orders",
    };

    let preview = editedTemplate.bodyHtml || "";
    for (const [tag, value] of Object.entries(sampleData)) {
      preview = preview.replace(new RegExp(tag.replace(/[{}]/g, "\\$&"), "g"), value);
    }
    return preview;
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access email templates. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="email-templates" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold">Email Templates</h2>
            <p className="text-muted-foreground mt-1">Customize the emails sent to customers</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Templates</h3>
              {templates?.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${selectedTemplate?.id === template.id ? "border-primary" : ""}`}
                  onClick={() => setSelectedTemplate(template)}
                  data-testid={`template-card-${template.key}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium truncate">{template.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={template.isEnabled 
                            ? "bg-green-500/20 text-green-500 border-green-500/30" 
                            : "bg-gray-500/20 text-gray-500 border-gray-500/30"
                          }
                        >
                          {template.isEnabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedTemplate.name}</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">
                          Key: {selectedTemplate.key}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="enabled" className="text-sm">Enabled</Label>
                          <Switch
                            id="enabled"
                            checked={editedTemplate.isEnabled}
                            onCheckedChange={(checked) => {
                              setEditedTemplate({ ...editedTemplate, isEnabled: checked });
                              toggleMutation.mutate({ id: selectedTemplate.id, isEnabled: checked });
                            }}
                            data-testid="switch-enabled"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={editedTemplate.subject || ""}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                        placeholder="Email subject..."
                        data-testid="input-subject"
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Merge Tags</Label>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {MERGE_TAGS.slice(0, 8).map((tag) => (
                          <Button
                            key={tag.tag}
                            variant="outline"
                            size="sm"
                            className="text-xs font-mono h-7"
                            onClick={() => insertMergeTag(tag.tag)}
                            title={tag.description}
                          >
                            {tag.tag.replace(/\{\{|\}\}/g, "")}
                          </Button>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toast({ title: "All Merge Tags", description: MERGE_TAGS.map(t => `${t.tag}: ${t.description}`).join("\n") })}
                        >
                          +{MERGE_TAGS.length - 8} more
                        </Button>
                      </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "html" | "text")}>
                      <TabsList>
                        <TabsTrigger value="html" className="gap-2">
                          <Code className="w-4 h-4" />
                          HTML Body
                        </TabsTrigger>
                        <TabsTrigger value="text" className="gap-2">
                          <FileText className="w-4 h-4" />
                          Plain Text
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="html" className="mt-4">
                        <Textarea
                          value={editedTemplate.bodyHtml || ""}
                          onChange={(e) => setEditedTemplate({ ...editedTemplate, bodyHtml: e.target.value })}
                          className="font-mono text-sm min-h-[300px]"
                          placeholder="HTML email body..."
                          data-testid="textarea-body-html"
                        />
                      </TabsContent>
                      <TabsContent value="text" className="mt-4">
                        <Textarea
                          value={editedTemplate.bodyText || ""}
                          onChange={(e) => setEditedTemplate({ ...editedTemplate, bodyText: e.target.value })}
                          className="font-mono text-sm min-h-[300px]"
                          placeholder="Plain text email body (optional fallback)..."
                          data-testid="textarea-body-text"
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                        data-testid="button-save"
                      >
                        {updateMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Template
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setPreviewOpen(true)}
                        className="gap-2"
                        data-testid="button-preview"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a template to edit
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <SlideOutPanel
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Email Preview"
        width="lg"
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setPreviewOpen(false)} data-testid="button-close-preview">
              Close Preview
            </Button>
          </div>
        }
      >
        <div className="border rounded-lg p-4 bg-white text-black">
          <div className="border-b pb-3 mb-4">
            <p className="text-sm text-gray-500">Subject:</p>
            <p className="font-medium">{editedTemplate.subject}</p>
          </div>
          <div dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
        </div>
      </SlideOutPanel>
    </div>
  );
}
