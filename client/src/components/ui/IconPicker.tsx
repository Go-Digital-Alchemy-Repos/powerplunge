import { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const POPULAR_ICONS = Array.from(new Set([
  "Snowflake", "Thermometer", "ThermometerSnowflake", "Zap", "Shield", "ShieldCheck",
  "Heart", "HeartPulse", "Star", "Check", "CheckCircle", "Award", "Trophy",
  "Timer", "Clock", "Truck", "Package", "Box", "Gauge", "Filter",
  "Dumbbell", "Activity", "TrendingUp", "BarChart", "Users", "User",
  "Building2", "Home", "Phone", "Mail", "MessageCircle", "Send",
  "Volume2", "VolumeX", "Sparkles", "Sun", "Moon", "Droplets", "Waves",
  "ArrowRight", "ArrowLeft", "ChevronRight", "ChevronDown", "Plus", "Minus",
  "X", "Menu", "Search", "Settings", "Wrench",
  "Lock", "Unlock", "Key", "Eye", "EyeOff", "AlertCircle", "Info",
  "HelpCircle", "Lightbulb", "Flame", "Leaf", "Tree",
  "Mountain", "Cloud", "CloudSnow", "Wind", "Umbrella",
  "Gift", "ShoppingCart", "ShoppingBag", "CreditCard", "Wallet", "DollarSign",
  "Percent", "Tag", "Tags", "Bookmark", "Flag", "MapPin", "Navigation",
  "Globe", "Link", "ExternalLink", "Download", "Upload", "Share", "Share2",
  "Copy", "Clipboard", "FileText", "File", "Folder", "Image", "Camera",
  "Video", "Play", "Pause", "Square", "Circle", "Triangle", "Hexagon",
  "Grid", "Layout", "Columns", "List", "ListOrdered", "Layers",
  "RefreshCw", "RotateCcw", "Repeat", "Shuffle", "SkipForward", "SkipBack",
  "FastForward", "Rewind", "Power", "Battery", "BatteryCharging", "Wifi",
  "Bluetooth", "Radio", "Tv", "Monitor", "Laptop", "Smartphone", "Tablet",
  "Watch", "Headphones", "Speaker", "Mic", "MicOff", "Bell", "BellOff",
  "Calendar", "CalendarCheck", "CalendarX", "Hourglass", "History",
  "Archive", "Trash", "Trash2", "Pencil", "PenTool",
  "Eraser", "Highlighter", "Type", "Bold", "Italic", "Underline",
  "AlignLeft", "AlignCenter", "AlignRight", "AlignJustify",
  "Code", "Terminal", "Bug", "Database", "Server", "HardDrive",
  "Cpu", "Printer", "Paperclip", "Pin",
  "Maximize", "Minimize", "ZoomIn", "ZoomOut", "Move",
  "Hand", "MousePointer", "Crosshair", "Target",
  "Compass", "Map", "Route", "Signpost", "Footprints",
  "Car", "Bus", "Train", "Plane", "Ship", "Anchor", "Bike", "Rocket",
  "Satellite", "Tent", "Flashlight", "Backpack",
  "Briefcase", "Suitcase", "Fingerprint", "Scan",
  "QrCode", "Barcode", "Hash", "AtSign", "Euro",
  "PoundSterling", "Bitcoin", "Coins", "Banknote", "Receipt", "FileSpreadsheet",
  "PieChart", "LineChart", "AreaChart", "Presentation", "Megaphone",
  "Podcast", "Rss", "Newspaper", "BookOpen", "Book", "Library", "GraduationCap",
  "School", "Building", "Landmark", "Church", "Hospital", "Hotel", "Store",
  "Factory", "Warehouse", "Castle", "Construction", "Hammer", "Scissors",
  "Ruler", "Scale", "Pipette", "Syringe", "Stethoscope", "Pill", "TestTube",
  "Microscope", "Dna", "Atom", "Orbit", "Globe2", "Earth",
  "Sunrise", "Sunset", "CloudSun", "CloudMoon", "CloudRain", "CloudLightning",
  "Tornado", "Shell", "Fish", "Bird", "Cat", "Dog",
  "Rabbit", "Squirrel", "PawPrint", "Bone", "Apple", "Banana", "Cherry",
  "Grape", "Lemon", "Carrot", "Pizza", "Sandwich",
  "Croissant", "Cookie", "Cake", "IceCream", "Coffee", "Wine", "Beer",
  "Martini", "Soup", "Utensils", "ChefHat", "Microwave", "Refrigerator",
  "ThermometerSun", "Heater", "Fan", "AirVent", "Droplet",
]));

const kebabToPascal = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const pascalToKebab = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function IconPicker({ value, onChange, className, placeholder = "Select icon" }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allIcons = useMemo(() => {
    return Object.keys(LucideIcons).filter(
      (key) => {
        if (
          key === 'default' ||
          key === 'createLucideIcon' ||
          key === 'icons' ||
          key === 'createElement' ||
          key.startsWith('Lucide') ||
          !/^[A-Z]/.test(key)
        ) return false;
        const val = (LucideIcons as any)[key];
        return val && (typeof val === 'function' || typeof val === 'object');
      }
    );
  }, []);

  const filteredIcons = useMemo(() => {
    const searchLower = search.toLowerCase();
    if (!searchLower) {
      return POPULAR_ICONS.filter(name => allIcons.includes(name));
    }
    return allIcons.filter(name => 
      name.toLowerCase().includes(searchLower) ||
      pascalToKebab(name).includes(searchLower)
    ).slice(0, 150);
  }, [search, allIcons]);

  const getIcon = (name: string) => {
    if (!name) return null;
    const pascalName = kebabToPascal(name);
    const icon = (LucideIcons as any)[pascalName] || (LucideIcons as any)[name];
    if (!icon) return null;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof)) return icon;
    return null;
  };

  const SelectedIcon = value ? getIcon(value) : null;

  const handleSelect = (iconName: string) => {
    onChange(pascalToKebab(iconName));
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start gap-2 bg-muted border-border text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid="icon-picker-trigger"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-background"
            data-testid="icon-picker-search"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="p-2">
            {!search && (
              <p className="text-xs text-muted-foreground mb-2 px-1">Popular icons</p>
            )}
            <div className="grid grid-cols-6 gap-1">
              {filteredIcons.map((iconName) => {
                const Icon = getIcon(iconName);
                if (!Icon) return null;
                const kebabName = pascalToKebab(iconName);
                const isSelected = value === kebabName || value === iconName;
                return (
                  <Button
                    key={iconName}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 w-9 p-0",
                      isSelected && "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(iconName);
                    }}
                    title={kebabName}
                    aria-label={`Select ${kebabName} icon`}
                    data-testid={`icon-option-${kebabName}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </Button>
                );
              })}
            </div>
            {filteredIcons.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No icons found for "{search}"
              </p>
            )}
          </div>
        </ScrollArea>
        {value && (
          <div className="p-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
              data-testid="button-icon-clear"
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
