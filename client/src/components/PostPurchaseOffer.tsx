import { useState, useEffect } from "react";
import { Timer, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number | null;
  primaryImage?: string | null;
  tagline?: string | null;
}

interface PostPurchaseOfferData {
  id: string;
  orderId: string;
  productId: string;
  discountPercent: number;
  discountedPrice: number;
  expiresAt: string;
  product: Product;
}

interface PostPurchaseOfferProps {
  orderId: string;
}

export default function PostPurchaseOffer({ orderId }: PostPurchaseOfferProps) {
  const [offer, setOffer] = useState<PostPurchaseOfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await fetch(`/api/upsells/post-purchase/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.offer) {
            setOffer(data.offer);
          }
        }
      } catch (err) {
        console.error("Failed to fetch post-purchase offer:", err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOffer();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!offer) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(offer.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m left`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s left`);
      } else {
        setTimeLeft(`${seconds}s left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const handleAccept = async () => {
    if (!offer) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/upsells/post-purchase/${offer.id}/accept`, {
        method: "POST",
      });
      
      if (res.ok) {
        setAccepted(true);
      }
    } catch (err) {
      console.error("Failed to accept offer:", err);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!offer) return;

    try {
      await fetch(`/api/upsells/post-purchase/${offer.id}/decline`, {
        method: "POST",
      });
      setDeclined(true);
    } catch (err) {
      console.error("Failed to decline offer:", err);
    }
  };

  if (loading || !offer || declined) {
    return null;
  }

  if (accepted) {
    return (
      <Card className="mb-8 border-green-500/50 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Added to Your Order!</h3>
          <p className="text-muted-foreground text-sm">
            {offer.product.name} will be shipped with your order.
          </p>
        </CardContent>
      </Card>
    );
  }

  const originalPrice = offer.product.salePrice || offer.product.price;
  const savings = originalPrice - offer.discountedPrice;

  return (
    <Card className="mb-8 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Special Offer - Just for You
          </CardTitle>
          <div className="flex items-center gap-1.5 text-sm text-orange-400">
            <Timer className="w-4 h-4" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4" data-testid="post-purchase-offer">
          {offer.product.primaryImage && (
            <div className="w-24 h-24 bg-black/30 rounded-lg flex-shrink-0 p-2">
              <img
                src={offer.product.primaryImage}
                alt={offer.product.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-semibold mb-1">{offer.product.name}</h4>
            {offer.product.tagline && (
              <p className="text-sm text-muted-foreground mb-2">{offer.product.tagline}</p>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                ${(offer.discountedPrice / 100).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                ${(originalPrice / 100).toLocaleString()}
              </span>
              <span className="text-xs text-green-500 font-medium">
                Save ${(savings / 100).toLocaleString()}{" "}
                ({offer.discountPercent}% off)
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          Add this item now and we'll include it with your order - no extra shipping cost!
        </div>

        <div className="flex gap-3">
          <Button
            className="flex-1 gap-2"
            onClick={handleAccept}
            disabled={processing}
            data-testid="button-accept-offer"
          >
            <Check className="w-4 h-4" />
            {processing ? "Adding..." : "Yes, Add to Order"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDecline}
            className="text-muted-foreground"
            data-testid="button-decline-offer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
