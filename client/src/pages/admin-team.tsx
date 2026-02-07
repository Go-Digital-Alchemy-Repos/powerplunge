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
import { Trash2, Mail, User, UserPlus, Users, Shield, Package, Edit } from "lucide-react";
import AdminNav from "@/components/admin/AdminNav";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Legacy: "firstName lastName"
  email: string;
  role: "admin" | "store_manager" | "fulfillment";
}

const ROLE_LABELS = {
  admin: { label: "Admin", description: "Full access to all features", icon: Shield, color: "bg-primary/20 text-primary" },
  store_manager: { label: "Store Manager", description: "Full access except team management", icon: Shield, color: "bg-blue-500/20 text-blue-400" },
  fulfillment: { label: "Fulfillment", description: "View & manage orders only", icon: Package, color: "bg-green-500/20 text-green-400" },
};

export default function AdminTeam() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role, hasFullAccess, isLoading: adminLoading } = useAdmin();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [newMember, setNewMember] = useState({ firstName: "", lastName: "", email: "", password: "", role: "admin" as "admin" | "store_manager" | "fulfillment" });
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<TeamMember | null>(null);
  const [editingRoleMemberId, setEditingRoleMemberId] = useState<string | null>(null);

  const { data: team, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team"],
    queryFn: async () => {
      const res = await fetch("/api/admin/team");
      if (res.status === 401) {
        setLocation("/admin");
        return [];
      }
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string; password: string; role: string }) => {
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      toast({ title: "Role updated" });
      setEditingRoleMemberId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openPanel = () => {
    setNewMember({ firstName: "", lastName: "", email: "", password: "", role: "admin" });
    setIsDirty(false);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setNewMember({ firstName: "", lastName: "", email: "", password: "", role: "admin" });
    setIsDirty(false);
  };

  const handleSave = () => {
    addMemberMutation.mutate(newMember);
  };

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
          <Button className="gap-2" onClick={openPanel} data-testid="button-add-member">
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
              const isEditingRole = editingRoleMemberId === member.id;
              return (
                <Card key={member.id} data-testid={`card-member-${member.id}`}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                        <RoleIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.name}</p>
                          {isEditingRole ? (
                            <Select
                              defaultValue={member.role}
                              onValueChange={(value: "admin" | "store_manager" | "fulfillment") => {
                                updateRoleMutation.mutate({ id: member.id, role: value });
                              }}
                            >
                              <SelectTrigger className="h-7 w-40 text-xs" data-testid={`select-role-${member.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="store_manager">Store Manager</SelectItem>
                                <SelectItem value="fulfillment">Fulfillment</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {roleInfo.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRoleMemberId(isEditingRole ? null : member.id)}
                        data-testid={`button-edit-role-${member.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
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
        title="Add Team Member"
        isDirty={isDirty}
        width="md"
        footer={
          <PanelFooter
            onCancel={closePanel}
            onSave={handleSave}
            isSaving={addMemberMutation.isPending}
            saveLabel="Add Team Member"
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={newMember.firstName}
                onChange={(e) => {
                  setNewMember({ ...newMember, firstName: e.target.value });
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
                value={newMember.lastName}
                onChange={(e) => {
                  setNewMember({ ...newMember, lastName: e.target.value });
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
              value={newMember.email}
              onChange={(e) => {
                setNewMember({ ...newMember, email: e.target.value });
                setIsDirty(true);
              }}
              placeholder="email@example.com"
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={newMember.password}
              onChange={(e) => {
                setNewMember({ ...newMember, password: e.target.value });
                setIsDirty(true);
              }}
              placeholder="Initial password"
              required
              data-testid="input-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={newMember.role}
              onValueChange={(value: "admin" | "store_manager" | "fulfillment") => {
                setNewMember({ ...newMember, role: value });
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
