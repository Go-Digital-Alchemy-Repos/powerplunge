# Reusable Sections

Sections are reusable groups of blocks that can be shared across multiple pages. They promote content consistency and reduce duplication.

## Schema

```sql
saved_sections (
  id          VARCHAR  PRIMARY KEY  DEFAULT gen_random_uuid()
  name        TEXT     NOT NULL
  description TEXT
  category    TEXT     DEFAULT 'general'   -- general, hero, content, product, testimonial, cta
  blocks      JSONB    NOT NULL            -- Array of block objects
  thumbnail   TEXT                         -- Optional preview image
  created_at  TIMESTAMP DEFAULT NOW()
  updated_at  TIMESTAMP DEFAULT NOW()
  created_by  VARCHAR                      -- Admin user ID
)
```

## Categories

Sections are organized into categories for easier discovery:

| Category | Purpose |
|----------|---------|
| `general` | Generic multi-purpose sections |
| `hero` | Hero/banner sections |
| `content` | Text-heavy content sections |
| `product` | Product showcases and grids |
| `testimonial` | Customer testimonials and reviews |
| `cta` | Call-to-action sections |

## Block Storage

A section's `blocks` field stores an array of block objects in the same format as page `contentJson.blocks`:

```json
[
  {
    "id": "uuid",
    "type": "hero",
    "data": { "title": "Welcome", "subtitle": "..." },
    "settings": {}
  },
  {
    "id": "uuid",
    "type": "richText",
    "data": { "content": "<p>Description</p>" },
    "settings": {}
  }
]
```

## Using Sections in Pages

### Inserting a Section

In the page builder, click **Insert Section** in the header. A dialog displays all saved sections. Selecting one inserts a `sectionRef` block:

```json
{
  "id": "uuid",
  "type": "sectionRef",
  "data": { "sectionId": "section-uuid", "sectionName": "Hero Banner" },
  "settings": {}
}
```

### Rendering

When the `PageRenderer` encounters a `sectionRef` block, it fetches the referenced section from the public endpoint `GET /api/sections/:id` and renders its blocks inline. If the section is not found, a "Section not found" placeholder is displayed.

### Detaching

The "Detach Sections" button in the page builder converts all `sectionRef` blocks into their constituent inline blocks. This:

- Breaks the link to the saved section
- Copies the section's blocks directly into the page
- Allows per-page editing of the formerly shared content
- Is irreversible (the section reference is removed)

## Admin UI

### Sections Management

Accessible at `/admin/cms-v2/sections`. Provides:

- List of all saved sections with name, category, and block count
- Create new sections
- Edit existing sections (name, description, category, blocks)
- Delete sections (does not affect pages that have already detached the section)

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/cms-v2/sections` | List all sections |
| GET | `/api/admin/cms-v2/sections/:id` | Get section by ID |
| POST | `/api/admin/cms-v2/sections` | Create section |
| PUT | `/api/admin/cms-v2/sections/:id` | Update section |
| DELETE | `/api/admin/cms-v2/sections/:id` | Delete section |

All endpoints require admin authentication and full access.
