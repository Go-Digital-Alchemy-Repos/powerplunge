import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";

interface NavMenuItem {
  id: string;
  type: "page" | "post" | "external" | "label";
  label: string;
  href?: string;
  url?: string;
  pageSlug?: string;
  postSlug?: string;
  target?: "_self" | "_blank";
  children?: NavMenuItem[];
}

interface MenuData {
  id: string;
  name: string;
  location: string;
  items: NavMenuItem[];
  active: boolean;
}

const SLUG_TO_ROUTE: Record<string, string> = {
  "home": "/",
  "shop": "/shop",
  "blog": "/blog",
  "my-account": "/my-account",
  "track-order": "/track-order",
  "checkout": "/checkout",
  "login": "/login",
  "register": "/register",
  "become-affiliate": "/become-affiliate",
  "affiliate-portal": "/affiliate-portal",
};

function resolveHref(item: NavMenuItem): string {
  if (item.type === "external") return item.href || item.url || "#";
  if (item.type === "post" && item.postSlug) return `/blog/${item.postSlug}`;
  if (item.type === "page" && item.pageSlug) {
    if (SLUG_TO_ROUTE[item.pageSlug]) return SLUG_TO_ROUTE[item.pageSlug];
    return `/page/${item.pageSlug}`;
  }
  return item.href || item.url || "#";
}

function NavLink({ item }: { item: NavMenuItem }) {
  const [, navigate] = useLocation();
  const href = resolveHref(item);
  const isExternal = item.type === "external" || item.target === "_blank";

  if (item.type === "label") {
    return (
      <span className="text-sm text-muted-foreground cursor-default px-3 py-2 font-medium" data-testid={`nav-label-${item.id}`}>
        {item.label}
      </span>
    );
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target={item.target || "_blank"}
        rel="noopener noreferrer"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
        data-testid={`nav-link-${item.id}`}
      >
        {item.label}
      </a>
    );
  }

  return (
    <button
      onClick={() => navigate(href)}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
      data-testid={`nav-link-${item.id}`}
    >
      {item.label}
    </button>
  );
}

function NavDropdown({ item }: { item: NavMenuItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 flex items-center gap-1"
        data-testid={`nav-dropdown-${item.id}`}
      >
        {item.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-lg min-w-[180px] z-50" data-testid={`nav-dropdown-menu-${item.id}`}>
          {(item.children || []).map((child) => {
            const href = resolveHref(child);
            const isExternal = child.type === "external" || child.target === "_blank";

            if (child.type === "label") {
              return (
                <div key={child.id} className="px-3 py-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {child.label}
                </div>
              );
            }

            if (isExternal) {
              return (
                <a
                  key={child.id}
                  href={href}
                  target={child.target || "_blank"}
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                  onClick={() => setOpen(false)}
                  data-testid={`nav-child-link-${child.id}`}
                >
                  {child.label}
                </a>
              );
            }

            return (
              <button
                key={child.id}
                onClick={() => { navigate(href); setOpen(false); }}
                className="block w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                data-testid={`nav-child-link-${child.id}`}
              >
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DynamicNav({ location = "main" }: { location?: string }) {
  const { data: menu } = useQuery<MenuData | null>({
    queryKey: ["/api/menus", location],
    queryFn: async () => {
      const res = await fetch(`/api/menus/${location}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    },
    staleTime: 60000,
  });

  if (!menu || !menu.items?.length) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1" data-testid={`dynamic-nav-${location}`}>
      {menu.items.map((item) => {
        if ((item.children?.length ?? 0) > 0) {
          return <NavDropdown key={item.id} item={item} />;
        }
        return <NavLink key={item.id} item={item} />;
      })}
    </nav>
  );
}
