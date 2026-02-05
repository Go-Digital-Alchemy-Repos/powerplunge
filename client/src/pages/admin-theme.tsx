import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Palette, Type, Image, Save, RefreshCw, Upload, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";

interface ThemeSettings {
  id: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImage: string | null;
  footerText: string | null;
  socialLinks: { facebook?: string; twitter?: string; instagram?: string; youtube?: string } | null;
}

const defaultTheme: Partial<ThemeSettings> = {
  primaryColor: "#67e8f9",
  secondaryColor: "#1e293b",
  accentColor: "#0ea5e9",
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  headingFont: "Inter",
  bodyFont: "Inter",
};

export default function AdminTheme() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [formData, setFormData] = useState<Partial<ThemeSettings>>(defaultTheme);
  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [heroImageUploading, setHeroImageUploading] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [faviconPickerOpen, setFaviconPickerOpen] = useState(false);
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile } = useUpload({
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setFormData({ ...formData, logoUrl: result.objectPath });
        toast({ title: "Logo uploaded successfully" });
      }
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaviconUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setFormData({ ...formData, faviconUrl: result.objectPath });
        toast({ title: "Favicon uploaded successfully" });
      }
    } finally {
      setFaviconUploading(false);
      if (faviconInputRef.current) faviconInputRef.current.value = "";
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroImageUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        setFormData({ ...formData, heroImage: result.objectPath });
        toast({ title: "Hero image uploaded successfully" });
      }
    } finally {
      setHeroImageUploading(false);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
    }
  };

  const { data: theme, isLoading } = useQuery<ThemeSettings>({
    queryKey: ["/api/admin/theme"],
  });

  useEffect(() => {
    if (theme) {
      setFormData({ ...defaultTheme, ...theme });
    }
  }, [theme]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ThemeSettings>) => {
      const res = await fetch("/api/admin/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save theme");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Theme settings saved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/theme"] });
      queryClient.invalidateQueries({ queryKey: ["/api/theme"] });
    },
    onError: () => {
      toast({ title: "Failed to save theme settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData(defaultTheme);
  };

  const updateSocialLink = (platform: string, value: string) => {
    setFormData({
      ...formData,
      socialLinks: {
        ...(formData.socialLinks || {}),
        [platform]: value,
      },
    });
  };

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-slate-400">You don't have permission to access theme settings. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Theme Editor</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} data-testid="button-reset">
              <RefreshCw className="w-4 h-4 mr-2" /> Reset to Default
            </Button>
            <Button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600" disabled={saveMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Logo</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.logoUrl || ""}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="Enter URL or select from library"
                        className="bg-slate-700 border-slate-600 flex-1"
                        data-testid="input-logo"
                      />
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        data-testid="input-logo-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setLogoPickerOpen(true)}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-library-logo"
                        title="Select from Media Library"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-browse-logo"
                        title="Upload new file"
                      >
                        {logoUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {formData.logoUrl && (
                      <div className="mt-2">
                        <img src={formData.logoUrl} alt="Logo preview" className="h-12 object-contain bg-slate-700 rounded p-1" />
                      </div>
                    )}
                    <MediaPickerDialog
                      open={logoPickerOpen}
                      onOpenChange={setLogoPickerOpen}
                      onSelect={(url) => setFormData({ ...formData, logoUrl: url })}
                      title="Select Logo"
                    />
                  </div>
                  <div>
                    <Label>Favicon</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.faviconUrl || ""}
                        onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                        placeholder="Enter URL or select from library"
                        className="bg-slate-700 border-slate-600 flex-1"
                        data-testid="input-favicon"
                      />
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*,.ico"
                        onChange={handleFaviconUpload}
                        className="hidden"
                        data-testid="input-favicon-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFaviconPickerOpen(true)}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-library-favicon"
                        title="Select from Media Library"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={faviconUploading}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-browse-favicon"
                        title="Upload new file"
                      >
                        {faviconUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {formData.faviconUrl && (
                      <div className="mt-2">
                        <img src={formData.faviconUrl} alt="Favicon preview" className="h-8 object-contain bg-slate-700 rounded p-1" />
                      </div>
                    )}
                    <MediaPickerDialog
                      open={faviconPickerOpen}
                      onOpenChange={setFaviconPickerOpen}
                      onSelect={(url) => setFormData({ ...formData, faviconUrl: url })}
                      title="Select Favicon"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.primaryColor || "#67e8f9"}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="w-12 h-10 p-1 bg-slate-700 border-slate-600"
                          data-testid="input-primary-color"
                        />
                        <Input
                          value={formData.primaryColor || ""}
                          onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          data-testid="input-primary-color-hex"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.secondaryColor || "#1e293b"}
                          onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                          className="w-12 h-10 p-1 bg-slate-700 border-slate-600"
                          data-testid="input-secondary-color"
                        />
                        <Input
                          value={formData.secondaryColor || ""}
                          onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          data-testid="input-secondary-color-hex"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.accentColor || "#0ea5e9"}
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                          className="w-12 h-10 p-1 bg-slate-700 border-slate-600"
                          data-testid="input-accent-color"
                        />
                        <Input
                          value={formData.accentColor || ""}
                          onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          data-testid="input-accent-color-hex"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.backgroundColor || "#0f172a"}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="w-12 h-10 p-1 bg-slate-700 border-slate-600"
                          data-testid="input-bg-color"
                        />
                        <Input
                          value={formData.backgroundColor || ""}
                          onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          data-testid="input-bg-color-hex"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.textColor || "#f8fafc"}
                          onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                          className="w-12 h-10 p-1 bg-slate-700 border-slate-600"
                          data-testid="input-text-color"
                        />
                        <Input
                          value={formData.textColor || ""}
                          onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                          data-testid="input-text-color-hex"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Type className="w-5 h-5" />
                    Typography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Heading Font</Label>
                    <Input
                      value={formData.headingFont || ""}
                      onChange={(e) => setFormData({ ...formData, headingFont: e.target.value })}
                      placeholder="Inter"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-heading-font"
                    />
                  </div>
                  <div>
                    <Label>Body Font</Label>
                    <Input
                      value={formData.bodyFont || ""}
                      onChange={(e) => setFormData({ ...formData, bodyFont: e.target.value })}
                      placeholder="Inter"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-body-font"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Hero Section</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Hero Title</Label>
                    <Input
                      value={formData.heroTitle || ""}
                      onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                      placeholder="Transform Your Recovery"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-hero-title"
                    />
                  </div>
                  <div>
                    <Label>Hero Subtitle</Label>
                    <Textarea
                      value={formData.heroSubtitle || ""}
                      onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                      placeholder="Experience the power of cold therapy"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-hero-subtitle"
                    />
                  </div>
                  <div>
                    <Label>Hero Background Image</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.heroImage || ""}
                        onChange={(e) => setFormData({ ...formData, heroImage: e.target.value })}
                        placeholder="Enter URL or select from library"
                        className="bg-slate-700 border-slate-600 flex-1"
                        data-testid="input-hero-image"
                      />
                      <input
                        ref={heroImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        className="hidden"
                        data-testid="input-hero-image-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setHeroPickerOpen(true)}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-library-hero-image"
                        title="Select from Media Library"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => heroImageInputRef.current?.click()}
                        disabled={heroImageUploading}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                        data-testid="button-browse-hero-image"
                        title="Upload new file"
                      >
                        {heroImageUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {formData.heroImage && (
                      <div className="mt-2">
                        <img src={formData.heroImage} alt="Hero image preview" className="h-24 w-full object-cover bg-slate-700 rounded" />
                      </div>
                    )}
                    <MediaPickerDialog
                      open={heroPickerOpen}
                      onOpenChange={setHeroPickerOpen}
                      onSelect={(url) => setFormData({ ...formData, heroImage: url })}
                      title="Select Hero Image"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Footer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Footer Text</Label>
                    <Textarea
                      value={formData.footerText || ""}
                      onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                      placeholder="© 2026 Power Plunge. All rights reserved."
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-footer-text"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Facebook</Label>
                    <Input
                      value={formData.socialLinks?.facebook || ""}
                      onChange={(e) => updateSocialLink("facebook", e.target.value)}
                      placeholder="https://facebook.com/powerplunge"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-facebook"
                    />
                  </div>
                  <div>
                    <Label>Twitter / X</Label>
                    <Input
                      value={formData.socialLinks?.twitter || ""}
                      onChange={(e) => updateSocialLink("twitter", e.target.value)}
                      placeholder="https://twitter.com/powerplunge"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-twitter"
                    />
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input
                      value={formData.socialLinks?.instagram || ""}
                      onChange={(e) => updateSocialLink("instagram", e.target.value)}
                      placeholder="https://instagram.com/powerplunge"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-instagram"
                    />
                  </div>
                  <div>
                    <Label>YouTube</Label>
                    <Input
                      value={formData.socialLinks?.youtube || ""}
                      onChange={(e) => updateSocialLink("youtube", e.target.value)}
                      placeholder="https://youtube.com/powerplunge"
                      className="bg-slate-700 border-slate-600"
                      data-testid="input-youtube"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="p-6 rounded-lg"
                    style={{ backgroundColor: formData.backgroundColor }}
                  >
                    <h2
                      className="text-2xl font-bold mb-2"
                      style={{ color: formData.primaryColor, fontFamily: formData.headingFont }}
                    >
                      {formData.heroTitle || "Sample Heading"}
                    </h2>
                    <p style={{ color: formData.textColor, fontFamily: formData.bodyFont }}>
                      {formData.heroSubtitle || "This is sample body text to preview your theme settings."}
                    </p>
                    <button
                      className="mt-4 px-4 py-2 rounded font-medium"
                      style={{ backgroundColor: formData.accentColor, color: formData.backgroundColor }}
                    >
                      Sample Button
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
