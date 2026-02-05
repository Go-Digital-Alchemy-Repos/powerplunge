import { useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  primaryImage?: string | null;
}

interface UpsellSuggestion {
  product: Product;
  relationshipType: string;
  reason: string;
  discount?: number;
}

interface CartUpsellsProps {
  cartProductIds: string[];
  onAddToCart: (product: Product) => void;
}

export default function CartUpsells({ cartProductIds, onAddToCart }: CartUpsellsProps) {
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (cartProductIds.length === 0) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/upsells/cart-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: cartProductIds }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.slice(0, 2));
          
          if (data.length > 0) {
            data.forEach((s: UpsellSuggestion) => {
              fetch("/api/upsells/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: cartProductIds[0],
                  upsellProductId: s.product.id,
                  upsellType: "cart",
                  eventType: "impression",
                }),
              }).catch(() => {});
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch upsell suggestions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [cartProductIds.join(",")]);

  const handleAddClick = async (suggestion: UpsellSuggestion) => {
    setAdding(suggestion.product.id);
    
    await fetch("/api/upsells/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: cartProductIds[0],
        upsellProductId: suggestion.product.id,
        upsellType: "cart",
        eventType: "click",
      }),
    }).catch(() => {});

    onAddToCart(suggestion.product);
    
    setSuggestions((prev) => prev.filter((s) => s.product.id !== suggestion.product.id));
    setAdding(null);
  };

  if (loading || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-primary">Complete Your Setup</span>
      </div>
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.product.id}
            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            data-testid={`upsell-item-${suggestion.product.id}`}
          >
            {suggestion.product.primaryImage && (
              <div className="w-12 h-12 bg-black/50 rounded flex-shrink-0 p-1">
                <img
                  src={suggestion.product.primaryImage}
                  alt={suggestion.product.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{suggestion.product.name}</p>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              <p className="text-sm font-bold text-primary">
                ${((suggestion.product.salePrice || suggestion.product.price) / 100).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0"
              onClick={() => handleAddClick(suggestion)}
              disabled={adding === suggestion.product.id}
              data-testid={`button-add-upsell-${suggestion.product.id}`}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
