import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  "data-testid"?: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface MobileTabsListProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (value: string) => void;
  className?: string;
  tabsListClassName?: string;
}

export function MobileTabsList({ tabs, activeTab, onTabChange, className, tabsListClassName }: MobileTabsListProps) {
  const activeLabel = tabs.find((t) => t.value === activeTab)?.label || activeTab;

  return (
    <div className={cn("w-full", className)}>
      <div className="md:hidden">
        <Select value={activeTab} onValueChange={onTabChange}>
          <SelectTrigger className="w-full" data-testid="mobile-tab-select">
            <SelectValue>{activeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value} data-testid={tab["data-testid"] ? `mobile-${tab["data-testid"]}` : undefined}>
                <span className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden md:block">
        <TabsList className={tabsListClassName}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2"
              data-testid={tab["data-testid"]}
              onClick={tab.onClick}
            >
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}
