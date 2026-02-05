import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { 
  ArrowLeft, Save, Eye, Settings, Plus, Trash2, Copy, GripVertical, 
  Monitor, Smartphone, ChevronDown, ChevronRight, ChevronUp, Home, ShoppingBag,
  Type, Image, Grid, Layout, Quote, HelpCircle, Megaphone, Users, 
  List, Minus, Square, Video, Shield, Table, Layers, X, FileText,
  Bookmark, BookMarked, FolderPlus, Upload, Loader2, FolderOpen, Sparkles, 
  EyeOff, Search
} from "lucide-react";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import PageRenderer from "@/components/PageRenderer";
import { IconPicker } from "@/components/ui/IconPicker";
import { AIContentButton } from "@/components/ui/AIContentButton";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/hooks/use-admin";
import AdminNav from "@/components/admin/AdminNav";
import { Card, CardContent } from "@/components/ui/card";

interface BlockSettings {
  visibility?: 'all' | 'desktop' | 'mobile';
  className?: string;
  anchor?: string;
  alignment?: 'left' | 'center' | 'right';
  background?: 'none' | 'light' | 'dark' | 'primary' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  splitLayout?: 'none' | 'left' | 'right';
}

interface PageBlock {
  id: string;
  type: string;
  data: Record<string, any>;
  settings?: BlockSettings;
}

interface PageContentJson {
  version: number;
  blocks: PageBlock[];
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  contentJson: PageContentJson | null;
  pageType: string | null;
  template: string | null;
  isHome: boolean;
  isShop: boolean;
  featuredImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  robots: string | null;
  status: string;
  showInNav: boolean;
  navOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  contentJson?: PageContentJson;
}

interface SavedSection {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  blocks: PageBlock[];
}

// Helper component for inputs with AI generation
function AIInput({ 
  label, 
  value, 
  onChange, 
  fieldType, 
  context, 
  blockType, 
  multiline = false,
  className = "",
  testIdPrefix = ""
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  fieldType: 'heading' | 'subheading' | 'description' | 'cta' | 'feature_title' | 'feature_description' | 'tagline' | 'bullet_point';
  context?: string;
  blockType?: string;
  multiline?: boolean;
  className?: string;
  testIdPrefix?: string;
}) {
  const testIdBase = testIdPrefix || `${blockType}-${fieldType}`;
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <AIContentButton
          fieldType={fieldType}
          context={context}
          blockType={blockType}
          onGenerate={onChange}
          testId={`btn-ai-${testIdBase}`}
        />
      </div>
      {multiline ? (
        <Textarea 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="bg-muted border-border mt-1" 
          data-testid={`textarea-${testIdBase}`}
        />
      ) : (
        <Input 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          className="bg-muted border-border mt-1" 
          data-testid={`input-${testIdBase}`}
        />
      )}
    </div>
  );
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero', icon: Layout, description: 'Full-width hero section' },
  { type: 'statsBar', label: 'Stats Bar', icon: Grid, description: 'Stats with icons' },
  { type: 'featuredProduct', label: 'Featured Product', icon: ShoppingBag, description: 'Featured product display' },
  { type: 'iconGrid', label: 'Icon Grid', icon: Grid, description: 'Icons with titles' },
  { type: 'richText', label: 'Rich Text', icon: Type, description: 'Text content block' },
  { type: 'image', label: 'Image', icon: Image, description: 'Single image with caption' },
  { type: 'imageGrid', label: 'Image Grid', icon: Grid, description: 'Grid of images' },
  { type: 'productGrid', label: 'Product Grid', icon: ShoppingBag, description: 'Display products' },
  { type: 'testimonial', label: 'Testimonials', icon: Quote, description: 'Customer testimonials' },
  { type: 'faq', label: 'FAQ', icon: HelpCircle, description: 'Frequently asked questions' },
  { type: 'cta', label: 'Call to Action', icon: Megaphone, description: 'CTA banner' },
  { type: 'logoCloud', label: 'Logo Cloud', icon: Users, description: 'Partner/client logos' },
  { type: 'featureList', label: 'Feature List', icon: List, description: 'Features with icons' },
  { type: 'divider', label: 'Divider', icon: Minus, description: 'Horizontal divider' },
  { type: 'spacer', label: 'Spacer', icon: Square, description: 'Vertical spacing' },
  { type: 'videoEmbed', label: 'Video', icon: Video, description: 'YouTube/Vimeo embed' },
  { type: 'guarantee', label: 'Guarantee', icon: Shield, description: 'Guarantee badge' },
  { type: 'comparisonTable', label: 'Comparison Table', icon: Table, description: 'Feature comparison' },
  { type: 'slider', label: 'Slider', icon: Layers, description: 'Image carousel' },
];

const getDefaultBlockData = (type: string): Record<string, any> => {
  const defaults: Record<string, Record<string, any>> = {
    hero: { title: 'Welcome', subtitle: 'Your subtitle here', ctaText: 'Get Started', ctaLink: '#', backgroundImage: '', secondaryCtaText: '', secondaryCtaLink: '' },
    statsBar: { stats: [{ icon: 'check', label: 'Stat Label', value: 'Value' }] },
    featuredProduct: { title: 'Featured Product', titleHighlight: 'Product', subtitle: 'The best product for you.' },
    iconGrid: { title: 'Perfect For', titleHighlight: 'For', columns: 4, items: [{ icon: 'star', title: 'Category' }] },
    richText: { content: '<p>Enter your content here...</p>' },
    image: { src: '', alt: '', caption: '' },
    imageGrid: { title: '', columns: 3, images: [] },
    productGrid: { title: 'Our Products', mode: 'all', columns: 3, limit: 4, productIds: [] },
    testimonial: { title: 'What Our Customers Say', testimonials: [] },
    faq: { title: 'Frequently Asked Questions', items: [] },
    cta: { title: 'Ready to Get Started?', subtitle: '', primaryButton: 'Shop Now', primaryLink: '/shop' },
    logoCloud: { title: 'Trusted By', logos: [] },
    featureList: { title: 'Features', subtitle: '', columns: 3, features: [] },
    divider: { style: 'solid', color: 'default' },
    spacer: { size: 'md' },
    videoEmbed: { title: '', url: '', thumbnail: '' },
    guarantee: { title: '30-Day Money Back Guarantee', description: 'Not satisfied? Get a full refund.', details: [] },
    comparisonTable: { title: '', columns: [], rows: [] },
    slider: { title: '', slides: [] },
  };
  return defaults[type] || {};
};

const generateBlockId = () => `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function AdminPageBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [showAddBlockSheet, setShowAddBlockSheet] = useState(false);
  const [addBlockTab, setAddBlockTab] = useState<'blocks' | 'templates' | 'sections'>('blocks');
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<'blocks' | 'settings'>('blocks');
  const [showSaveSectionDialog, setShowSaveSectionDialog] = useState(false);
  const [selectedBlocksForSection, setSelectedBlocksForSection] = useState<string[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionCategory, setNewSectionCategory] = useState('general');
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);

  const { data: fetchedPage, isLoading } = useQuery<Page>({
    queryKey: [`/api/admin/pages/${id}`],
    enabled: !!id && id !== 'new',
  });

  const { data: templates = [] } = useQuery<PageTemplate[]>({
    queryKey: ['/api/admin/page-templates'],
  });

  const { data: savedSections = [] } = useQuery<SavedSection[]>({
    queryKey: ['/api/admin/saved-sections'],
  });

  useEffect(() => {
    if (fetchedPage) {
      setPage(fetchedPage);
      if (fetchedPage.contentJson?.blocks) {
        setBlocks(fetchedPage.contentJson.blocks);
      }
    } else if (id === 'new') {
      setPage({
        id: '',
        title: 'New Page',
        slug: 'new-page',
        content: null,
        contentJson: null,
        pageType: 'page',
        template: 'default',
        isHome: false,
        isShop: false,
        featuredImage: null,
        metaTitle: null,
        metaDescription: null,
        metaKeywords: null,
        canonicalUrl: null,
        ogTitle: null,
        ogDescription: null,
        ogImage: null,
        twitterCard: 'summary_large_image',
        twitterTitle: null,
        twitterDescription: null,
        twitterImage: null,
        robots: 'index, follow',
        status: 'draft',
        showInNav: false,
        navOrder: 0,
      });
    }
  }, [fetchedPage, id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (page && isDirty) {
          handleSave();
        }
      }
      
      // Cmd/Ctrl+Shift+A to open add block sheet
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAddBlockSheet(true);
      }
      
      // Delete/Backspace to delete selected block (when not in input)
      if (!isInputField && selectedBlockId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteBlock(selectedBlockId);
      }
      
      // Escape to deselect block
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        setShowAddBlockSheet(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, isDirty, selectedBlockId]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Page>) => {
      const url = id === 'new' ? '/api/admin/pages' : `/api/admin/pages/${id}`;
      const method = id === 'new' ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to save page');
      }
      return res.json();
    },
    onSuccess: (savedPage) => {
      toast({ title: 'Page saved successfully!' });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pages'] });
      if (id === 'new') {
        navigate(`/admin/pages/${savedPage.id}/edit`);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save page', description: error.message, variant: 'destructive' });
    },
  });

  const setHomePageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/pages/${id}/set-home`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set as home page');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Set as home page!' });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pages/${id}`] });
    },
  });

  const setShopPageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/pages/${id}/set-shop`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to set as shop page');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Set as shop page!' });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pages/${id}`] });
    },
  });

  const saveSectionMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; blocks: PageBlock[] }) => {
      const res = await fetch('/api/admin/saved-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save section');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Section saved!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saved-sections'] });
      setShowSaveSectionDialog(false);
      setSelectedBlocksForSection([]);
      setNewSectionName('');
    },
    onError: () => {
      toast({ title: 'Failed to save section', variant: 'destructive' });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const res = await fetch(`/api/admin/saved-sections/${sectionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete section');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Section deleted!' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/saved-sections'] });
    },
  });

  const handleGenerateSeo = async () => {
    if (!page) return;
    setIsGeneratingSeo(true);
    try {
      const blockContent = blocks.map(b => {
        if (b.data.heading) return b.data.heading;
        if (b.data.content) return b.data.content;
        if (b.data.title) return b.data.title;
        if (b.data.text) return b.data.text;
        return '';
      }).filter(Boolean).join(' ');

      const res = await fetch('/api/admin/pages/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: page.title,
          content: blockContent,
          pageType: page.pageType || 'page',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate SEO');
      }

      const seoData = await res.json();
      setPage({
        ...page,
        metaTitle: seoData.metaTitle || page.metaTitle,
        metaDescription: seoData.metaDescription || page.metaDescription,
        metaKeywords: seoData.metaKeywords || page.metaKeywords,
        ogTitle: seoData.ogTitle || page.ogTitle,
        ogDescription: seoData.ogDescription || page.ogDescription,
      });
      setIsDirty(true);
      toast({ title: 'SEO metadata generated!', description: 'Review and save the changes.' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to generate SEO', 
        description: error.message || 'Please check your OpenAI configuration.',
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleSave = () => {
    if (!page) return;
    const contentJson: PageContentJson = { version: 1, blocks };
    // Exclude createdAt and updatedAt - these are managed by the server
    const { createdAt, updatedAt, ...pageWithoutDates } = page;
    saveMutation.mutate({
      ...pageWithoutDates,
      contentJson,
      slug: page.slug || page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setBlocks(items);
    setIsDirty(true);
  };

  const addBlock = (type: string) => {
    const newBlock: PageBlock = {
      id: generateBlockId(),
      type,
      data: getDefaultBlockData(type),
      settings: { padding: 'lg', alignment: 'center', background: 'none' },
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowAddBlockSheet(false);
    setIsDirty(true);
  };

  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) return;
    const newBlock = { ...blocks[blockIndex], id: generateBlockId() };
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    setBlocks(newBlocks);
    setIsDirty(true);
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
    setIsDirty(true);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setIsDirty(true);
  };

  const toggleBlockVisibility = (blockId: string) => {
    setBlocks(blocks.map(b => 
      b.id === blockId 
        ? { ...b, settings: { ...b.settings, visibility: b.settings?.visibility === 'all' ? 'desktop' : 'all' } } 
        : b
    ));
    setIsDirty(true);
  };

  const updateBlock = (blockId: string, updates: Partial<PageBlock>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
    setIsDirty(true);
  };

  const updateBlockData = (blockId: string, dataUpdates: Record<string, any>) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, data: { ...b.data, ...dataUpdates } } : b
    ));
    setIsDirty(true);
  };

  const updateBlockSettings = (blockId: string, settingsUpdates: Partial<BlockSettings>) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, settings: { ...b.settings, ...settingsUpdates } } : b
    ));
    setIsDirty(true);
  };

  const applyTemplate = async (templateId: string) => {
    try {
      const res = await fetch(`/api/admin/page-templates/${templateId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch template');
      const template = await res.json();
      if (template.contentJson?.blocks) {
        const newBlocks = template.contentJson.blocks.map((b: PageBlock) => ({
          ...b,
          id: generateBlockId(),
        }));
        setBlocks(newBlocks);
        setIsDirty(true);
        setShowAddBlockSheet(false);
        toast({ title: `Applied "${template.name}" template` });
      }
    } catch (error) {
      toast({ title: 'Failed to apply template', variant: 'destructive' });
    }
  };

  const insertSavedSection = (section: SavedSection) => {
    const newBlocks = section.blocks.map(b => ({
      ...b,
      id: generateBlockId(),
    }));
    setBlocks([...blocks, ...newBlocks]);
    setIsDirty(true);
    setShowAddBlockSheet(false);
    toast({ title: `Inserted "${section.name}" section` });
  };

  const saveSelectedBlocksAsSection = () => {
    if (!newSectionName.trim() || selectedBlocksForSection.length === 0) return;
    const blocksToSave = blocks.filter(b => selectedBlocksForSection.includes(b.id));
    saveSectionMutation.mutate({
      name: newSectionName.trim(),
      category: newSectionCategory,
      blocks: blocksToSave,
    });
  };

  const toggleBlockSelection = (blockId: string) => {
    setSelectedBlocksForSection(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  const toggleBlockExpanded = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access the page builder. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pages')} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Pages
          </Button>
          <div className="h-6 w-px bg-border" />
          <Input
            value={page.title}
            onChange={(e) => { setPage({ ...page, title: e.target.value }); setIsDirty(true); }}
            className="bg-transparent border-none text-lg font-semibold w-64 focus:ring-0"
            placeholder="Page Title"
            data-testid="input-page-title"
          />
          {page.isHome && (
            <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary flex items-center gap-1">
              <Home className="w-3 h-3" /> Home
            </span>
          )}
          {page.isShop && (
            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> Shop
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-none", previewMode === 'desktop' && "bg-muted")}
              onClick={() => setPreviewMode('desktop')}
              data-testid="button-preview-desktop"
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-none", previewMode === 'mobile' && "bg-muted")}
              onClick={() => setPreviewMode('mobile')}
              data-testid="button-preview-mobile"
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/page/${page.slug}`, '_blank')}
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save"
          >
            <Save className="w-4 h-4 mr-2" />
            {isDirty ? 'Save*' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-12 px-2">
              <TabsTrigger value="blocks" className="data-[state=active]:bg-muted">Blocks</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-muted">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="flex-1 flex flex-col m-0 overflow-hidden">
              <div className="p-3 border-b border-border space-y-2">
                <Button onClick={() => setShowAddBlockSheet(true)} className="w-full bg-primary/20 hover:bg-primary/30 text-primary" data-testid="button-add-block">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Block
                </Button>
                {blocks.length > 0 && (
                  <Button 
                    onClick={() => setShowSaveSectionDialog(true)} 
                    variant="outline" 
                    className="w-full" 
                    data-testid="button-open-save-section"
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save as Section
                  </Button>
                )}
              </div>
              <ScrollArea className="flex-1">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="blocks">
                    {(provided, droppableSnapshot) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef} 
                        className={cn(
                          "p-2 space-y-1 min-h-[100px] transition-colors",
                          droppableSnapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-lg"
                        )}
                      >
                        {blocks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No blocks yet</p>
                            <p className="text-sm">Click "Add Block" to start building</p>
                          </div>
                        ) : (
                          blocks.map((block, index) => {
                            const blockType = BLOCK_TYPES.find(t => t.type === block.type);
                            const Icon = blockType?.icon || Square;
                            const isExpanded = expandedBlocks.has(block.id);
                            return (
                              <Draggable key={block.id} draggableId={block.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "bg-muted/50 rounded-lg border transition-all",
                                      selectedBlockId === block.id ? "border-primary ring-1 ring-primary/30" : "border-border",
                                      snapshot.isDragging && "shadow-xl ring-2 ring-primary/50 rotate-1 scale-[1.02]"
                                    )}
                                    data-testid={`block-item-${block.id}`}
                                  >
                                    <div
                                      className="flex items-center gap-2 p-2 cursor-pointer group"
                                      onClick={() => setSelectedBlockId(block.id)}
                                    >
                                      <div {...provided.dragHandleProps} className="cursor-grab hover:bg-muted rounded p-0.5 transition-colors">
                                        <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                                      </div>
                                      <Icon className="w-4 h-4 text-muted-foreground" />
                                      <span className="flex-1 text-sm font-medium truncate">
                                        {block.data.title || blockType?.label || block.type}
                                      </span>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                                          disabled={index === 0}
                                          title="Move up"
                                          data-testid={`move-up-${block.id}`}
                                        >
                                          <ChevronUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                                          disabled={index === blocks.length - 1}
                                          title="Move down"
                                          data-testid={`move-down-${block.id}`}
                                        >
                                          <ChevronDown className="w-3 h-3" />
                                        </Button>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => { e.stopPropagation(); toggleBlockExpanded(block.id); }}
                                      >
                                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      </Button>
                                    </div>
                                    {isExpanded && (
                                      <div className="px-2 pb-2 flex gap-1 flex-wrap">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => duplicateBlock(block.id)} data-testid={`duplicate-${block.id}`}>
                                          <Copy className="w-3 h-3 mr-1" /> Duplicate
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400" onClick={() => deleteBlock(block.id)} data-testid={`delete-${block.id}`}>
                                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  <div>
                    <Label>Page Title</Label>
                    <Input
                      value={page.title}
                      onChange={(e) => { setPage({ ...page, title: e.target.value }); setIsDirty(true); }}
                      className="bg-muted border-border mt-1"
                      data-testid="settings-title"
                    />
                  </div>
                  <div>
                    <Label>URL Slug</Label>
                    <Input
                      value={page.slug}
                      onChange={(e) => { setPage({ ...page, slug: e.target.value }); setIsDirty(true); }}
                      className="bg-muted border-border mt-1"
                      data-testid="settings-slug"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={page.status} onValueChange={(v) => { setPage({ ...page, status: v }); setIsDirty(true); }}>
                      <SelectTrigger className="bg-muted border-border mt-1" data-testid="settings-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Page Type</Label>
                    <Select value={page.pageType || 'page'} onValueChange={(v) => { setPage({ ...page, pageType: v }); setIsDirty(true); }}>
                      <SelectTrigger className="bg-muted border-border mt-1" data-testid="settings-pagetype">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="shop">Shop</SelectItem>
                        <SelectItem value="landing">Landing Page</SelectItem>
                        <SelectItem value="page">Standard Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Template</Label>
                    <Select value={page.template || 'default'} onValueChange={(v) => { setPage({ ...page, template: v }); setIsDirty(true); }}>
                      <SelectTrigger className="bg-muted border-border mt-1" data-testid="settings-template">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="hero-left">Hero Left</SelectItem>
                        <SelectItem value="hero-center">Hero Center</SelectItem>
                        <SelectItem value="full-width">Full Width</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Page Designation</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start", page.isHome && "border-primary text-primary")}
                        onClick={() => setHomePageMutation.mutate()}
                        disabled={id === 'new' || page.isHome}
                        data-testid="button-set-home"
                      >
                        <Home className="w-4 h-4 mr-2" />
                        {page.isHome ? 'This is the Home Page' : 'Set as Home Page'}
                      </Button>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start", page.isShop && "border-purple-500 text-purple-400")}
                        onClick={() => setShopPageMutation.mutate()}
                        disabled={id === 'new' || page.isShop}
                        data-testid="button-set-shop"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {page.isShop ? 'This is the Shop Page' : 'Set as Shop Page'}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">SEO Settings</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateSeo}
                        disabled={isGeneratingSeo}
                        className="gap-1.5 text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10"
                        data-testid="btn-generate-seo"
                      >
                        {isGeneratingSeo ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {isGeneratingSeo ? 'Generating...' : 'AI Generate'}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label>Meta Title</Label>
                        <Input
                          value={page.metaTitle || ''}
                          onChange={(e) => { setPage({ ...page, metaTitle: e.target.value }); setIsDirty(true); }}
                          placeholder={page.title}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-meta-title"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Recommended: 50-60 characters</p>
                      </div>
                      <div>
                        <Label>Meta Description</Label>
                        <Textarea
                          value={page.metaDescription || ''}
                          onChange={(e) => { setPage({ ...page, metaDescription: e.target.value }); setIsDirty(true); }}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-meta-desc"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Recommended: 150-160 characters</p>
                      </div>
                      <div>
                        <Label>Meta Keywords</Label>
                        <Input
                          value={page.metaKeywords || ''}
                          onChange={(e) => { setPage({ ...page, metaKeywords: e.target.value }); setIsDirty(true); }}
                          placeholder="keyword1, keyword2, keyword3"
                          className="bg-muted border-border mt-1"
                          data-testid="settings-meta-keywords"
                        />
                      </div>
                      <div>
                        <Label>Canonical URL</Label>
                        <Input
                          value={page.canonicalUrl || ''}
                          onChange={(e) => { setPage({ ...page, canonicalUrl: e.target.value }); setIsDirty(true); }}
                          placeholder="https://example.com/page"
                          className="bg-muted border-border mt-1"
                          data-testid="settings-canonical"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Leave empty to use default page URL</p>
                      </div>
                      <div>
                        <Label>Robots Directive</Label>
                        <Select value={page.robots || 'index, follow'} onValueChange={(v) => { setPage({ ...page, robots: v }); setIsDirty(true); }}>
                          <SelectTrigger className="bg-muted border-border mt-1" data-testid="settings-robots">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="index, follow">Index, Follow (Default)</SelectItem>
                            <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                            <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                            <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Open Graph (Facebook/LinkedIn)</h4>
                    <div className="space-y-4">
                      <div>
                        <Label>OG Title</Label>
                        <Input
                          value={page.ogTitle || ''}
                          onChange={(e) => { setPage({ ...page, ogTitle: e.target.value }); setIsDirty(true); }}
                          placeholder={page.metaTitle || page.title}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-og-title"
                        />
                      </div>
                      <div>
                        <Label>OG Description</Label>
                        <Textarea
                          value={page.ogDescription || ''}
                          onChange={(e) => { setPage({ ...page, ogDescription: e.target.value }); setIsDirty(true); }}
                          placeholder={page.metaDescription || ''}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-og-desc"
                        />
                      </div>
                      <PageImageUploadField
                        label="OG Image"
                        value={page.ogImage || page.featuredImage || ''}
                        onChange={(url) => { setPage({ ...page, ogImage: url }); setIsDirty(true); }}
                        placeholder="Recommended: 1200x630 pixels"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Twitter Card</h4>
                    <div className="space-y-4">
                      <div>
                        <Label>Card Type</Label>
                        <Select value={page.twitterCard || 'summary_large_image'} onValueChange={(v) => { setPage({ ...page, twitterCard: v }); setIsDirty(true); }}>
                          <SelectTrigger className="bg-muted border-border mt-1" data-testid="settings-twitter-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="summary">Summary</SelectItem>
                            <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Twitter Title</Label>
                        <Input
                          value={page.twitterTitle || ''}
                          onChange={(e) => { setPage({ ...page, twitterTitle: e.target.value }); setIsDirty(true); }}
                          placeholder={page.ogTitle || page.metaTitle || page.title}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-twitter-title"
                        />
                      </div>
                      <div>
                        <Label>Twitter Description</Label>
                        <Textarea
                          value={page.twitterDescription || ''}
                          onChange={(e) => { setPage({ ...page, twitterDescription: e.target.value }); setIsDirty(true); }}
                          placeholder={page.ogDescription || page.metaDescription || ''}
                          className="bg-muted border-border mt-1"
                          data-testid="settings-twitter-desc"
                        />
                      </div>
                      <PageImageUploadField
                        label="Twitter Image"
                        value={page.twitterImage || page.ogImage || page.featuredImage || ''}
                        onChange={(url) => { setPage({ ...page, twitterImage: url }); setIsDirty(true); }}
                        placeholder="Recommended: 1200x600 pixels"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Featured Image</h4>
                    <PageImageUploadField
                      label="Featured Image"
                      value={page.featuredImage || ''}
                      onChange={(url) => { setPage({ ...page, featuredImage: url }); setIsDirty(true); }}
                      placeholder="Used as default OG/Twitter image"
                    />
                  </div>

                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-3">Navigation</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Show in Navigation</Label>
                        <Switch
                          checked={page.showInNav}
                          onCheckedChange={(checked) => { setPage({ ...page, showInNav: checked }); setIsDirty(true); }}
                          data-testid="settings-show-nav"
                        />
                      </div>
                      {page.showInNav && (
                        <div>
                          <Label>Nav Order</Label>
                          <Input
                            type="number"
                            value={page.navOrder}
                            onChange={(e) => { setPage({ ...page, navOrder: parseInt(e.target.value) || 0 }); setIsDirty(true); }}
                            className="bg-muted border-border mt-1 w-24"
                            data-testid="settings-nav-order"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-black/50">
          <div className="flex-1 overflow-auto p-4">
            <div
              className={cn(
                "mx-auto bg-background rounded-lg shadow-2xl overflow-hidden transition-all",
                previewMode === 'desktop' ? "w-full max-w-6xl" : "w-[375px]"
              )}
              style={{ minHeight: '600px' }}
            >
              <PageRenderer
                contentJson={{ version: 1, blocks }}
                legacyContent={page.content}
              />
              {blocks.length === 0 && !page.content && (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <Layers className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg">Your page is empty</p>
                  <p className="text-sm">Add blocks to start building</p>
                </div>
              )}
            </div>
          </div>
        </main>

      </div>

      {/* Block Editor Sheet - 80% viewport width */}
      <Sheet open={!!selectedBlock} onOpenChange={(open) => !open && setSelectedBlockId(null)}>
        <SheetContent side="right" className="bg-card border-border w-[80vw] max-w-[80vw] sm:max-w-[80vw] p-0">
          <SheetHeader className="h-14 px-6 flex flex-row items-center justify-between border-b border-border">
            <SheetTitle className="text-lg">Edit Block</SheetTitle>
          </SheetHeader>
          {selectedBlock && (
            <ScrollArea className="h-[calc(100vh-56px)]">
              <div className="p-6">
                <BlockEditor
                  block={selectedBlock}
                  onUpdateData={(updates) => updateBlockData(selectedBlock.id, updates)}
                  onUpdateSettings={(updates) => updateBlockSettings(selectedBlock.id, updates)}
                />
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showAddBlockSheet} onOpenChange={setShowAddBlockSheet}>
        <SheetContent side="left" className="bg-card border-border w-96">
          <SheetHeader>
            <SheetTitle>Add Content</SheetTitle>
          </SheetHeader>
          <Tabs value={addBlockTab} onValueChange={(v) => setAddBlockTab(v as any)} className="mt-4">
            <TabsList className="w-full grid grid-cols-3 bg-muted">
              <TabsTrigger value="blocks" className="text-xs">Blocks</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
              <TabsTrigger value="sections" className="text-xs">Sections</TabsTrigger>
            </TabsList>
            
            <TabsContent value="blocks" className="mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search blocks..."
                  value={blockSearchQuery}
                  onChange={(e) => setBlockSearchQuery(e.target.value)}
                  className="pl-9 bg-muted border-border"
                  data-testid="input-block-search"
                />
                {blockSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setBlockSearchQuery('')}
                    data-testid="btn-clear-block-search"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="space-y-2 pr-4">
                  {BLOCK_TYPES.filter(bt => 
                    blockSearchQuery === '' ||
                    bt.label.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                    bt.description.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                    bt.type.toLowerCase().includes(blockSearchQuery.toLowerCase())
                  ).map((blockType) => {
                    const Icon = blockType.icon;
                    return (
                      <button
                        key={blockType.type}
                        onClick={() => { addBlock(blockType.type); setBlockSearchQuery(''); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                        data-testid={`add-block-${blockType.type}`}
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{blockType.label}</div>
                          <div className="text-xs text-muted-foreground">{blockType.description}</div>
                        </div>
                      </button>
                    );
                  })}
                  {BLOCK_TYPES.filter(bt => 
                    blockSearchQuery !== '' && (
                      bt.label.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                      bt.description.toLowerCase().includes(blockSearchQuery.toLowerCase()) ||
                      bt.type.toLowerCase().includes(blockSearchQuery.toLowerCase())
                    )
                  ).length === 0 && blockSearchQuery !== '' && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No blocks match "{blockSearchQuery}"</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="templates" className="mt-4">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-2 pr-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Apply a template to replace all current blocks. This action cannot be undone.
                  </p>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border"
                      data-testid={`apply-template-${template.id}`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="sections" className="mt-4">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-2 pr-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Insert a saved section. Blocks will be added at the end of the page.
                  </p>
                  {savedSections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No saved sections yet</p>
                      <p className="text-xs mt-1">Save blocks as a section to reuse them across pages</p>
                    </div>
                  ) : (
                    savedSections.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <BookMarked className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{section.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {section.blocks?.length || 0} block(s) • {section.category || 'general'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => insertSavedSection(section)}
                            className="text-primary hover:text-primary/80"
                            data-testid={`insert-section-${section.id}`}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteSectionMutation.mutate(section.id)}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`delete-section-${section.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Save Section Dialog */}
      <Sheet open={showSaveSectionDialog} onOpenChange={setShowSaveSectionDialog}>
        <SheetContent side="right" className="bg-card border-border text-white w-96">
          <SheetHeader>
            <SheetTitle className="text-white">Save as Section</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Select blocks to save as a reusable section.
            </p>
            
            <div className="space-y-2">
              <Label>Section Name</Label>
              <Input
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Enter section name"
                className="bg-muted border-border"
                data-testid="input-section-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newSectionCategory} onValueChange={setNewSectionCategory}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="hero">Hero</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="testimonial">Testimonial</SelectItem>
                  <SelectItem value="cta">Call to Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Select Blocks ({selectedBlocksForSection.length} selected)</Label>
              <ScrollArea className="h-48 border border-border rounded-lg p-2">
                {blocks.map((block, index) => {
                  const blockType = BLOCK_TYPES.find(bt => bt.type === block.type);
                  const isSelected = selectedBlocksForSection.includes(block.id);
                  return (
                    <button
                      key={block.id}
                      onClick={() => toggleBlockSelection(block.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded mb-1 text-left text-sm",
                        isSelected ? "bg-cyan-900/50 border border-primary" : "hover:bg-muted"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="pointer-events-none"
                      />
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span>{blockType?.label || block.type}</span>
                    </button>
                  );
                })}
              </ScrollArea>
            </div>
            
            <Button
              onClick={saveSelectedBlocksAsSection}
              disabled={!newSectionName.trim() || selectedBlocksForSection.length === 0 || saveSectionMutation.isPending}
              className="w-full"
              data-testid="button-save-section"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Save Section
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function BlockEditor({ 
  block, 
  onUpdateData, 
  onUpdateSettings 
}: { 
  block: PageBlock; 
  onUpdateData: (updates: Record<string, any>) => void;
  onUpdateSettings: (updates: Partial<BlockSettings>) => void;
}) {
  const [tab, setTab] = useState<'content' | 'style'>('content');

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList className="w-full mb-4">
        <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
        <TabsTrigger value="style" className="flex-1">Style</TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="space-y-4">
        <BlockContentEditor block={block} onUpdate={onUpdateData} />
      </TabsContent>

      <TabsContent value="style" className="space-y-4">
        <div>
          <Label>Alignment</Label>
          <Select value={block.settings?.alignment || 'center'} onValueChange={(v) => onUpdateSettings({ alignment: v as any })}>
            <SelectTrigger className="bg-muted border-border mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Background</Label>
          <Select value={block.settings?.background || 'none'} onValueChange={(v) => onUpdateSettings({ background: v as any })}>
            <SelectTrigger className="bg-muted border-border mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Padding</Label>
          <Select value={block.settings?.padding || 'lg'} onValueChange={(v) => onUpdateSettings({ padding: v as any })}>
            <SelectTrigger className="bg-muted border-border mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Visibility</Label>
          <Select value={block.settings?.visibility || 'all'} onValueChange={(v) => onUpdateSettings({ visibility: v as any })}>
            <SelectTrigger className="bg-muted border-border mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="desktop">Desktop Only</SelectItem>
              <SelectItem value="mobile">Mobile Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {block.type === 'hero' && (
          <div>
            <Label>Split Layout</Label>
            <Select value={block.settings?.splitLayout || 'none'} onValueChange={(v) => onUpdateSettings({ splitLayout: v as any })}>
              <SelectTrigger className="bg-muted border-border mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="left">Image Left</SelectItem>
                <SelectItem value="right">Image Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Anchor ID</Label>
          <Input
            value={block.settings?.anchor || ''}
            onChange={(e) => onUpdateSettings({ anchor: e.target.value })}
            placeholder="section-id"
            className="bg-muted border-border mt-1"
          />
        </div>
        <div>
          <Label>Custom CSS Class</Label>
          <Input
            value={block.settings?.className || ''}
            onChange={(e) => onUpdateSettings({ className: e.target.value })}
            placeholder="my-custom-class"
            className="bg-muted border-border mt-1"
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function ImageUploadField({ 
  label, 
  value, 
  onChange, 
  previewHeight = "h-20" 
}: { 
  label: string; 
  value: string; 
  onChange: (url: string) => void; 
  previewHeight?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile } = useUpload({
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        onChange(result.objectPath);
        toast({ title: "Image uploaded successfully" });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter URL or select from library"
          className="bg-muted border-border flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMediaPickerOpen(true)}
          className="bg-muted border-border hover:bg-accent"
          title="Select from Media Library"
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-muted border-border hover:bg-accent"
          title="Upload new file"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      </div>
      {value && (
        <div className="mt-2">
          <img src={value} alt="Preview" className={`${previewHeight} w-full object-cover rounded`} />
        </div>
      )}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => onChange(url)}
      />
    </div>
  );
}

function PageImageUploadField({ 
  label, 
  value, 
  onChange,
  placeholder = ''
}: { 
  label: string; 
  value: string; 
  onChange: (url: string) => void; 
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile } = useUpload({
    onError: (error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        onChange(result.objectPath);
        toast({ title: "Image uploaded successfully" });
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter URL or select from library"
          className="bg-muted border-border flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMediaPickerOpen(true)}
          className="bg-muted border-border hover:bg-accent"
          title="Select from Media Library"
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="bg-muted border-border hover:bg-accent"
          title="Upload new file"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      </div>
      {placeholder && <p className="text-xs text-muted-foreground mt-1">{placeholder}</p>}
      {value && (
        <div className="mt-2">
          <img src={value} alt="Preview" className="h-24 w-full object-cover rounded" />
        </div>
      )}
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => onChange(url)}
      />
    </div>
  );
}

function BlockContentEditor({ block, onUpdate }: { block: PageBlock; onUpdate: (updates: Record<string, any>) => void }) {
  switch (block.type) {
    case 'hero':
      return (
        <>
          <AIInput label="Badge" value={block.data.badge || ''} onChange={(val) => onUpdate({ badge: val })} fieldType="tagline" blockType="hero" testIdPrefix="hero-badge" />
          <AIInput label="Title" value={block.data.title || ''} onChange={(val) => onUpdate({ title: val })} fieldType="heading" blockType="hero" testIdPrefix="hero-title" />
          <AIInput label="Subtitle" value={block.data.subtitle || ''} onChange={(val) => onUpdate({ subtitle: val })} fieldType="subheading" blockType="hero" multiline testIdPrefix="hero-subtitle" />
          <AIInput label="Primary CTA Text" value={block.data.ctaText || ''} onChange={(val) => onUpdate({ ctaText: val })} fieldType="cta" blockType="hero" testIdPrefix="hero-primary-cta" />
          <div><Label>Primary CTA Link</Label><Input value={block.data.ctaLink || ''} onChange={(e) => onUpdate({ ctaLink: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <AIInput label="Secondary CTA Text" value={block.data.secondaryCtaText || ''} onChange={(val) => onUpdate({ secondaryCtaText: val })} fieldType="cta" blockType="hero" testIdPrefix="hero-secondary-cta" />
          <div><Label>Secondary CTA Link</Label><Input value={block.data.secondaryCtaLink || ''} onChange={(e) => onUpdate({ secondaryCtaLink: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <ImageUploadField 
            label="Background Image" 
            value={block.data.backgroundImage || ''} 
            onChange={(url) => onUpdate({ backgroundImage: url })} 
            previewHeight="h-24"
          />
          <ImageUploadField 
            label="Side Image" 
            value={block.data.image || ''} 
            onChange={(url) => onUpdate({ image: url })} 
          />
        </>
      );
    case 'richText':
      return (
        <div><Label>HTML Content</Label><Textarea value={block.data.content || ''} onChange={(e) => onUpdate({ content: e.target.value })} className="bg-muted border-border mt-1 min-h-[200px] font-mono text-sm" /></div>
      );
    case 'image':
      return (
        <>
          <ImageUploadField 
            label="Image" 
            value={block.data.src || ''} 
            onChange={(url) => onUpdate({ src: url })} 
          />
          <div><Label>Alt Text</Label><Input value={block.data.alt || ''} onChange={(e) => onUpdate({ alt: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <div><Label>Caption</Label><Input value={block.data.caption || ''} onChange={(e) => onUpdate({ caption: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <div><Label>Max Width</Label><Input value={block.data.maxWidth || ''} onChange={(e) => onUpdate({ maxWidth: e.target.value })} placeholder="600px" className="bg-muted border-border mt-1" /></div>
          <div className="flex items-center gap-2"><Switch checked={block.data.fullWidth || false} onCheckedChange={(checked) => onUpdate({ fullWidth: checked })} /><Label>Full Width</Label></div>
        </>
      );
    case 'productGrid':
      return (
        <>
          <div><Label>Title</Label><Input value={block.data.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <div>
            <Label>Mode</Label>
            <Select value={block.data.mode || 'all'} onValueChange={(v) => onUpdate({ mode: v })}>
              <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="featured">Featured Product</SelectItem>
                <SelectItem value="manual">Manual Selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Columns</Label><Input type="number" min={1} max={6} value={block.data.columns || 3} onChange={(e) => onUpdate({ columns: parseInt(e.target.value) })} className="bg-muted border-border mt-1" /></div>
          {block.data.mode !== 'featured' && block.data.mode !== 'manual' && (
            <div><Label>Limit</Label><Input type="number" min={1} value={block.data.limit || 4} onChange={(e) => onUpdate({ limit: parseInt(e.target.value) })} className="bg-muted border-border mt-1" /></div>
          )}
          {block.data.mode === 'manual' && (
            <div><Label>Product IDs (comma-separated)</Label><Input value={(block.data.productIds || []).join(', ')} onChange={(e) => onUpdate({ productIds: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} className="bg-muted border-border mt-1" /></div>
          )}
        </>
      );
    case 'cta':
      return (
        <>
          <AIInput label="Title" value={block.data.title || ''} onChange={(val) => onUpdate({ title: val })} fieldType="heading" blockType="cta" testIdPrefix="cta-title" />
          <AIInput label="Subtitle" value={block.data.subtitle || ''} onChange={(val) => onUpdate({ subtitle: val })} fieldType="description" blockType="cta" multiline testIdPrefix="cta-subtitle" />
          <AIInput label="Primary Button" value={block.data.primaryButton || ''} onChange={(val) => onUpdate({ primaryButton: val })} fieldType="cta" blockType="cta" testIdPrefix="cta-primary-btn" />
          <div><Label>Primary Link</Label><Input value={block.data.primaryLink || ''} onChange={(e) => onUpdate({ primaryLink: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <AIInput label="Secondary Button" value={block.data.secondaryButton || ''} onChange={(val) => onUpdate({ secondaryButton: val })} fieldType="cta" blockType="cta" testIdPrefix="cta-secondary-btn" />
          <div><Label>Secondary Link</Label><Input value={block.data.secondaryLink || ''} onChange={(e) => onUpdate({ secondaryLink: e.target.value })} className="bg-muted border-border mt-1" /></div>
        </>
      );
    case 'videoEmbed':
      return (
        <>
          <div><Label>Title</Label><Input value={block.data.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} className="bg-muted border-border mt-1" /></div>
          <div><Label>Video URL</Label><Input value={block.data.url || ''} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://youtube.com/..." className="bg-muted border-border mt-1" /></div>
          <ImageUploadField 
            label="Thumbnail" 
            value={block.data.thumbnail || ''} 
            onChange={(url) => onUpdate({ thumbnail: url })} 
          />
          <div><Label>Caption</Label><Input value={block.data.caption || ''} onChange={(e) => onUpdate({ caption: e.target.value })} className="bg-muted border-border mt-1" /></div>
        </>
      );
    case 'spacer':
      return (
        <div>
          <Label>Size</Label>
          <Select value={block.data.size || 'md'} onValueChange={(v) => onUpdate({ size: v })}>
            <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="xs">Extra Small</SelectItem>
              <SelectItem value="sm">Small</SelectItem>
              <SelectItem value="md">Medium</SelectItem>
              <SelectItem value="lg">Large</SelectItem>
              <SelectItem value="xl">Extra Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'divider':
      return (
        <>
          <div>
            <Label>Style</Label>
            <Select value={block.data.style || 'solid'} onValueChange={(v) => onUpdate({ style: v })}>
              <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
                <SelectItem value="thick">Thick</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <Select value={block.data.color || 'default'} onValueChange={(v) => onUpdate({ color: v })}>
              <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    case 'guarantee':
      return (
        <>
          <AIInput label="Title" value={block.data.title || ''} onChange={(val) => onUpdate({ title: val })} fieldType="heading" blockType="guarantee" testIdPrefix="guarantee-title" />
          <AIInput label="Description" value={block.data.description || ''} onChange={(val) => onUpdate({ description: val })} fieldType="description" blockType="guarantee" multiline testIdPrefix="guarantee-description" />
          <ImageUploadField 
            label="Icon" 
            value={block.data.icon || ''} 
            onChange={(url) => onUpdate({ icon: url })} 
          />
          <div><Label>Details (one per line)</Label><Textarea value={(block.data.details || []).join('\n')} onChange={(e) => onUpdate({ details: e.target.value.split('\n').filter(Boolean) })} className="bg-muted border-border mt-1" /></div>
        </>
      );
    case 'featureList':
    case 'faq':
    case 'testimonial':
    case 'imageGrid':
    case 'logoCloud':
    case 'comparisonTable':
    case 'slider':
      return (
        <div className="text-sm text-muted-foreground py-4 text-center">
          <p>This block type has complex data.</p>
          <p className="mt-2">Edit the raw JSON in the legacy content editor or use the API to update.</p>
        </div>
      );
    case 'statsBar':
      return (
        <>
          <div className="space-y-4">
            <Label>Stats</Label>
            <p className="text-xs text-muted-foreground">Each stat has an icon, value, and label</p>
            {(block.data.stats || []).map((stat: { icon: string; value: string; label: string }, idx: number) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <IconPicker
                    value={stat.icon || ''}
                    onChange={(icon) => {
                      const newStats = [...(block.data.stats || [])];
                      newStats[idx] = { ...newStats[idx], icon };
                      onUpdate({ stats: newStats });
                    }}
                    placeholder="Select icon"
                    className="text-sm mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={stat.value || ''}
                      onChange={(e) => {
                        const newStats = [...(block.data.stats || [])];
                        newStats[idx] = { ...newStats[idx], value: e.target.value };
                        onUpdate({ stats: newStats });
                      }}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={stat.label || ''}
                      onChange={(e) => {
                        const newStats = [...(block.data.stats || [])];
                        newStats[idx] = { ...newStats[idx], label: e.target.value };
                        onUpdate({ stats: newStats });
                      }}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newStats = (block.data.stats || []).filter((_: any, i: number) => i !== idx);
                    onUpdate({ stats: newStats });
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newStats = [...(block.data.stats || []), { icon: 'check', value: 'Value', label: 'Label' }];
                onUpdate({ stats: newStats });
              }}
              className="w-full"
            >
              Add Stat
            </Button>
          </div>
        </>
      );
    case 'featureGrid':
      return (
        <>
          <AIInput label="Title" value={block.data.title || ''} onChange={(val) => onUpdate({ title: val })} fieldType="heading" blockType="featureGrid" testIdPrefix="featuregrid-title" />
          <div>
            <Label>Title Highlight</Label>
            <Input value={block.data.titleHighlight || ''} onChange={(e) => onUpdate({ titleHighlight: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <div>
            <Label>Title Suffix</Label>
            <Input value={block.data.titleSuffix || ''} onChange={(e) => onUpdate({ titleSuffix: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <AIInput label="Subtitle" value={block.data.subtitle || ''} onChange={(val) => onUpdate({ subtitle: val })} fieldType="description" blockType="featureGrid" multiline testIdPrefix="featuregrid-subtitle" />
          <div>
            <Label>Columns</Label>
            <Select value={String(block.data.columns || 3)} onValueChange={(v) => onUpdate({ columns: parseInt(v) })}>
              <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Columns</SelectItem>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Features</Label>
            {(block.data.features || []).map((feature: { icon: string; title: string; description: string }, idx: number) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <IconPicker
                    value={feature.icon || ''}
                    onChange={(icon) => {
                      const newFeatures = [...(block.data.features || [])];
                      newFeatures[idx] = { ...newFeatures[idx], icon };
                      onUpdate({ features: newFeatures });
                    }}
                    placeholder="Select icon"
                    className="text-sm mt-1"
                  />
                </div>
                <Input
                  value={feature.title || ''}
                  onChange={(e) => {
                    const newFeatures = [...(block.data.features || [])];
                    newFeatures[idx] = { ...newFeatures[idx], title: e.target.value };
                    onUpdate({ features: newFeatures });
                  }}
                  placeholder="Feature title"
                  className="bg-muted border-border text-sm"
                />
                <Textarea
                  value={feature.description || ''}
                  onChange={(e) => {
                    const newFeatures = [...(block.data.features || [])];
                    newFeatures[idx] = { ...newFeatures[idx], description: e.target.value };
                    onUpdate({ features: newFeatures });
                  }}
                  placeholder="Feature description"
                  className="bg-muted border-border text-sm"
                  rows={2}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newFeatures = (block.data.features || []).filter((_: any, i: number) => i !== idx);
                    onUpdate({ features: newFeatures });
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove Feature
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newFeatures = [...(block.data.features || []), { icon: 'check', title: 'New Feature', description: 'Feature description' }];
                onUpdate({ features: newFeatures });
              }}
              className="w-full"
            >
              Add Feature
            </Button>
          </div>
        </>
      );
    case 'featuredProduct':
      return (
        <>
          <div>
            <Label>Section Title</Label>
            <Input value={block.data.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <div>
            <Label>Title Highlight</Label>
            <Input value={block.data.titleHighlight || ''} onChange={(e) => onUpdate({ titleHighlight: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <div>
            <Label>Subtitle</Label>
            <Textarea value={block.data.subtitle || ''} onChange={(e) => onUpdate({ subtitle: e.target.value })} className="bg-muted border-border mt-1" rows={2} />
          </div>
          <div>
            <Label>Product Label</Label>
            <Input value={block.data.productLabel || ''} onChange={(e) => onUpdate({ productLabel: e.target.value })} placeholder="e.g., Complete Cold Plunge System" className="bg-muted border-border mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">The featured product is selected in Site Settings. This block displays the selected product with its price, description, and add-to-cart functionality.</p>
        </>
      );
    case 'iconGrid':
      return (
        <>
          <div>
            <Label>Title</Label>
            <Input value={block.data.title || ''} onChange={(e) => onUpdate({ title: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <div>
            <Label>Title Highlight</Label>
            <Input value={block.data.titleHighlight || ''} onChange={(e) => onUpdate({ titleHighlight: e.target.value })} className="bg-muted border-border mt-1" />
          </div>
          <div>
            <Label>Columns</Label>
            <Select value={String(block.data.columns || 5)} onValueChange={(v) => onUpdate({ columns: parseInt(v) })}>
              <SelectTrigger className="bg-muted border-border mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 Columns</SelectItem>
                <SelectItem value="4">4 Columns</SelectItem>
                <SelectItem value="5">5 Columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>Items</Label>
            {(block.data.items || []).map((item: { icon: string; title: string }, idx: number) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-2 border border-border">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <IconPicker
                    value={item.icon || ''}
                    onChange={(icon) => {
                      const newItems = [...(block.data.items || [])];
                      newItems[idx] = { ...newItems[idx], icon };
                      onUpdate({ items: newItems });
                    }}
                    placeholder="Select icon"
                    className="text-sm mt-1"
                  />
                </div>
                <Input
                  value={item.title || ''}
                  onChange={(e) => {
                    const newItems = [...(block.data.items || [])];
                    newItems[idx] = { ...newItems[idx], title: e.target.value };
                    onUpdate({ items: newItems });
                  }}
                  placeholder="Item title"
                  className="bg-muted border-border text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newItems = (block.data.items || []).filter((_: any, i: number) => i !== idx);
                    onUpdate({ items: newItems });
                  }}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove Item
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newItems = [...(block.data.items || []), { icon: 'star', title: 'New Category' }];
                onUpdate({ items: newItems });
              }}
              className="w-full"
            >
              Add Item
            </Button>
          </div>
        </>
      );
    default:
      return (
        <div className="text-sm text-muted-foreground">
          Unknown block type: {block.type}
        </div>
      );
  }
}
