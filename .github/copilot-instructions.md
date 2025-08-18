# MCC Website Copilot Instructions

## Project Overview
This is a **competitive programming club management platform** with a **Next.js client** and **Hono/Bun server**. The system manages contests, performance tracking, course materials, and VJudge integration for the MIST Computer Club.

## Architecture & Key Components

### Dual Server Setup
- **Client**: Next.js 15 with App Router (`client/`)
- **Server**: Hono framework with Bun runtime (`server/`)
- **Database**: PostgreSQL via `postgres` library
- **Authentication**: JWT tokens with cookie-based sessions

### VJudge Integration (Core Feature)
The platform heavily integrates with VJudge for contest management:
- **Session Management**: VJudge JSESSIONID stored in cookies (`vj_session`)
- **Contest Tracking**: Real-time submission monitoring via VJudge API
- **Performance Analytics**: Daily submission tracking, acceptance rates
- **Contest Rooms**: Managed groups for contest participation tracking

### Server Structure (`server/src/`)
```
controllers/   # Business logic (landingController, authController, etc.)
routes/        # Route definitions with middleware
db.ts         # PostgreSQL connection singleton
vjudge.ts     # VJudge API integration utilities
```

### Client Structure (`client/src/`)
```
app/          # Next.js 15 App Router pages
components/   # Reusable UI components (shadcn/ui based)
lib/          # Utilities (action.js for server actions, vjudge.js)
actions/      # Server actions for data fetching
```

## Development Workflows

### Environment Setup
```bash
# Server (requires DATABASE_URL, SECRET, etc.)
cd server && bun install && bun run --hot src/index.ts

# Client (requires NEXT_PUBLIC_SERVER_URL, Supabase vars)
cd client && bun install && bun --bun run dev
```

### Database Connection
- Server connects via `server/src/db.ts` using `DATABASE_URL`
- Uses `sql` tagged template literals for queries
- Example: `await sql\`select * from users where id = ${id}\``

## Project-Specific Patterns

### Authentication Flow
1. **Login**: `auth/login` endpoint validates credentials, returns JWT
2. **Middleware**: Routes use `jwt()` middleware from hono/jwt
3. **Client**: JWT stored in `token` cookie, accessed via `c.get('jwtPayload')`
4. **Admin Check**: `requireAdmin()` function validates admin status from JWT payload

### VJudge Integration Pattern
```javascript
// Always check for VJudge session before API calls
const vjSession = cookies().get('vj_session')?.value;
if (!vjSession) {
    // Handle re-authentication via revalidateVJudgeSession()
}
```

### Data Fetching Convention
- **Server Actions**: Located in `lib/action.js` and `actions/`
- **Naming**: `get_with_token()`, `post_with_token()` for authenticated requests
- **Error Handling**: Always check for `response.error` field
- **Caching**: Uses React `cache()` for server-side data fetching

### UI Component Patterns
- **Base**: shadcn/ui components in `components/ui/`
- **Styling**: Tailwind CSS with custom color variables
- **Forms**: React `useActionState` with server actions
- **Modals**: Radix Dialog primitives with custom styling

### Landing Page CMS
Dynamic content management via database tables:
- `landing_features`, `landing_stats`, `landing_timeline`
- Admin interface at `/admin/(landing)` with CRUD operations
- Public endpoint `/landing/public` serves aggregated data

### Contest Management
- **Contest Rooms**: Groups for managing contest participants
- **Performance Tracking**: VJudge submission analytics per user/batch
- **Demerit System**: Point-based penalty tracking for contests
- **Real-time Data**: Live contest standings and submission monitoring

## Integration Points

### Supabase Integration
- File uploads for user ID cards, profile pictures
- Storage buckets: `mist_id_cards`, `profile_pictures`
- Client configured with public/anon keys

### VJudge API Specifics
- **Authentication**: JSESSIONID-based session management
- **Rate Limiting**: Batch requests with 20-item pagination
- **Data Processing**: Client-side submission aggregation and statistics
- **Error Handling**: Automatic session revalidation on 401 responses

### Course Management
- **Batch System**: Students organized by academic batches
- **Course Materials**: Problems with hints, links, tracking
- **Schedule Management**: Time-based content delivery
- **Progress Tracking**: Individual student progress per course

## Critical Developer Notes

### VJudge Session Management
Always handle VJudge session expiration gracefully. Use `revalidateVJudgeSession()` for automatic re-authentication.

### Database Schema
Key tables: `users`, `batches`, `courses`, `contest_room`, `landing_*` tables. Foreign key relationships are established but not enforced by constraints in some cases.

### Performance Considerations
- VJudge API calls are expensive; implement proper caching
- Batch statistics fetching should be done server-side
- Use React Suspense for data-dependent UI components

### Security Patterns
- Admin routes protected by JWT middleware + `requireAdmin()` checks
- File uploads go through Supabase with proper bucket policies
- VJudge credentials stored securely in HTTP-only cookies
