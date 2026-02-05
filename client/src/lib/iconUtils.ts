import * as LucideIcons from "lucide-react";

const kebabToPascal = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

export function getLucideIcon(iconName: string): React.ComponentType<{ className?: string }> | null {
  if (!iconName) return null;
  
  const pascalName = iconName.includes('-') ? kebabToPascal(iconName) : iconName;
  const icon = (LucideIcons as any)[pascalName] || (LucideIcons as any)[iconName];
  
  if (typeof icon === 'function') {
    return icon;
  }
  
  return null;
}

export function getIconWithFallback(
  iconName: string | undefined, 
  fallback: React.ComponentType<{ className?: string }>
): React.ComponentType<{ className?: string }> {
  if (!iconName) return fallback;
  return getLucideIcon(iconName) || fallback;
}
