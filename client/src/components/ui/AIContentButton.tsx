import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AIContentButtonProps {
  fieldType: 'heading' | 'subheading' | 'description' | 'cta' | 'feature_title' | 'feature_description' | 'tagline' | 'bullet_point';
  context?: string;
  onGenerate: (content: string) => void;
  className?: string;
  pageTitle?: string;
  blockType?: string;
  testId?: string;
}

const PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  heading: [
    { label: "Compelling headline", prompt: "Write a compelling, action-oriented headline" },
    { label: "Question hook", prompt: "Write a question-based headline that hooks the reader" },
    { label: "Benefit-focused", prompt: "Write a benefit-focused headline highlighting the value" },
  ],
  subheading: [
    { label: "Expand on headline", prompt: "Write a supporting subheadline that expands on the main message" },
    { label: "Add urgency", prompt: "Write a subheadline that creates urgency" },
    { label: "Social proof hint", prompt: "Write a subheadline that hints at social proof or popularity" },
  ],
  description: [
    { label: "Concise & compelling", prompt: "Write a concise, compelling description (2-3 sentences)" },
    { label: "Feature highlights", prompt: "Write a description highlighting key features and benefits" },
    { label: "Story-driven", prompt: "Write a story-driven description that connects emotionally" },
  ],
  cta: [
    { label: "Action-oriented", prompt: "Write a short, action-oriented call-to-action button text" },
    { label: "Urgency", prompt: "Write a CTA with subtle urgency" },
    { label: "Value-focused", prompt: "Write a CTA that emphasizes the value received" },
  ],
  feature_title: [
    { label: "Benefit-first", prompt: "Write a short, benefit-first feature title" },
    { label: "Action verb", prompt: "Write a feature title starting with an action verb" },
  ],
  feature_description: [
    { label: "Clear & concise", prompt: "Write a clear, concise feature description (1-2 sentences)" },
    { label: "Problem-solution", prompt: "Write a feature description that addresses a pain point" },
  ],
  tagline: [
    { label: "Memorable", prompt: "Write a memorable brand tagline" },
    { label: "Value proposition", prompt: "Write a tagline that communicates the unique value proposition" },
  ],
  bullet_point: [
    { label: "Benefit statement", prompt: "Write a benefit-focused bullet point" },
    { label: "Feature + benefit", prompt: "Write a bullet point combining feature with its benefit" },
  ],
};

export function AIContentButton({ 
  fieldType, 
  context, 
  onGenerate, 
  className,
  pageTitle,
  blockType,
  testId
}: AIContentButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async (promptStyle: string) => {
    setLoading(promptStyle);
    try {
      const res = await fetch('/api/admin/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fieldType,
          promptStyle,
          context: context || '',
          pageTitle: pageTitle || '',
          blockType: blockType || '',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate content');
      }

      const data = await res.json();
      onGenerate(data.content);
      setOpen(false);
      toast({ title: 'Content generated!' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to generate', 
        description: error.message || 'Please check your OpenAI configuration.',
        variant: 'destructive' 
      });
    } finally {
      setLoading(null);
    }
  };

  const prompts = PROMPTS[fieldType] || PROMPTS.description;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-7 w-7 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10", className)}
          title="AI Generate"
          data-testid={testId || `btn-ai-${blockType}-${fieldType}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground px-2 py-1">Generate with AI</p>
          {prompts.map((p) => (
            <Button
              key={p.label}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8"
              onClick={() => handleGenerate(p.prompt)}
              disabled={loading !== null}
              data-testid={`ai-option-${p.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {loading === p.prompt ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3 mr-2 text-cyan-400" />
              )}
              {p.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
