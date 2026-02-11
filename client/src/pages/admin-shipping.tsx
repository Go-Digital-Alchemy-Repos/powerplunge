import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Truck, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminNav from "@/components/admin/AdminNav";

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[] | null;
  active: boolean;
}

interface ShippingRate {
  id: string;
  zoneId: string;
  name: string;
  description: string | null;
  price: number;
  minOrderAmount: number | null;
  estimatedDays: string | null;
  active: boolean;
}

export default function AdminShipping() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [isZoneDialogOpen, setIsZoneDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  
  const [zoneForm, setZoneForm] = useState({ name: "", countries: "USA", active: true });
  const [rateForm, setRateForm] = useState({
    name: "",
    description: "",
    price: 0,
    minOrderAmount: "",
    estimatedDays: "",
    active: true,
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery<ShippingZone[]>({
    queryKey: ["/api/admin/shipping/zones"],
  });

  const { data: rates = [], isLoading: ratesLoading } = useQuery<ShippingRate[]>({
    queryKey: ["/api/admin/shipping/rates"],
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/shipping/zones", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create zone");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shipping zone created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      setIsZoneDialogOpen(false);
      setZoneForm({ name: "", countries: "USA", active: true });
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/shipping/zones/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update zone");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shipping zone updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
      setIsZoneDialogOpen(false);
      setEditingZone(null);
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/shipping/zones/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete zone");
    },
    onSuccess: () => {
      toast({ title: "Shipping zone deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/zones"] });
    },
  });

  const createRateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/admin/shipping/rates", {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create rate");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shipping rate created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/rates"] });
      setIsRateDialogOpen(false);
      resetRateForm();
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/admin/shipping/rates/${id}`, {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update rate");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shipping rate updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/rates"] });
      setIsRateDialogOpen(false);
      setEditingRate(null);
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/shipping/rates/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete rate");
    },
    onSuccess: () => {
      toast({ title: "Shipping rate deleted!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shipping/rates"] });
    },
  });

  const resetRateForm = () => {
    setRateForm({ name: "", description: "", price: 0, minOrderAmount: "", estimatedDays: "", active: true });
  };

  const openEditZone = (zone: ShippingZone) => {
    setEditingZone(zone);
    setZoneForm({ name: zone.name, countries: zone.countries.join(", "), active: zone.active });
    setIsZoneDialogOpen(true);
  };

  const openEditRate = (rate: ShippingRate) => {
    setEditingRate(rate);
    setRateForm({
      name: rate.name,
      description: rate.description || "",
      price: rate.price / 100,
      minOrderAmount: rate.minOrderAmount ? String(rate.minOrderAmount / 100) : "",
      estimatedDays: rate.estimatedDays || "",
      active: rate.active,
    });
    setSelectedZoneId(rate.zoneId);
    setIsRateDialogOpen(true);
  };

  const handleZoneSubmit = () => {
    const data = {
      name: zoneForm.name,
      countries: zoneForm.countries.split(",").map(c => c.trim()),
      active: zoneForm.active,
    };
    if (editingZone) {
      updateZoneMutation.mutate({ id: editingZone.id, data });
    } else {
      createZoneMutation.mutate(data);
    }
  };

  const handleRateSubmit = () => {
    const data = {
      zoneId: selectedZoneId,
      name: rateForm.name,
      description: rateForm.description || null,
      price: Math.round(rateForm.price * 100),
      minOrderAmount: rateForm.minOrderAmount ? Math.round(parseFloat(rateForm.minOrderAmount) * 100) : null,
      estimatedDays: rateForm.estimatedDays || null,
      active: rateForm.active,
    };
    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data });
    } else {
      createRateMutation.mutate(data);
    }
  };

  const formatCurrency = (cents: number) => cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access shipping. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="shipping" role={role} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Shipping</h1>
            <p className="text-muted-foreground mt-1">Manage shipping zones and rates</p>
          </div>
        </div>

        <Tabs defaultValue="zones" className="space-y-6">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="zones" data-testid="tab-zones">Shipping Zones</TabsTrigger>
            <TabsTrigger value="rates" data-testid="tab-rates">Shipping Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="zones" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingZone(null); setZoneForm({ name: "", countries: "USA", active: true }); setIsZoneDialogOpen(true); }} className="bg-cyan-500 hover:bg-cyan-600" data-testid="button-create-zone">
                <Plus className="w-4 h-4 mr-2" /> Add Zone
              </Button>
            </div>

            {zonesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : zones.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No shipping zones configured</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {zones.map((zone) => (
                  <Card key={zone.id} className={`bg-slate-800 border-slate-700 ${!zone.active ? "opacity-60" : ""}`} data-testid={`zone-${zone.id}`}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <MapPin className="w-6 h-6 text-cyan-400" />
                        <div>
                          <h3 className="font-bold text-white">{zone.name}</h3>
                          <p className="text-slate-400 text-sm">{zone.countries.join(", ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded ${zone.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {zone.active ? "Active" : "Inactive"}
                        </span>
                        <span className="text-slate-400">{rates.filter(r => r.zoneId === zone.id).length} rates</span>
                        <Button variant="ghost" size="sm" onClick={() => openEditZone(zone)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteZoneMutation.mutate(zone.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rates" className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingRate(null); resetRateForm(); setSelectedZoneId(zones[0]?.id || ""); setIsRateDialogOpen(true); }} className="bg-cyan-500 hover:bg-cyan-600" disabled={zones.length === 0} data-testid="button-create-rate">
                <Plus className="w-4 h-4 mr-2" /> Add Rate
              </Button>
            </div>

            {ratesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : rates.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Truck className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No shipping rates configured</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rates.map((rate) => {
                  const zone = zones.find(z => z.id === rate.zoneId);
                  return (
                    <Card key={rate.id} className={`bg-slate-800 border-slate-700 ${!rate.active ? "opacity-60" : ""}`} data-testid={`rate-${rate.id}`}>
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Truck className="w-6 h-6 text-cyan-400" />
                          <div>
                            <h3 className="font-bold text-white">{rate.name}</h3>
                            <p className="text-slate-400 text-sm">{zone?.name} • {rate.estimatedDays || "No ETA"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-green-400">{formatCurrency(rate.price)}</p>
                            {rate.minOrderAmount && <p className="text-xs text-slate-400">Free over ${(rate.minOrderAmount / 100).toFixed(0)}</p>}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => openEditRate(rate)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteRateMutation.mutate(rate.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={isZoneDialogOpen} onOpenChange={setIsZoneDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>{editingZone ? "Edit Zone" : "Add Shipping Zone"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Zone Name</Label>
                <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="United States" className="bg-slate-700 border-slate-600" />
              </div>
              <div>
                <Label>Countries (comma-separated)</Label>
                <Input value={zoneForm.countries} onChange={(e) => setZoneForm({ ...zoneForm, countries: e.target.value })} placeholder="USA, Canada" className="bg-slate-700 border-slate-600" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={zoneForm.active} onCheckedChange={(v) => setZoneForm({ ...zoneForm, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsZoneDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleZoneSubmit} className="bg-cyan-500 hover:bg-cyan-600">{editingZone ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>{editingRate ? "Edit Rate" : "Add Shipping Rate"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Shipping Zone</Label>
                <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)} className="w-full p-2 bg-slate-700 border border-slate-600 rounded">
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Rate Name</Label>
                <Input value={rateForm.name} onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })} placeholder="Standard Shipping" className="bg-slate-700 border-slate-600" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={rateForm.description} onChange={(e) => setRateForm({ ...rateForm, description: e.target.value })} placeholder="5-7 business days" className="bg-slate-700 border-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price ($)</Label>
                  <Input type="number" value={rateForm.price} onChange={(e) => setRateForm({ ...rateForm, price: parseFloat(e.target.value) || 0 })} placeholder="0 for free" className="bg-slate-700 border-slate-600" />
                </div>
                <div>
                  <Label>Free Shipping Over ($)</Label>
                  <Input value={rateForm.minOrderAmount} onChange={(e) => setRateForm({ ...rateForm, minOrderAmount: e.target.value })} placeholder="Optional" className="bg-slate-700 border-slate-600" />
                </div>
              </div>
              <div>
                <Label>Estimated Delivery</Label>
                <Input value={rateForm.estimatedDays} onChange={(e) => setRateForm({ ...rateForm, estimatedDays: e.target.value })} placeholder="5-7 business days" className="bg-slate-700 border-slate-600" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={rateForm.active} onCheckedChange={(v) => setRateForm({ ...rateForm, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsRateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRateSubmit} className="bg-cyan-500 hover:bg-cyan-600">{editingRate ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
