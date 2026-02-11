import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlideOutPanel, PanelFooter } from "@/components/ui/slide-out-panel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Trash2, Mail, Phone, UserPlus, Users, Shield, Package, Edit } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  role: "super_admin" | "admin" | "store_manager" | "fulfillment";
}

const ROLE_LABELS: Record<string, { label: string; description: string; icon: any; color: string }> = {
  super_admin: { label: "Super Admin", description: "Owner account with unrestricted access", icon: Shield, color: "bg-amber-500/20 text-amber-400" },
  admin: { label: "Admin", description: "Full access to all features", icon: Shield, color: "bg-primary/20 text-primary" },
  store_manager: { label: "Store Manager", description: "Full access except team management", icon: Shield, color: "bg-blue-500/20 text-blue-400" },
  fulfillment: { label: "Fulfillment", description: "View & manage orders only", icon: Package, color: "bg-green-500/20 text-green-400" },
};

type PanelMode = "add" | "edit";

export default function AdminTeam() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("add");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "admin" as "admin" | "store_manager" | "fulfillment" });
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TeamMember | null>(null);

  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team");
      if (res.status === 401) {
        setLocation("/admin/login");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add team member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Team member added" });
      closePanel();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update team member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Team member updated" });
      closePanel();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete team member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Team member removed" });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeleteConfirm(null);
    },
  });

  const openAddPanel = () => {
    setPanelMode("add");
    setEditingMemberId(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "admin" });
    setIsDirty(false);
    setIsPanelOpen(true);
  };

  const openEditPanel = (member: TeamMember) => {
    setPanelMode("edit");
    setEditingMemberId(member.id);
    setFormData({
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      email: member.email,
      phone: member.phone || "",
      password: "",
      role: member.role,
    });
    setIsDirty(false);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setEditingMemberId(null);
    setFormData({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "admin" });
    setIsDirty(false);
  };

  const handleSave = () => {
    if (panelMode === "add") {
      addMemberMutation.mutate(formData);
    } else if (editingMemberId) {
      const updatePayload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      };
      if (formData.password) {
        updatePayload.password = formData.password;
      }
      updateMemberMutation.mutate({ id: editingMemberId, data: updatePayload });
    }
  };

  const isSaving = addMemberMutation.isPending || updateMemberMutation.isPending;

  if (!adminLoading && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gray-950">
        <AdminNav role={role} />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
              <p className="text-gray-400">You don't have permission to access team management. This area is restricted to administrators only.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav currentPage="team" role={role} />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold">Team Management</h2>
            <p className="text-muted-foreground">Add and manage team members who can access the admin dashboard.</p>
          </div>
          <Button className="gap-2" onClick={openAddPanel} data-testid="button-add-member">
            <UserPlus className="w-4 h-4" />
            Add Team Member
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <div className="grid gap-4">
            {team?.map((member) => {
              const roleInfo = ROLE_LABELS[member.role] || ROLE_LABELS.admin;
              const RoleIcon = roleInfo.icon;
              return (
                <Card key={member.id} data-testid={`card-member-${member.id}`}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" data-testid={`text-name-${member.id}`}>{member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.name}</p>
                          <Badge variant="outline" className="text-xs" data-testid={`badge-role-${member.id}`}>
                            {roleInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1" data-testid={`text-email-${member.id}`}>
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </span>
                          {member.phone && (
                            <span className="flex items-center gap-1" data-testid={`text-phone-${member.id}`}>
                              <Phone className="w-3 h-3" />
                              {member.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditPanel(member)}
                        data-testid={`button-edit-${member.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {member.role !== "super_admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(member)}
                        disabled={deleteMemberMutation.isPending}
                        data-testid={`button-delete-${member.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {team?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No team members yet. Add your first team member above.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <SlideOutPanel
        open={isPanelOpen}
        onClose={closePanel}
        title={panelMode === "add" ? "Add Team Member" : "Edit Team Member"}
        isDirty={isDirty}
        width="md"
        footer={
          <PanelFooter
            onCancel={closePanel}
            onSave={handleSave}
            isSaving={isSaving}
            saveLabel={panelMode === "add" ? "Add Team Member" : "Save Changes"}
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="First name"
                required
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  setIsDirty(true);
                }}
                placeholder="Last name"
                required
                data-testid="input-last-name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setIsDirty(true);
              }}
              placeholder="email@example.com"
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                setIsDirty(true);
              }}
              placeholder="(555) 123-4567"
              data-testid="input-phone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {panelMode === "add" ? "Password" : "New Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                setIsDirty(true);
              }}
              placeholder={panelMode === "add" ? "Initial password" : "Leave blank to keep current"}
              required={panelMode === "add"}
              data-testid="input-password"
            />
            {panelMode === "edit" && (
              <p className="text-xs text-muted-foreground">Leave blank to keep the current password.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {formData.role === "super_admin" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="font-medium text-amber-400">Super Admin</span>
                <span className="text-xs text-muted-foreground ml-auto">Cannot be changed</span>
              </div>
            ) : (
            <Select
              value={formData.role}
              onValueChange={(value: "admin" | "store_manager" | "fulfillment") => {
                setFormData({ ...formData, role: value });
                setIsDirty(true);
              }}
            >
              <SelectTrigger id="role" data-testid="select-role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Admin</span>
                      <p className="text-xs text-muted-foreground">Full access to all features</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="store_manager">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Store Manager</span>
                      <p className="text-xs text-muted-foreground">Full access except team management</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="fulfillment">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Fulfillment</span>
                      <p className="text-xs text-muted-foreground">View & manage orders only</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            )}
          </div>
        </div>
      </SlideOutPanel>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteConfirm?.firstName && deleteConfirm?.lastName ? `${deleteConfirm.firstName} ${deleteConfirm.lastName}` : deleteConfirm?.name}</strong> ({deleteConfirm?.email})? This will revoke all their access to the admin dashboard. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMemberMutation.mutate(deleteConfirm.id)}
              disabled={deleteMemberMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
