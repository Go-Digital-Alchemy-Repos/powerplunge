# Navigation Menus

The CMS menus system allows admins to manage site navigation through a visual drag-and-drop interface.

---

## Data Model

Menus are stored in the `cms_v2_menus` table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | varchar (UUID) | Primary key, auto-generated |
| `name` | text | Display name (e.g., "Main Navigation") |
| `location` | text | Where the menu renders: `main`, `footer`, `utility` |
| `items` | jsonb | Recursive tree of menu items |
| `active` | boolean | Whether the menu is live |
| `createdAt` | timestamp | Row creation time |
| `updatedAt` | timestamp | Last modification time |

### Menu Item Shape

Items are stored as a JSON tree. Each item has:

```ts
interface MenuItem {
  id: string;           // Unique identifier
  type: "page" | "post" | "external" | "label";
  label: string;        // Display text
  href: string;         // Resolved URL
  url: string;          // Raw URL (for external links)
  pageId?: string;      // FK to CMS page
  pageSlug?: string;    // Slug for page links
  postId?: string;      // FK to blog post
  postSlug?: string;    // Slug for post links
  target: "_self" | "_blank";
  order: number;        // Sort order within level
  children: MenuItem[]; // Nested items (max depth 3)
}
```

### Item Types

| Type | Description | Link Resolution |
|------|-------------|-----------------|
| `page` | Links to a CMS page | `/page/:pageSlug` |
| `post` | Links to a blog post | `/blog/:postSlug` |
| `external` | Custom URL (internal or external) | Uses `url` directly |
| `label` | Non-clickable group header | No link, acts as dropdown parent |

---

## Locations

| Location | Purpose |
|----------|---------|
| `main` | Primary site navigation (header) |
| `footer` | Footer navigation links |
| `utility` | Secondary nav (e.g., legal links, account menu) |

Only one active menu per location is rendered.

---

## Admin API

All admin endpoints require authentication.

### CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/cms/menus` | List all menus |
| `POST` | `/api/admin/cms/menus` | Create a new menu |
| `GET` | `/api/admin/cms/menus/:id` | Get menu by ID |
| `PUT` | `/api/admin/cms/menus/:id` | Update menu by ID |
| `DELETE` | `/api/admin/cms/menus/:id` | Delete menu by ID |

### By-Location Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/cms/menus/by-location/:location` | Get menu for a specific location |
| `PUT` | `/api/admin/cms/menus/by-location/:location` | Upsert menu for a location |

### Create/Update Request Body

```json
{
  "name": "Main Navigation",
  "location": "main",
  "active": true,
  "items": [
    {
      "id": "item-1",
      "type": "page",
      "label": "About Us",
      "href": "/page/about",
      "url": "",
      "pageId": "abc-123",
      "pageSlug": "about",
      "target": "_self",
      "order": 0,
      "children": []
    },
    {
      "id": "item-2",
      "type": "external",
      "label": "Shop",
      "href": "/shop",
      "url": "/shop",
      "target": "_self",
      "order": 1,
      "children": []
    }
  ]
}
```

---

## Public API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/menus/:location` | Get active menu for a location |

**Response:** Menu object or `null` if no active menu exists.

**When CMS disabled:** Returns `null`.

---

## Admin UI

The menus manager is at `/admin/cms/menus`.

### Layout

Split-view interface:
- **Left panel:** List of all menus with name, location, and active status
- **Right panel:** Menu editor (appears when a menu is selected or created)

### Drag-and-Drop Reordering

- Uses `@dnd-kit/core` and `@dnd-kit/sortable` for smooth reordering
- Items can be dragged to reorder within their level
- Visual indentation shows nesting hierarchy
- Maximum nesting depth: 3 levels

### Adding Items

1. Click **Add Item** button.
2. Select item type: Page, Post, External, or Label.
3. For Page/Post: Search existing pages/posts, select one (auto-fills label).
4. For External: Enter label and URL manually.
5. For Label: Enter label text (non-clickable group header).
6. Click **Add** to insert the item.

### Editing Items

- Click the edit icon on any item to open the edit dialog.
- Modify label, URL, target, or type.
- Changes are reflected immediately in the tree.

### Managing Children

- Items can have nested children (up to 3 levels deep).
- Expand/collapse child items with the chevron toggle.
- Add children via the Add Item modal.

---

## Frontend Rendering

### DynamicNav Component

`client/src/components/DynamicNav.tsx` renders menus on the storefront.

```tsx
<DynamicNav location="main" />
```

**Behavior:**
1. Fetches `GET /api/menus/main` via React Query.
2. If no menu exists, renders nothing (graceful fallback).
3. Top-level items render as direct links.
4. Items with children render as dropdown menus.
5. Supports all item types (page, post, external, label).

### Integration

DynamicNav is integrated into `home.tsx` alongside the logo. When no menu is configured, existing hardcoded navigation remains unaffected.

### Data Test IDs

| Element | data-testid |
|---------|-------------|
| Nav container | `dynamic-nav-main` |
| Individual links | `nav-link-{itemId}` |

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | `cmsMenus` table, `menuItemSchema` Zod schema |
| `server/src/routes/admin/cms-menus.routes.ts` | Admin API routes |
| `server/src/services/cms-menus.service.ts` | Service layer |
| `server/src/repositories/cms-menus.repository.ts` | Database queries |
| `server/src/routes/public/blog.routes.ts` | Public menu endpoint (`publicMenuRoutes`) |
| `client/src/pages/admin-cms-menus.tsx` | Admin UI |
| `client/src/components/DynamicNav.tsx` | Frontend rendering component |
