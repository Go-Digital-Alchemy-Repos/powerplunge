import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useToast } from "@/hooks/use-toast";
import type { ProfileForm, PasswordForm } from "../types";

export function useAccountProfile() {
  const { isAuthenticated, getAuthHeader } = useCustomerAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profileData, isLoading: profileLoading } = useQuery<{
    user: { id: string; email: string; firstName: string; lastName: string } | null;
    customer: { phone: string; address: string; city: string; state: string; zipCode: string; country: string } | null;
  }>({
    queryKey: ["/api/customer/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/customer/auth/me", {
        headers: { ...getAuthHeader() },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const customer = await res.json();
      return {
        user: { id: customer.id, email: customer.email, firstName: customer.name?.split(' ')[0] || '', lastName: customer.name?.split(' ').slice(1).join(' ') || '' },
        customer,
      };
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (profileData) {
      setProfileForm({
        firstName: profileData.user?.firstName || "",
        lastName: profileData.user?.lastName || "",
        email: profileData.user?.email || "",
        phone: profileData.customer?.phone || "",
        address: profileData.customer?.address || "",
        city: profileData.customer?.city || "",
        state: profileData.customer?.state || "",
        zipCode: profileData.customer?.zipCode || "",
        country: profileData.customer?.country || "USA",
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await fetch("/api/customer/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/auth/me"] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/customer/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully!" });
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const avatarUrl = data.objectPath || data.metadata?.publicUrl;
      await fetch("/api/customer/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ avatarUrl }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/auth/me"] });
      toast({ title: "Avatar updated" });
    } catch {
      toast({ title: "Failed to upload avatar", variant: "destructive" });
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await fetch("/api/customer/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ avatarUrl: null }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/auth/me"] });
      toast({ title: "Avatar removed" });
    } catch {
      toast({ title: "Failed to remove avatar", variant: "destructive" });
    }
  };

  return {
    profileForm,
    setProfileForm,
    passwordForm,
    setPasswordForm,
    profileLoading,
    updateProfileMutation,
    changePasswordMutation,
    handleAvatarUpload,
    handleAvatarRemove,
  };
}
