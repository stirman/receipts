# Receipts Sharing & Social Features Plan

## Overview
Make receipts shareable with social proof (agree/disagree) and resolution notifications.

---

## Phase 1: Database Schema Updates

### New Tables/Fields Needed:

```prisma
// Add to User model
model User {
  // ... existing fields
  agreements    Agreement[]
}

// New Agreement model
model Agreement {
  id        String   @id @default(cuid())
  takeId    String
  userId    String
  position  Position // AGREE or DISAGREE
  createdAt DateTime @default(now())
  
  take      Take     @relation(fields: [takeId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([takeId, userId]) // One position per user per take
}

enum Position {
  AGREE
  DISAGREE
}

// Update Take model
model Take {
  // ... existing fields
  agreements  Agreement[]
}

// Update TakeStatus enum
enum TakeStatus {
  PENDING
  TRUE      // Was VERIFIED
  FALSE     // Was WRONG
}
```

---

## Phase 2: API Endpoints

### 2.1 Agreement API
- `POST /api/take/[id]/agree` - Add agreement (requires auth)
- `POST /api/take/[id]/disagree` - Add disagreement (requires auth)
- `DELETE /api/take/[id]/agreement` - Remove user's agreement
- `GET /api/take/[id]/agreements` - Get agreement counts and user lists

### 2.2 Share API (already exists, enhance)
- Current: ShareButtons component with copy link
- Add: Download receipt as image (PNG export)
- Add: Direct share to X with pre-filled text + image

---

## Phase 3: UI Components

### 3.1 Global "Hot Take" Button
- Floating action button (FAB) in bottom-right corner
- Or: Persistent button in header
- **Decision: Add to Header component** (more visible, consistent)

### 3.2 Agree/Disagree Section (Take Page)
```
┌─────────────────────────────────────┐
│           [RECEIPT CARD]            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [👍 Agree (12)]   [👎 Disagree (3)]│
└─────────────────────────────────────┘

┌────────────────┬────────────────────┐
│    AGREE (12)  │   DISAGREE (3)     │
├────────────────┼────────────────────┤
│ @username1     │ @skeptic1          │
│ @username2     │ @doubter2          │
│ @username3     │ @noway3            │
│ ...            │                    │
└────────────────┴────────────────────┘
```

### 3.3 Resolution States
- `TRUE` badge: Green background (#166534 on #dcfce7)
- `FALSE` badge: Red background (#991b1b on #fee2e2)
- When resolved: Hide agree/disagree buttons, show final counts as "locked in"

### 3.4 Share Enhancements
- "Share" button that opens modal with:
  - Copy link
  - Download image
  - Share to X (opens twitter intent with image)
  - Share to Facebook
  - Share to Reddit

---

## Phase 4: Notifications

### Options Considered:
1. **Email** - Most reliable, needs email collection
2. **Push notifications** - Requires service worker setup
3. **In-app notifications** - Only works if user returns
4. **SMS** - Expensive, intrusive

### Decision: Email notifications (Phase 4b - defer for now)
- Requires: Email field on User model
- Clerk already has email, can access via webhook or API
- Send email when take resolves to:
  - Take creator
  - All users who agreed/disagreed

### MVP Approach (Phase 4a):
- Add notification preferences to user
- Show "resolution" indicator on homepage for resolved takes
- In-app notification banner when user logs in

---

## Phase 5: Implementation Order

### Sprint 1: Core Social Features
1. ✅ Update Prisma schema with Agreement model
2. ✅ Migrate database
3. ✅ Create agreement API endpoints
4. ✅ Add Agree/Disagree buttons to take page
5. ✅ Show agreement counts and user lists

### Sprint 2: Sharing Improvements  
1. ✅ Add "Hot Take" button to Header
2. ✅ Enhance ShareButtons with download image option
3. ✅ Add share modal with multiple platforms

### Sprint 3: Resolution Flow
1. ✅ Update status enum (VERIFIED→TRUE, WRONG→FALSE)
2. ✅ Update UI to show TRUE/FALSE badges
3. ✅ Lock agree/disagree when resolved
4. ✅ Show "You were right/wrong" indicator

### Sprint 4: Notifications (Future)
1. Email integration via Clerk
2. Resolution emails
3. Notification preferences

---

## Simplifications Made

1. **No profile photos** - Just usernames for agree/disagree lists
2. **No SMS/Push** - Start with in-app, add email later
3. **Single position** - Users can only agree OR disagree, not both
4. **No comments** - Just binary agree/disagree for now
5. **Defer email notifications** - Get core flow working first

---

## Technical Notes

### Image Download
- Use `html2canvas` or similar to capture receipt card
- Or: Use existing OG image endpoint, add download button

### Share Intents
- X: `https://twitter.com/intent/tweet?text=...&url=...`
- Facebook: `https://www.facebook.com/sharer/sharer.php?u=...`
- Reddit: `https://reddit.com/submit?url=...&title=...`

### Auth Flow for Agree/Disagree
- Clerk's `useAuth` hook checks if logged in
- If not, `redirectToSignIn()` then return to take page
- After auth, auto-submit their agree/disagree choice

---

## Files to Modify/Create

### Schema
- `prisma/schema.prisma` - Add Agreement model

### API Routes
- `src/app/api/take/[id]/agree/route.ts` - NEW
- `src/app/api/take/[id]/disagree/route.ts` - NEW
- `src/app/api/take/[id]/agreements/route.ts` - NEW

### Components
- `src/components/Header.tsx` - Add "Hot Take" button
- `src/components/ShareButtons.tsx` - Enhance with modal
- `src/components/AgreementButtons.tsx` - NEW
- `src/components/AgreementLists.tsx` - NEW

### Pages
- `src/app/take/[id]/page.tsx` - Add agreement UI
- `src/app/page.tsx` - Show resolution indicators

### Types
- `src/lib/types.ts` - Add Agreement types

---

## Let's Go! 🚀

Starting with Sprint 1: Core Social Features
