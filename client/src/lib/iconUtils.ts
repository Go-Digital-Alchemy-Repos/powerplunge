import * as LucideIcons from "lucide-react";

const kebabToPascal = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

type IconComponentType = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;

export function getLucideIcon(iconName: string): IconComponentType | null {
  if (!iconName) return null;
  
  const pascalName = kebabToPascal(iconName);
  const icon = (LucideIcons as any)[pascalName] || (LucideIcons as any)[iconName];
  
  if (icon && (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof))) {
    return icon as IconComponentType;
  }
  
  return null;
}

export function getIconWithFallback(
  iconName: string | undefined, 
  fallback: IconComponentType
): IconComponentType {
  if (!iconName) return fallback;
  return getLucideIcon(iconName) || fallback;
}
