import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

export default function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover", sizeClasses[size], className)}
        data-testid="img-user-avatar"
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center select-none",
        sizeClasses[size],
        className
      )}
      data-testid="img-user-avatar"
    >
      {getInitials(name)}
    </div>
  );
}
