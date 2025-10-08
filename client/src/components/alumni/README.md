# Alumni Member Card Component

A sophisticated, feature-rich card component for displaying MIST Computer Club alumni information with social profile links, role badges, and various layout options.

## Features

- 🎨 **Three Variants**: Default, Compact, and Detailed layouts
- 🔗 **Social Links**: LinkedIn, GitHub, Codeforces profile integration
- 🏆 **Highlight Distinguished Members**: Special styling for presidents and notable alumni
- 🔍 **Search Highlighting**: Automatically highlights matching search terms
- 🌓 **Dark Mode Support**: Fully themed with alumni-specific color palette
- ✨ **Hover Effects**: Smooth glow animations and transitions
- 📱 **Responsive Design**: Adapts to mobile, tablet, and desktop screens

## Usage

### Basic Usage

```jsx
import AlumniMemberCard from '@/components/alumni/AlumniMemberCard'

const member = {
  name: 'John Doe',
  role: 'PRESIDENT',
  now: 'Senior Software Engineer at Google',
  image_url: '/path/to/image.jpg',
  linkedin_url: 'https://linkedin.com/in/johndoe',
  github_url: 'https://github.com/johndoe',
  cf_handle: 'johndoe_cf',
  highlight: true
}

function MyComponent() {
  return <AlumniMemberCard member={member} />
}
```

### Variants

#### Default Variant (Full Card)
```jsx
<AlumniMemberCard member={member} variant="default" />
```
Best for: Main alumni showcase pages, featured members

#### Compact Variant (Minimal)
```jsx
<AlumniMemberCard member={member} variant="compact" />
```
Best for: Dense grids, sidebar listings, quick reference

#### Detailed Variant (With Bio)
```jsx
<AlumniMemberCard member={member} variant="detailed" />
```
Best for: Individual profile pages, detailed alumni bios

### With Search Highlighting

```jsx
<AlumniMemberCard 
  member={member} 
  query="software" // Highlights "software" in name, role, position, bio
/>
```

### Grid Layout Example

```jsx
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {members.map(member => (
    <AlumniMemberCard 
      key={member.id} 
      member={member} 
      variant="default"
    />
  ))}
</div>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `member` | `object` | **required** | Alumni member data object |
| `member.name` | `string` | **required** | Full name of the alumni |
| `member.role` | `string` | optional | Role in MCC (e.g., "PRESIDENT", "VICE PRESIDENT") |
| `member.now` | `string` | optional | Current position/company |
| `member.bio` | `string` | optional | Short biography (shown in detailed variant) |
| `member.image_url` | `string` | optional | Profile image URL |
| `member.linkedin_url` | `string` | optional | LinkedIn profile URL |
| `member.github_url` | `string` | optional | GitHub profile URL |
| `member.cf_handle` | `string` | optional | Codeforces handle (auto-generates URL) |
| `member.highlight` | `boolean` | `false` | Whether to highlight this card with special styling |
| `query` | `string` | `''` | Search query for highlighting matched text |
| `variant` | `'default' \| 'compact' \| 'detailed'` | `'default'` | Card layout variant |
| `className` | `string` | optional | Additional CSS classes |

## Styling

The component uses custom CSS variables defined in `globals.css`:

### Alumni Color Palette (Light Mode)
```css
--alumni-gold: 45 92% 52%;           /* Primary accent color */
--alumni-gold-soft: 45 92% 90%;      /* Soft gold background */
--alumni-ink: 223 47% 11%;           /* Dark text */
--alumni-royal: 226 70% 40%;         /* Royal blue accent */
--alumni-royal-fade: 226 70% 18%;    /* Dark royal blue */
--alumni-parchment: 46 35% 96%;      /* Light background */
```

### Dark Mode Overrides
```css
--alumni-gold: 45 96% 58%;           /* Brighter gold for dark mode */
--alumni-gold-soft: 45 35% 22%;      /* Darker gold background */
--alumni-ink: 222 30% 96%;           /* Light text */
--alumni-royal: 226 70% 58%;         /* Brighter royal blue */
--alumni-royal-fade: 226 70% 20%;    /* Darker royal fade */
--alumni-parchment: 45 15% 12%;      /* Dark background */
```

## Server-Side Integration

### Fetching Alumni Data

The component expects data from the `/alumni/public` API endpoint:

```typescript
// server/src/controllers/alumniController.ts
export const getAlumniPublic = async (c: any) => {
  const [batches, members] = await Promise.all([
    sql`select id, year, label, motto, sort_order 
        from alumni_batch 
        where is_active = true 
        order by year desc, sort_order`,
    sql`select id, batch_id, full_name, role, current_position, 
               bio, image_url, linkedin_url, github_url, 
               highlight, sort_order 
        from alumni_member 
        where is_active = true 
        order by sort_order, full_name`
  ])
  // ... process and return data
}
```

### Database Schema

```sql
CREATE TABLE public.alumni_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES alumni_batch(id),
  full_name text NOT NULL,
  role text,                    -- e.g., "PRESIDENT", "VICE PRESIDENT"
  current_position text,        -- Current job title and company
  bio text,                     -- Short biography
  image_url text,               -- Profile picture URL
  linkedin_url text,            -- LinkedIn profile URL
  github_url text,              -- GitHub profile URL
  highlight boolean DEFAULT false,  -- Distinguished member flag
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

## Accessibility

- All links have proper `aria-label` attributes
- External links include `rel="noopener noreferrer"` for security
- Images have alt text with member names
- Keyboard navigation supported on all interactive elements

## Performance Considerations

- Images lazy-load by default
- Hover effects use CSS transforms (GPU-accelerated)
- Search highlighting uses React memoization
- Component is client-side only (`'use client'`) for interactivity

## Examples

See `AlumniCardExamples.jsx` for comprehensive usage examples including:
- Default, compact, and detailed variants
- Grid and list layouts
- Search highlighting
- Minimal member cards (no image/links)

## Dependencies

- `lucide-react` - Icons (Linkedin, Github, ExternalLink, etc.)
- `@/lib/utils` - `cn()` utility for className merging
- TailwindCSS - Styling framework
- Custom CSS variables from `globals.css`

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires CSS Grid and Flexbox support
- CSS custom properties (CSS variables)
- Backdrop blur effects (optional enhancement)
