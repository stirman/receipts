# Sharing Strategy — The Viral Engine

> Every take shared = potential new user

## Core Principle

**One tap to share, everywhere.**

The receipt card IS the marketing. When someone sees a take in their feed, they should:
1. Immediately understand what it is
2. Want to engage (agree/disagree)
3. Click through to challenge or make their own

---

## Share Destinations

### Primary (One-Tap Buttons)
| Platform | Why | Format |
|----------|-----|--------|
| **iMessage** | #1 way friends share | Rich link preview + App Clip |
| **X/Twitter** | Sports discourse HQ | Tweet with card image |
| **Instagram Stories** | Visual, high engagement | Story sticker/image |
| **Copy Link** | Universal fallback | Clean URL |

### Secondary (Share Sheet)
- Reddit
- Discord
- WhatsApp
- Snapchat
- Facebook
- Email

---

## Share Flow

```
User creates take
     ↓
Take confirmed & locked
     ↓
"Share your receipt" screen appears
     ↓
[iMessage] [Twitter] [Instagram] [Copy Link] [...More]
     ↓
One tap → Pre-formatted share
     ↓
Friend sees it → Clicks → App Clip / Web
     ↓
Friend creates counter-take or their own take
     ↓
Repeat ♻️
```

---

## Platform-Specific Formatting

### iMessage
- **Rich link preview** (via Open Graph)
- **App Clip** launches on tap (iOS)
- **Fallback** to web for Android/desktop

### X/Twitter
Pre-composed tweet:
```
🧾 My take: "Rockets will make the playoffs this season"

Locked in. Receipts don't lie.

receipts.app/t/abc123
```

With Twitter Card showing the receipt image.

### Instagram Stories
- Generate story-sized image (1080x1920)
- Include "Link" sticker to receipts.app/t/abc123
- Swipe-up or tap to open

### Reddit
Pre-formatted for sports subreddits:
```
**My locked-in take:** Rockets will make the playoffs this season

🧾 [View Receipt](https://receipts.app/t/abc123)

Made with Receipts — hot takes with proof
```

---

## Open Graph / Meta Tags

Every take page needs perfect previews:

```html
<!-- Primary -->
<meta property="og:title" content="@stirman's Take: Rockets make playoffs">
<meta property="og:description" content="Locked Jan 29, 2026 • Resolves Apr 13, 2026">
<meta property="og:image" content="https://receipts.app/og/abc123.png">
<meta property="og:url" content="https://receipts.app/t/abc123">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="@stirman's Take: Rockets make playoffs">
<meta name="twitter:description" content="🧾 Locked in. Resolves Apr 13, 2026.">
<meta name="twitter:image" content="https://receipts.app/og/abc123.png">

<!-- App Clip -->
<meta name="apple-itunes-app" content="app-clip-bundle-id=com.stirman.receipts.Clip">
```

---

## Dynamic OG Images

Generate unique images for each take:

**Tech:** Vercel OG (or Cloudflare Workers + Satori)

**URL Pattern:**
```
https://receipts.app/og/[take_id].png
```

**Image includes:**
- Receipt card design (chosen style)
- Take text
- Username
- Lock date
- Status (pending/verified/wrong)

This makes EVERY share look custom and engaging.

---

## Share Incentives

### Gamification
- "Share streak" — Share X takes in a row
- "Viral take" badge — Take gets 100+ views
- "Debate starter" — Take gets 10+ challenges

### Social Proof
Show on take cards:
- 👀 1.2K views
- 🔥 47 challenges
- 📤 89 shares

---

## Challenge = Share

When someone challenges a take:
1. Their counter-take is created
2. **Automatic share prompt:** "Share this showdown?"
3. Versus card generated with both takes
4. Viral loop: Friends pick sides

---

## Share Button UX

### On Take Card (Post-Creation)
```
┌─────────────────────────────┐
│  🧾 Your take is locked!    │
│                             │
│  [Share to iMessage]        │  ← Primary CTA
│  [Share to Twitter]         │
│  [More options...]          │
│                             │
│  "Sharing gets you clout    │
│   when you're proven right" │
└─────────────────────────────┘
```

### On Any Take Card (View Mode)
Small share icon in corner → Expands to share sheet

### After Resolution
```
┌─────────────────────────────┐
│  ✅ YOU WERE RIGHT!         │
│                             │
│  Time to collect your       │
│  bragging rights.           │
│                             │
│  [Share "I told you so"]    │  ← Big CTA
│  [View full receipt]        │
└─────────────────────────────┘
```

---

## Tracking & Analytics

Track per share:
- Platform
- Clicks
- Conversions (new takes created)
- Challenges generated

This tells us which platforms drive growth.

---

## Implementation Priority

1. **Copy Link** — MVP, works everywhere
2. **Twitter/X** — Sports audience lives here
3. **iMessage** — Highest conversion (friends trust friends)
4. **Instagram Stories** — Visual + younger demo
5. **Reddit** — Niche sports communities

---

## Key Insight

> "The share is the product."

The receipt card traveling across the internet IS the marketing. Every pixel of that card should make people want to:
1. Click it
2. React to it
3. Make their own

No paid marketing needed if the shares are compelling enough.
