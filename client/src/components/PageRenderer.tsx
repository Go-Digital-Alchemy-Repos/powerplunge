import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play, Shield, Award, Zap, Heart, ThermometerSnowflake, Snowflake, Timer, Truck, Filter, Gauge, Volume2, Dumbbell, Building2, HeartPulse, Sparkles, Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import UnknownBlock from "@/components/UnknownBlock";
import { getIconWithFallback } from "@/lib/iconUtils";
import { getBlock as getLegacyBlock } from "@/lib/blockRegistry";
import { getBlock as getCmsBlock } from "@/cms/blocks/registry";
import { ensureBlocksRegistered } from "@/cms/blocks/init";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import BlogPostFeedBlock from "@/cms/blocks/BlogPostFeedBlock";

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

interface Product {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  price: number;
  salePrice?: number;
  primaryImage?: string;
  features?: string[];
}

interface SiteSettings {
  featuredProductId?: string;
}

interface PageRendererProps {
  contentJson?: PageContentJson | null;
  legacyContent?: string | null;
  onAddToCart?: (productId: string, quantity: number) => void;
}

const getLayoutClasses = (settings?: BlockSettings): string => {
  const classes: string[] = [];
  
  if (settings?.alignment === 'center') classes.push('text-center');
  if (settings?.alignment === 'right') classes.push('text-right');
  
  if (settings?.background === 'light') classes.push('bg-slate-100 dark:bg-slate-800');
  if (settings?.background === 'dark') classes.push('bg-slate-900 text-white');
  if (settings?.background === 'primary') classes.push('bg-cyan-500/10');
  if (settings?.background === 'gradient') classes.push('bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900/20');
  
  if (settings?.padding === 'none') classes.push('py-0');
  if (settings?.padding === 'sm') classes.push('py-4');
  if (settings?.padding === 'md') classes.push('py-8');
  if (settings?.padding === 'lg') classes.push('py-16');
  if (settings?.padding === 'xl') classes.push('py-24');
  if (!settings?.padding) classes.push('py-12');
  
  if (settings?.visibility === 'desktop') classes.push('hidden md:block');
  if (settings?.visibility === 'mobile') classes.push('md:hidden');
  
  return cn(classes.join(' '), settings?.className);
};

const HeroBlock = ({ data, settings, onAddToCart }: { data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }) => {
  const splitLayout = settings?.splitLayout || 'none';
  const title = data?.title || data?.headline || 'Welcome';
  const titleHighlight = data?.titleHighlight || '';
  const subtitle = data?.subtitle || data?.subheadline || '';
  const badge = data?.badge || '';
  const primaryButtonText = data?.primaryButtonText || data?.ctaText || '';
  const primaryButtonLink = data?.primaryButtonLink || data?.ctaLink || '';
  const primaryButtonIcon = data?.primaryButtonIcon || '';
  const primaryButtonAction = data?.primaryButtonAction || 'link';
  const productId = data?.productId || '';
  const secondaryButtonText = data?.secondaryButtonText || data?.secondaryCtaText || '';
  const secondaryButtonLink = data?.secondaryButtonLink || data?.secondaryCtaLink || '';
  const backgroundImage = data?.backgroundImage || '';
  const image = data?.image || '';
  
  const handlePrimaryClick = () => {
    if (primaryButtonAction === 'addToCart' && productId && onAddToCart) {
      onAddToCart(productId, 1);
    } else if (primaryButtonLink) {
      window.location.href = primaryButtonLink;
    }
  };
  
  const PrimaryIcon = primaryButtonIcon ? getIconWithFallback(primaryButtonIcon, Zap) : null;
  
  return (
    <section 
      className={cn("relative min-h-[80vh] sm:min-h-screen flex items-center justify-center overflow-hidden", getLayoutClasses(settings))}
      data-testid="block-hero"
    >
      {backgroundImage && (
        <div className="absolute inset-0">
          <img src={backgroundImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 sm:from-background/80 via-background/60 sm:via-background/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
      )}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className={cn(
            "grid gap-6 sm:gap-8",
            splitLayout === 'left' ? 'md:grid-cols-2' : '',
            splitLayout === 'right' ? 'md:grid-cols-2' : ''
          )}>
            <div className={cn(splitLayout === 'right' ? 'order-2 md:order-1' : '')}>
              {badge && (
                <p className="text-primary font-medium tracking-widest uppercase mb-3 sm:mb-4 text-sm sm:text-base">
                  {badge}
                </p>
              )}
              <h1 className="font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 leading-tight">
                {title}
                {titleHighlight && (
                  <span className="block text-gradient-ice">{titleHighlight}</span>
                )}
              </h1>
              {subtitle && (
                <p className="text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-6 sm:mb-10">
                  {subtitle}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {primaryButtonText && (
                  <Button 
                    size="lg" 
                    className="glow-ice-sm text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
                    onClick={handlePrimaryClick}
                    data-testid="button-hero-primary"
                  >
                    {primaryButtonText}
                    {PrimaryIcon && <PrimaryIcon className="w-5 h-5 ml-2" />}
                  </Button>
                )}
                {secondaryButtonText && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
                    onClick={() => secondaryButtonLink && (window.location.href = secondaryButtonLink)}
                  >
                    {secondaryButtonText}
                  </Button>
                )}
              </div>
            </div>
            {image && splitLayout !== 'none' && (
              <div className={cn(splitLayout === 'right' ? 'order-1 md:order-2' : '')}>
                <img src={image} alt={title} className="rounded-lg shadow-2xl" />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const RichTextBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const title = data?.title || '';
  const htmlContent = data?.bodyRichText || data?.content || '';
  return (
    <section className={cn("max-w-4xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-richtext">
      {title && <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>}
      <div 
        className="prose prose-invert prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
      />
    </section>
  );
};

const ImageBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const src = data?.src || data?.url || '';
  const alt = data?.alt || '';
  const caption = data?.caption || '';
  
  if (!src) {
    return (
      <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-image">
        <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-500">
          No image source provided
        </div>
      </section>
    );
  }
  
  return (
    <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-image">
      <figure className={cn(
        settings?.alignment === 'center' && 'flex flex-col items-center',
        settings?.alignment === 'right' && 'flex flex-col items-end'
      )}>
        <img 
          src={src} 
          alt={alt} 
          className={cn("rounded-lg shadow-lg", data?.fullWidth && 'w-full')}
          style={data?.maxWidth ? { maxWidth: data.maxWidth } : undefined}
        />
        {caption && (
          <figcaption className="mt-4 text-sm text-slate-400">{caption}</figcaption>
        )}
      </figure>
    </section>
  );
};

const gridColsMap: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6',
};

const ImageGridBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const columns = data.columns || 3;
  return (
    <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-imagegrid">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className={cn("grid grid-cols-2 gap-4", gridColsMap[columns] || 'md:grid-cols-3')}>
        {(data.images || []).map((img: { src: string; alt?: string }, idx: number) => (
          <img 
            key={idx}
            src={img.src}
            alt={img.alt || ''}
            className="rounded-lg shadow-lg w-full h-48 object-cover"
          />
        ))}
      </div>
    </section>
  );
};

const ProductGridBlock = ({ data, settings, onAddToCart }: { 
  data: Record<string, any>; 
  settings?: BlockSettings;
  onAddToCart?: (productId: string, quantity: number) => void;
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/site-settings')
        ]);
        const productsData = await productsRes.json();
        const settingsData = await settingsRes.json();
        setProducts(productsData);
        setSiteSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getDisplayProducts = (): Product[] => {
    if (data.mode === 'featured' && siteSettings?.featuredProductId) {
      const featured = products.find(p => p.id === siteSettings.featuredProductId);
      return featured ? [featured] : [];
    }
    if (data.productIds && data.productIds.length > 0) {
      return products.filter(p => data.productIds.includes(p.id));
    }
    return products.slice(0, data.limit || 4);
  };

  const displayProducts = getDisplayProducts();
  const columns = data.columns || 3;

  if (loading) {
    return (
      <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-productgrid">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-slate-800 rounded-lg h-64" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-productgrid">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className={cn("grid grid-cols-1 gap-6", gridColsMap[columns] || 'md:grid-cols-3')}>
        {displayProducts.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
          >
            {product.primaryImage && (
              <img 
                src={product.primaryImage} 
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
            {product.tagline && <p className="text-slate-400 text-sm mb-3">{product.tagline}</p>}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-cyan-400">
                ${((product.salePrice || product.price) / 100).toLocaleString()}
              </span>
              {onAddToCart && (
                <Button 
                  size="sm"
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                  onClick={() => onAddToCart(product.id, 1)}
                >
                  Add to Cart
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const TestimonialBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const testimonials = data.testimonials || [];
  return (
    <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-testimonial">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((t: { quote: string; author: string; role?: string; avatar?: string; rating?: number }, idx: number) => (
          <div key={idx} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            {t.rating && (
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}
            <blockquote className="text-slate-300 mb-4">"{t.quote}"</blockquote>
            <div className="flex items-center gap-3">
              {t.avatar && <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full" />}
              <div>
                <p className="font-semibold text-white">{t.author}</p>
                {t.role && <p className="text-sm text-slate-400">{t.role}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const FAQBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = data.items || [];
  
  return (
    <section className={cn("max-w-3xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-faq">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className="space-y-4">
        {faqs.map((faq: { question: string; answer: string }, idx: number) => (
          <div key={idx} className="border border-slate-700 rounded-lg overflow-hidden" data-testid={`faq-item-${idx}`}>
            <button
              className="w-full flex items-center justify-between p-4 sm:p-4 text-left bg-slate-800/50 hover:bg-slate-800 transition-colors min-h-[48px]"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              data-testid={`faq-toggle-${idx}`}
            >
              <span className="font-medium text-white text-sm sm:text-base pr-2">{faq.question}</span>
              {openIndex === idx ? (
                <ChevronUp className="w-5 h-5 text-cyan-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {openIndex === idx && (
              <div className="p-4 text-slate-300 bg-slate-900/50">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const CTABlock = ({ data, settings, onAddToCart }: { data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }) => {
  const title = data?.title || data?.heading || 'Get Started';
  const titleHighlight = data?.titleHighlight || '';
  const subtitle = data?.subtitle || data?.description || '';
  const buttonText = data?.buttonText || data?.primaryButton || '';
  const buttonLink = data?.buttonLink || data?.primaryLink || '';
  const buttonIcon = data?.buttonIcon || '';
  const buttonAction = data?.buttonAction || 'navigate';
  const productId = data?.productId || '';
  const secondaryButton = data?.secondaryButton || '';
  const secondaryLink = data?.secondaryLink || '';
  
  const ButtonIcon = buttonIcon ? getIconWithFallback(buttonIcon, Zap) : null;

  const handleButtonClick = () => {
    if (buttonAction === 'addToCart' && onAddToCart) {
      onAddToCart(productId || '', 1);
    } else if (buttonLink) {
      window.location.href = buttonLink;
    }
  };

  return (
    <section className={cn("py-12 sm:py-24 bg-card/30 border-t border-border", getLayoutClasses(settings))} data-testid="block-cta">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            {title} {titleHighlight && <span className="text-gradient-ice">{titleHighlight}</span>}
          </h2>
          {subtitle && <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto">{subtitle}</p>}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {buttonText && (
              <Button 
                size="lg"
                className="glow-ice text-base sm:text-lg px-6 sm:px-10 py-4 sm:py-6 h-12 sm:h-auto w-full sm:w-auto"
                onClick={handleButtonClick}
                data-testid="cta-primary-button"
              >
                {buttonText}
                {ButtonIcon && <ButtonIcon className="w-5 h-5 ml-2" />}
              </Button>
            )}
            {secondaryButton && (
              <Button 
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
                onClick={() => secondaryLink && (window.location.href = secondaryLink)}
              >
                {secondaryButton}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LogoCloudBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => (
  <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-logocloud">
    {data.title && <h3 className="text-center text-slate-400 mb-8">{data.title}</h3>}
    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
      {(data.logos || []).map((logo: { src: string; alt?: string; url?: string }, idx: number) => (
        <a key={idx} href={logo.url || '#'} className="opacity-60 hover:opacity-100 transition-opacity">
          <img src={logo.src} alt={logo.alt || ''} className="h-8 md:h-10 w-auto grayscale hover:grayscale-0" />
        </a>
      ))}
    </div>
  </section>
);

const FeatureListBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const columns = data.columns || 3;
  
  return (
    <section className={cn("max-w-7xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-featurelist">
      {data.title && <h2 className="text-3xl font-bold text-white mb-4 text-center">{data.title}</h2>}
      {data.subtitle && <p className="text-xl text-slate-400 mb-12 text-center">{data.subtitle}</p>}
      <div className={cn("grid grid-cols-1 gap-8", gridColsMap[columns] || 'md:grid-cols-3')}>
        {(data.features || []).map((f: { icon?: string; title: string; description: string }, idx: number) => {
          const Icon = getIconWithFallback(f.icon, Check);
          return (
            <div key={idx} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Icon className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const DividerBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => (
  <div className={cn("max-w-7xl mx-auto px-4", getLayoutClasses({ ...settings, padding: 'sm' }))} data-testid="block-divider">
    <hr className={cn(
      "border-slate-700",
      data.style === 'dashed' && 'border-dashed',
      data.style === 'dotted' && 'border-dotted',
      data.style === 'thick' && 'border-2',
      data.color === 'primary' && 'border-cyan-500/50'
    )} />
  </div>
);

const SpacerBlock = ({ data }: { data: Record<string, any> }) => {
  const sizeMap: Record<string, string> = {
    xs: 'h-4',
    sm: 'h-8',
    md: 'h-16',
    lg: 'h-24',
    xl: 'h-32'
  };
  return <div className={sizeMap[data.size] || 'h-16'} data-testid="block-spacer" />;
};

const VideoEmbedBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const [playing, setPlaying] = useState(false);
  
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : url;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1` : url;
    }
    return url;
  };

  return (
    <section className={cn("max-w-4xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-videoembed">
      {data.title && <h2 className="text-3xl font-bold text-white mb-6 text-center">{data.title}</h2>}
      <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
        {!playing && data.thumbnail ? (
          <div className="relative w-full h-full cursor-pointer" onClick={() => setPlaying(true)}>
            <img src={data.thumbnail} alt={data.title || 'Video'} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center">
                <Play className="w-8 h-8 text-black ml-1" />
              </div>
            </div>
          </div>
        ) : (
          <iframe
            src={getEmbedUrl(data.url)}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
      {data.caption && <p className="text-center text-slate-400 mt-4">{data.caption}</p>}
    </section>
  );
};

const GuaranteeBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => (
  <section className={cn("max-w-4xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-guarantee">
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
      <div className="flex-shrink-0">
        {data.icon ? (
          <img src={data.icon} alt="Guarantee" className="w-24 h-24" />
        ) : (
          <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-12 h-12 text-cyan-400" />
          </div>
        )}
      </div>
      <div className={settings?.alignment === 'center' ? 'text-center' : ''}>
        <h3 className="text-2xl font-bold text-white mb-2">{data.title}</h3>
        <p className="text-slate-300">{data.description}</p>
        {data.details && (
          <ul className="mt-4 space-y-2">
            {data.details.map((d: string, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-slate-400">
                <Check className="w-4 h-4 text-cyan-400" />
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </section>
);

const ComparisonTableBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const columns = data.columns || [];
  const rows = data.rows || [];
  
  return (
    <section className={cn("max-w-6xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-comparisontable">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left p-4 text-slate-400 font-medium">{data.featureColumnLabel || 'Feature'}</th>
              {columns.map((col: { label: string; highlight?: boolean }, idx: number) => (
                <th 
                  key={idx} 
                  className={cn(
                    "p-4 text-center font-semibold",
                    col.highlight ? "text-cyan-400 bg-cyan-500/10" : "text-white"
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: { feature: string; values: (string | boolean)[] }, idx: number) => (
              <tr key={idx} className="border-b border-slate-800">
                <td className="p-4 text-slate-300">{row.feature}</td>
                {row.values.map((val, vidx) => (
                  <td 
                    key={vidx} 
                    className={cn(
                      "p-4 text-center",
                      columns[vidx]?.highlight && "bg-cyan-500/5"
                    )}
                  >
                    {typeof val === 'boolean' ? (
                      val ? <Check className="w-5 h-5 text-cyan-400 mx-auto" /> : <span className="text-slate-600">—</span>
                    ) : (
                      <span className="text-slate-300">{val}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const SliderBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const [current, setCurrent] = useState(0);
  const slides = data.slides || [];
  
  const next = () => setCurrent((c) => (c + 1) % slides.length);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  if (slides.length === 0) return null;

  return (
    <section className={cn("max-w-6xl mx-auto px-4", getLayoutClasses(settings))} data-testid="block-slider">
      {data.title && <h2 className="text-3xl font-bold text-white mb-8 text-center">{data.title}</h2>}
      <div className="relative">
        <div className="overflow-hidden rounded-xl">
          <motion.div
            className="flex"
            animate={{ x: `-${current * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {slides.map((slide: { image: string; title?: string; description?: string }, idx: number) => (
              <div key={idx} className="min-w-full">
                <div className="relative aspect-[16/9]">
                  <img src={slide.image} alt={slide.title || ''} className="w-full h-full object-cover" />
                  {(slide.title || slide.description) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-8">
                      <div>
                        {slide.title && <h3 className="text-2xl font-bold text-white mb-2">{slide.title}</h3>}
                        {slide.description && <p className="text-slate-300">{slide.description}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              data-testid="slider-prev"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              data-testid="slider-next"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
            <div className="flex justify-center gap-2 mt-4">
              {slides.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  data-testid={`slider-dot-${idx}`}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === current ? "bg-cyan-400" : "bg-slate-600"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

const StatsBarBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const stats = data.stats || [];
  
  return (
    <section className={cn("py-20 border-t border-border bg-card/30", getLayoutClasses(settings))} data-testid="block-statsbar">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat: { icon?: string; label: string; value: string }, idx: number) => {
            const Icon = getIconWithFallback(stat.icon, Award);
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <Icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="text-2xl font-display font-bold mb-1">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FeatureGridBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const title = data.title || '';
  const titleHighlight = data.titleHighlight || '';
  const titleSuffix = data.titleSuffix || '';
  const subtitle = data.subtitle || '';
  const sectionId = data.sectionId || '';
  const columns = data.columns || 3;
  const features = data.features || [];
  
  return (
    <section className={cn("py-12 sm:py-24", getLayoutClasses(settings))} id={sectionId} data-testid="block-featuregrid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            {title} <span className="text-gradient-ice">{titleHighlight}</span>{titleSuffix}
          </h2>
          {subtitle && (
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        <div className={cn("grid gap-4 sm:gap-8", 
          columns === 3 ? "sm:grid-cols-2 md:grid-cols-3" : 
          columns === 2 ? "sm:grid-cols-2" : 
          columns === 4 ? "sm:grid-cols-2 md:grid-cols-4" : 
          "sm:grid-cols-2 md:grid-cols-3"
        )}>
          {features.map((feature: { icon?: string; title: string; description: string }, i: number) => {
            const Icon = getIconWithFallback(feature.icon, Check);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-card border-gradient-ice rounded-2xl p-5 sm:p-8 relative group hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:glow-ice-sm transition-shadow">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const FeaturedProductBlock = ({ data, settings, onAddToCart }: { data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, settingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/site-settings')
        ]);
        const productsData = await productsRes.json();
        const settingsData = await settingsRes.json();
        setProducts(productsData);
        setSiteSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch product data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const featuredProduct = products.find(p => p.id === siteSettings?.featuredProductId) || products[0];
  const title = data.title || 'The Complete System';
  const subtitle = data.subtitle || 'Everything you need for professional-grade cold therapy at home.';
  const titleHighlight = data.titleHighlight || 'System';

  if (loading) {
    return (
      <section className={cn("bg-card/30 border-y border-border", getLayoutClasses(settings))} data-testid="block-featuredproduct">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="animate-pulse">Loading product...</div>
        </div>
      </section>
    );
  }

  if (!featuredProduct) {
    return (
      <section className={cn("bg-card/30 border-y border-border", getLayoutClasses(settings))} data-testid="block-featuredproduct">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-muted-foreground">No featured product available</p>
        </div>
      </section>
    );
  }

  const displayPrice = featuredProduct.price / 100;
  const isOnSale = featuredProduct.salePrice && featuredProduct.salePrice < featuredProduct.price;
  const saleDisplayPrice = featuredProduct.salePrice ? featuredProduct.salePrice / 100 : null;

  return (
    <section className={cn("bg-card/30 border-y border-border", getLayoutClasses(settings))} data-testid="block-featuredproduct">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
            {title.replace(titleHighlight, '')} <span className="text-gradient-ice">{titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">{subtitle}</p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <div className="aspect-square bg-black/50 rounded-3xl overflow-hidden border border-border p-8 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              {isOnSale && (
                <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg">
                  ON SALE
                </div>
              )}
              {featuredProduct.primaryImage && (
                <img
                  src={featuredProduct.primaryImage}
                  alt={featuredProduct.name}
                  className="w-full h-full object-contain relative z-10"
                />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <p className="text-primary font-medium tracking-wider uppercase mb-2">Complete Cold Plunge System</p>
              <h3 className="text-3xl md:text-4xl font-bold mb-3">{featuredProduct.name}</h3>
              {featuredProduct.tagline && <p className="text-xl text-muted-foreground mb-4">{featuredProduct.tagline}</p>}
              {featuredProduct.description && <p className="text-muted-foreground leading-relaxed">{featuredProduct.description}</p>}
            </div>

            {featuredProduct.features && featuredProduct.features.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-4">Key Features</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {featuredProduct.features.slice(0, 6).map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4 sm:gap-6 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Complete System Price</p>
                {isOnSale && saleDisplayPrice ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-muted-foreground line-through text-lg sm:text-xl">${displayPrice.toLocaleString()}</span>
                      <span className="text-3xl sm:text-4xl font-bold text-red-500">${saleDisplayPrice.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-3xl sm:text-4xl font-bold text-gradient-ice">${displayPrice.toLocaleString()}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-center gap-2 bg-muted/50 rounded-xl p-1">
                  <Button variant="ghost" size="icon" className="w-11 h-11 min-w-[44px] min-h-[44px]" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <span className="font-medium w-8 text-center text-lg">{quantity}</span>
                  <Button variant="ghost" size="icon" className="w-11 h-11 min-w-[44px] min-h-[44px]" onClick={() => setQuantity(quantity + 1)}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="glow-ice-sm text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-auto w-full sm:w-auto"
                  onClick={() => onAddToCart?.(featuredProduct.id, quantity)}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const IconGridBlock = ({ data, settings }: { data: Record<string, any>; settings?: BlockSettings }) => {
  const items = data.items || [];
  const title = data.title || '';
  const titleHighlight = data.titleHighlight || '';
  const columns = data.columns || 5;
  
  return (
    <section className={getLayoutClasses(settings)} data-testid="block-icongrid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {title && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              {title.replace(titleHighlight, '')} <span className="text-gradient-ice">{titleHighlight}</span>
            </h2>
          </motion.div>
        )}

        <div className={cn("grid gap-3 sm:gap-6", 
          columns === 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : 
          columns === 4 ? "grid-cols-2 lg:grid-cols-4" : 
          columns === 3 ? "grid-cols-2 lg:grid-cols-3" : 
          "grid-cols-2"
        )}>
          {items.map((item: { icon?: string; title: string }, i: number) => {
            const Icon = getIconWithFallback(item.icon, Star);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-card border border-border rounded-2xl p-4 sm:p-6 text-center hover:border-primary/50 transition-colors"
              >
                <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-3 sm:mb-4" />
                <p className="font-medium text-sm sm:text-base">{item.title}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const SectionRefBlock: React.FC<{ data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }> = ({ data, settings, onAddToCart }) => {
  const [sectionBlocks, setSectionBlocks] = useState<PageBlock[]>([]);
  const [sectionName, setSectionName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!data.sectionId) {
      setLoading(false);
      setError(true);
      return;
    }
    fetch(`/api/sections/${data.sectionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((section) => {
        setSectionBlocks(Array.isArray(section.blocks) ? section.blocks : []);
        setSectionName(section.name || "");
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [data.sectionId]);

  if (loading) {
    return <div className="py-4 text-center text-gray-500 animate-pulse" data-testid="section-ref-loading">Loading section...</div>;
  }

  if (error || sectionBlocks.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 border border-dashed border-gray-700 rounded-lg" data-testid="section-ref-error">
        {error ? "Section not found or unavailable" : `Section "${sectionName}" has no blocks`}
      </div>
    );
  }

  return (
    <div data-testid={`section-ref-${data.sectionId}`} data-section-id={data.sectionId}>
      {sectionBlocks.map((block, index) => {
        if (!block) return null;
        const normalizedBlock = {
          id: block.id || `section-block-${index}`,
          type: block.type || "spacer",
          data: block.data || {},
          settings: block.settings || {},
        };
        const BlockComp = blockComponents[normalizedBlock.type];
        if (!BlockComp) {
          return (
            <div key={normalizedBlock.id}>
              <UnknownBlock data={normalizedBlock.data} blockType={normalizedBlock.type} />
            </div>
          );
        }
        return (
          <div key={normalizedBlock.id}>
            <BlockComp data={normalizedBlock.data} settings={normalizedBlock.settings} onAddToCart={onAddToCart} />
          </div>
        );
      })}
    </div>
  );
};

const blockComponents: Record<string, React.FC<{ data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }>> = {
  hero: HeroBlock,
  richText: RichTextBlock,
  image: ImageBlock,
  imageGrid: ImageGridBlock,
  productGrid: ProductGridBlock,
  testimonial: TestimonialBlock,
  faq: FAQBlock,
  cta: CTABlock,
  logoCloud: LogoCloudBlock,
  featureList: FeatureListBlock,
  featureGrid: FeatureGridBlock,
  divider: DividerBlock,
  spacer: SpacerBlock,
  videoEmbed: VideoEmbedBlock,
  guarantee: GuaranteeBlock,
  comparisonTable: ComparisonTableBlock,
  slider: SliderBlock,
  statsBar: StatsBarBlock,
  featuredProduct: FeaturedProductBlock,
  iconGrid: IconGridBlock,
  sectionRef: SectionRefBlock,
  blogPostFeed: BlogPostFeedBlock,
};

function resolveBlockComponent(type: string): React.FC<{ data: Record<string, any>; settings?: BlockSettings; onAddToCart?: (productId: string, quantity: number) => void }> | null {
  if (blockComponents[type]) return blockComponents[type];
  const legacyEntry = getLegacyBlock(type);
  if (legacyEntry?.renderComponent) return legacyEntry.renderComponent as any;
  ensureBlocksRegistered();
  const cmsEntry = getCmsBlock(type);
  if (cmsEntry?.renderComponent) return cmsEntry.renderComponent as any;
  return null;
}

// Safe accessor for nested data with defaults
const safeGet = <T,>(obj: Record<string, any> | undefined | null, key: string, defaultValue: T): T => {
  if (!obj || obj[key] === undefined || obj[key] === null) return defaultValue;
  return obj[key] as T;
};

// Ensure block has valid structure with defaults
const normalizeBlock = (block: PageBlock): PageBlock => {
  return {
    id: block.id || `block-${Math.random().toString(36).substr(2, 9)}`,
    type: block.type || 'spacer',
    data: block.data || {},
    settings: block.settings || {},
  };
};

export default function PageRenderer({ contentJson, legacyContent, onAddToCart }: PageRendererProps) {
  // Guardrail: Handle null/undefined contentJson
  if (contentJson && Array.isArray(contentJson.blocks) && contentJson.blocks.length > 0) {
    return (
      <div className="page-renderer" data-testid="page-renderer">
        {contentJson.blocks.map((block, index) => {
          // Guardrail: Skip null/undefined blocks
          if (!block) {
            console.warn(`Skipping null block at index ${index}`);
            return null;
          }

          // Normalize block to ensure all required fields exist
          const normalizedBlock = normalizeBlock(block);
          const BlockComponent = resolveBlockComponent(normalizedBlock.type);
          
          if (!BlockComponent) {
            return (
              <div
                key={normalizedBlock.id}
                id={normalizedBlock.settings?.anchor}
                data-testid={`block-container-${normalizedBlock.id}`}
              >
                <UnknownBlock data={normalizedBlock.data} blockType={normalizedBlock.type} />
              </div>
            );
          }

          return (
            <div 
              key={normalizedBlock.id} 
              id={normalizedBlock.settings?.anchor}
              data-testid={`block-container-${normalizedBlock.id}`}
            >
              <BlockComponent 
                data={normalizedBlock.data} 
                settings={normalizedBlock.settings} 
                onAddToCart={onAddToCart}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Guardrail: Handle legacy content
  if (legacyContent && typeof legacyContent === 'string' && legacyContent.trim().length > 0) {
    return (
      <div 
        className="legacy-content max-w-4xl mx-auto px-4 py-12 prose prose-invert prose-lg"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(legacyContent) }}
        data-testid="page-renderer-legacy"
      />
    );
  }

  // Guardrail: Return empty state instead of null
  return (
    <div className="page-renderer-empty min-h-[200px]" data-testid="page-renderer-empty" />
  );
}

export { PageRenderer, blockComponents };
export type { PageBlock, PageContentJson, BlockSettings };
