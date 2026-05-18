# UI System

ChefPro uses **shadcn/ui** components built on **Radix UI** primitives and **Tailwind CSS v4**. This document is the canonical reference for agents building or modifying UI.

## Design Tokens

All colors use CSS custom properties defined in `src/app/globals.css`. The `@theme inline` block maps them to Tailwind utility classes.

### Color Palette

| Token                      | Value     | Usage                                  |
| -------------------------- | --------- | -------------------------------------- |
| `--primary`                | `#4f46e5` | Indigo — buttons, active nav, links    |
| `--primary-foreground`     | `#ffffff` | Text on primary backgrounds            |
| `--secondary`              | `#f5f5f4` | Secondary buttons, muted surfaces      |
| `--secondary-foreground`   | `#1c1917` | Text on secondary backgrounds          |
| `--destructive`            | `#dc2626` | Danger buttons, error states           |
| `--destructive-foreground` | `#ffffff` | Text on destructive backgrounds        |
| `--muted`                  | `#f5f5f4` | Skeleton loading, disabled backgrounds |
| `--muted-foreground`       | `#78716c` | Secondary text, placeholders           |
| `--accent`                 | `#f5f5f4` | Hover states, dropdown highlights      |
| `--border`                 | `#e5e5e5` | Card borders, dividers, input borders  |
| `--input`                  | `#e5e5e5` | Input field borders                    |
| `--ring`                   | `#4f46e5` | Focus ring color                       |
| `--background`             | `#ffffff` | Page background                        |
| `--foreground`             | `#0a0a0a` | Primary text                           |
| `--card`                   | `#ffffff` | Card backgrounds                       |

### Radius

`--radius: 0.625rem` (10px). Derived values:

- `--radius-sm`: 6px (small elements like badges)
- `--radius-md`: 8px (inputs, buttons)
- `--radius-lg`: 10px (cards, dialogs)
- `--radius-xl`: 14px (sheets, large containers)

### Typography

Font: **Geist** via `next/font/google`, set as `--font-geist-sans` CSS variable.

### Semantic Status Colors

Used via the `statusColor()` utility in `src/lib/utils.ts`:

| Status          | Classes                         |
| --------------- | ------------------------------- |
| draft           | `bg-gray-100 text-gray-700`     |
| submitted       | `bg-blue-100 text-blue-700`     |
| reviewed        | `bg-green-100 text-green-700`   |
| locked          | `bg-purple-100 text-purple-700` |
| compliant       | `bg-green-100 text-green-700`   |
| non_compliant   | `bg-red-100 text-red-700`       |
| not_checked     | `bg-yellow-100 text-yellow-700` |
| potential_issue | `bg-red-100 text-red-700`       |
| needs_review    | `bg-yellow-100 text-yellow-700` |
| failed          | `bg-red-100 text-red-700`       |
| processing      | `bg-blue-100 text-blue-700`     |

These are passed as `className` to the `<Badge>` component.

---

## Responsive Strategy

Mobile-first design. Breakpoints follow Tailwind defaults:

| Breakpoint | Min Width | Usage                             |
| ---------- | --------- | --------------------------------- |
| (default)  | 0px       | Mobile layout                     |
| `sm`       | 640px     | Desktop nav visibility starts     |
| `md`       | 768px     | Ops nav links shown, grid layouts |
| `lg`       | 1024px    | Wider content areas               |

### Portal Container Widths

| Portal                 | Container Class | Description                                     |
| ---------------------- | --------------- | ----------------------------------------------- |
| **Chef**               | `max-w-lg`      | 32rem — optimized for phone-width one-hand use  |
| **Ops**                | `max-w-6xl`     | 72rem — desktop dashboard with data tables      |
| **Menu Signage**       | `max-w-7xl`     | 80rem — wide layout for menu signage management |
| **Daily Counts**       | `max-w-6xl`     | Data-entry and history layouts                  |
| **Compliance Uploads** | `max-w-5xl`     | Staff upload workflow for evidence              |
| **Compliance Audits**  | `max-w-7xl`     | Manager review table and detail panel           |
| **AI Assistant**       | `max-w-6xl`     | Chat panel and session/report views             |

### Mobile Patterns

- **Chef portal**: Bottom tab navigation with icons, `pb-[env(safe-area-inset-bottom)]` for notch-safe spacing
- **App shell / sidebar**: Shared collapsible sidebar with grouped navigation and tooltips when collapsed
- **Ops portal**: Shared shell layout for management pages
- **Cards**: Full-width on mobile, no horizontal margin in the card itself (container handles padding)
- **Forms**: Stacked vertically, full-width inputs, submit button at bottom
- **Upload flows**: Use direct `fetch` with `FormData`, visible loading/disabled states, and toast feedback
- **AI chat**: Consume SSE streams, append text chunks incrementally, and show tool-call/agent state where exposed

---

## Component Catalog

All components live in `src/components/ui/`. They follow the shadcn/ui pattern: copy-paste files, Radix primitives underneath, Tailwind + CVA for styling.

### Primitives

| Component   | File              | Radix Primitive             | Key Props                                                                                         |
| ----------- | ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| Button      | `button.tsx`      | `@radix-ui/react-slot`      | `variant`: primary, secondary, danger, ghost, link, outline. `size`: sm, md, lg, icon. `asChild`  |
| Badge       | `badge.tsx`       | —                           | `variant`: default, secondary, destructive, outline. Accepts `className` for custom status colors |
| Input       | `input.tsx`       | —                           | `label`, `error` (shows error message below), standard input props                                |
| Select      | `select.tsx`      | —                           | `label`, `error`, `options[]`, `placeholder`, standard select props                               |
| Textarea    | `textarea.tsx`    | —                           | `label`, `error`, `rows` (default 3), standard textarea props                                     |
| Label       | `label.tsx`       | `@radix-ui/react-label`     | Standard label props                                                                              |
| Separator   | `separator.tsx`   | `@radix-ui/react-separator` | `orientation`: horizontal, vertical                                                               |
| Skeleton    | `skeleton.tsx`    | —                           | Just `className` — animated pulse placeholder                                                     |
| Star Rating | `star-rating.tsx` | — (custom)                  | `value`, `max`, `onChange`, `readonly`, `size`: sm, md, lg                                        |

### Containers

| Component | File          | Parts                                                                                                                                                    |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card      | `card.tsx`    | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                                                                        |
| Dialog    | `dialog.tsx`  | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`                            |
| Sheet     | `sheet.tsx`   | `Sheet`, `SheetTrigger`, `SheetContent` (`side`: top, bottom, left, right), `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose` |
| Tabs      | `tabs.tsx`    | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                                                         |
| Tooltip   | `tooltip.tsx` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`; used for collapsed sidebar and icon affordances                                        |

### Data Display

| Component | File        | Parts                                                                                                    |
| --------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| Table     | `table.tsx` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption` |

### Overlays & Feedback

| Component        | File                | Notes                                                                                                                                                                               |
| ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dropdown Menu    | `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem` |
| Toaster (Sonner) | `sonner.tsx`        | Global toast notifications. Import `toast` from `sonner` to trigger. Mounted in root `layout.tsx`                                                                                   |

### Icons

All icons come from **Lucide React** (`lucide-react`). Import individual icons:

```typescript
import { CalendarDays, Plus, Clock, Package, LogOut } from "lucide-react";
```

Use `className="size-4"` (or `size-5`) for sizing. Icons are already configured to shrink inside buttons via `[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`.

---

## Layout Patterns

### Page Shell

Every portal page follows this structure:

```tsx
// Layout (server component) handles auth + nav
// Page (client or server) handles content
<div className="space-y-6">
  <div>
    <h1 className="text-xl font-bold">Page Title</h1>
    <p className="text-sm text-muted-foreground">Subtitle or date</p>
  </div>
  {/* Content */}
</div>
```

### Card Grid

For dashboard-style layouts with multiple stat cards:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

### Form Layout

Stacked form fields with submit button at bottom:

```tsx
<form className="space-y-4">
  <Input label="Name" id="name" />
  <Select label="Location" id="location" options={[...]} />
  <Button type="submit">Save</Button>
</form>
```

### Operational Review Layout

Operational compliance review pages use a split scan/detail pattern:

- Filter controls at the top of the page.
- Summary cards for high-level counts.
- A table for audit rows with stable status badges.
- A detail panel for selected audit assets, AI-assisted summary, entries, and issues.
- Asset links must request signed URLs through the API instead of exposing bucket objects directly.

### AI Chat Layout

AI chat pages should treat streaming as a first-class state:

- Show the session once the `session` SSE event arrives.
- Append `text` chunks incrementally.
- Show selected agent/tool-call state without inventing data.
- Handle `error` events as recoverable UI errors.

### Data Table

For Ops data views:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Empty State

When no data is available:

```tsx
<Card className="text-center py-10">
  <p className="text-muted-foreground mb-4">No items found</p>
  <Button>Create New</Button>
</Card>
```

### Loading Skeleton

Replace spinner with skeleton placeholders:

```tsx
<div className="space-y-3">
  <Skeleton className="h-4 w-48" />
  <Skeleton className="h-20 w-full" />
  <Skeleton className="h-20 w-full" />
</div>
```

### Toast Feedback

For success/error messages after form submissions:

```tsx
import { toast } from "sonner";

toast.success("Tasting submitted");
toast.error("Failed to save");
```

---

## Conventions

### Utility Function

Always use `cn()` from `@/lib/utils` for conditional class merging. It combines `clsx` and `tailwind-merge`:

```tsx
import { cn } from "@/lib/utils";
<div className={cn("base-class", isActive && "active-class", className)} />;
```

### Component Creation Rules

1. **Check existing components first.** Don't create a new component if one exists in `src/components/ui/`.
2. **Shared UI primitives** go in `src/components/ui/`.
3. **Portal-specific components** go in `src/components/<portal>/` (e.g., `components/chef/`, `components/ops/`).
4. **Cross-portal shared components** go in `src/components/shared/`.
5. **Page-specific UI** stays in the page file unless it's reused.

### Naming

- Component files: `kebab-case.tsx` (e.g., `dropdown-menu.tsx`, `star-rating.tsx`)
- Component exports: `PascalCase` (e.g., `DropdownMenu`, `StarRating`)
- Use `data-slot` attributes on root elements for debugging/testing

### Color Usage

- Use semantic token classes (`text-primary`, `bg-card`, `border-border`) instead of raw Tailwind colors (`text-indigo-600`, `bg-white`) whenever possible
- Exception: status colors via `statusColor()` use raw Tailwind classes for specificity

### Access-Control Copy

- Write access labels in task language (for example, "View reports" or "Send sessions for review") instead of system language (for example, "manage permissions")
- Never show permission keys like `domain.action` in end-user UI
- Avoid internal terms such as RBAC, override, and subtype in user-facing copy; prefer plain labels like "Team access", "Team type", and "Custom access"
- Use a two-step explanation pattern for access screens: set team defaults first, then adjust one person only when needed
- Keep button text action-focused and specific (for example, "Save Team Default Access", "Save Person's Access")

### Adding New shadcn/ui Components

To add a new component from the shadcn/ui catalog:

1. Check [ui.shadcn.com](https://ui.shadcn.com) for the component code
2. Create the file in `src/components/ui/`
3. Install any required `@radix-ui/*` peer dependency
4. Update this document's Component Catalog section
