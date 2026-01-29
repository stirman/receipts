# Receipts 🧾 — Hot Takes With Proof

> "The 'I told you so' moment, formalized."

## Vision

A platform where sports fans lock in their predictions publicly. When they're right, they have receipts. When they're wrong, they eat crow. AI helps craft verifiable takes, the system auto-resolves them, and shareable cards spread virally.

---

## Phase 1: MVP (4-6 weeks)

### Core Features

1. **Take Submission**
   - Natural language input
   - AI verification/refinement
   - Timestamp + hash lock
   - Resolution date assignment

2. **Shareable Receipt Cards**
   - Beautiful, bold designs
   - Open Graph optimized
   - Works in iMessage, Twitter, Instagram
   - QR code for App Clip

3. **Auto-Resolution**
   - NBA data integration
   - Automatic outcome checking
   - User notifications
   - Card status update (✅ VERIFIED / ❌ WRONG)

4. **Basic Social**
   - Public profiles
   - Take history
   - Win/loss record
   - Challenge/counter-take

### Tech Stack

- **Frontend**: React/Next.js (web-first PWA)
- **Backend**: Node.js or Python FastAPI
- **Database**: PostgreSQL (takes, users, resolutions)
- **AI**: Claude API for take verification
- **Data**: NBA API + Basketball Reference
- **Hosting**: Vercel (web) + potential iOS App Clip
- **Auth**: Magic link / Apple Sign In

---

## Phase 2: Growth (weeks 6-12)

- Leaderboards (accuracy, streaks, boldest takes)
- Follow users with good track records
- Notifications for followed users' new takes
- Embed widget for blogs/Twitter
- Full iOS app (builds on App Clip)

---

## Phase 3: Expansion

- Additional sports (NFL, MLB, etc.)
- Non-sports verticals (politics, stocks, entertainment)
- Stakes/pledges (charity donations, bragging points)
- API for media partners

---

## Key Technical Decisions

### Take Verification AI

The AI needs to:
1. Parse natural language
2. Determine if take is verifiable
3. Extract structured data (team, stat, threshold, timeframe)
4. Suggest refinements if vague/subjective
5. Assign resolution date and data source

**Example Input/Output:**
```
Input: "Rockets making playoffs this year"
Output: {
  "verifiable": true,
  "structured": {
    "subject": "Houston Rockets",
    "outcome": "make_playoffs",
    "season": "2025-26",
    "league": "NBA"
  },
  "resolution_date": "2026-04-13",
  "data_source": "nba_standings",
  "display_text": "Houston Rockets will make the 2025-26 NBA Playoffs"
}
```

### NBA Data Sources

| Data Need | Source | API/Method |
|-----------|--------|------------|
| Standings | NBA.com API | `stats.nba.com/stats/leaguestandings` |
| Player stats | Basketball Reference | Scrape or Stathead API |
| Game results | NBA.com API | `stats.nba.com/stats/scoreboard` |
| Season schedule | NBA.com API | Schedule endpoints |
| Historical data | Basketball Reference | For comparisons |

### Immutability

- Each take gets a SHA-256 hash of: user_id + take_text + timestamp
- Hash stored with the take
- Displayed on receipt card (truncated)
- Proves the take wasn't modified

---

## Receipt Card Design Principles

1. **Bold** — Should stand out in a feed
2. **Branded** — Consistent "Receipts" identity
3. **Informative** — Take, user, date, status all visible
4. **Shareable** — Looks good on any platform
5. **Trustworthy** — Hash/lock icon shows authenticity

### Card Variants to Design

1. **Pending** — Take locked, awaiting resolution
2. **Verified** — Take proven correct ✅
3. **Wrong** — Take proven incorrect ❌
4. **Challenge** — Two opposing takes
5. **Profile Card** — User's record summary

---

## App Clip Strategy

### What Are App Clips?
Small parts of an iOS app (<15MB) that load instantly from:
- QR codes
- NFC tags
- Safari Smart App Banners
- Messages links
- Maps

### Partiful's Model
- Share an event link → recipient taps → App Clip loads instantly
- No App Store download required
- Core action (RSVP) works immediately
- Prompts for full app download for more features

### Receipts App Clip Flow
1. User shares receipt link
2. Recipient taps link on iOS
3. App Clip loads instantly (< 2 seconds)
4. Can view the take + challenge it
5. Prompt: "Download Receipts for full features"

### Requirements
- Apple Developer account (Stirman has ✅)
- App Clip target in Xcode
- Associated Domains setup
- App Clip Code (optional QR-style codes)
- Smart App Banner meta tags

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| NBA blocks API access | Multiple data sources, scraping fallback |
| Takes are too vague | Strong AI refinement UX |
| Users game the system | Anti-conflict rules, time locks |
| Low initial engagement | Seed with notable accounts, media partnerships |
| Legal issues with betting | Start with zero stakes, add charity pledges later |

---

## Success Metrics

**Launch (Week 1)**
- 1,000 takes submitted
- 100 DAU

**Month 1**
- 10,000 takes
- 1,000 MAU
- 50% take share rate

**Month 3**
- 50,000 takes
- 5,000 MAU
- First viral moment (high-profile correct/wrong take)

---

## Immediate Next Steps

1. ✅ Create project plan (this document)
2. 🎨 Design 5 receipt card mockups
3. 🏀 Document NBA data sources & verification logic
4. 📱 Document App Clip setup process
5. 🏗️ Scaffold Next.js project
6. 🤖 Build AI take verification prototype
7. 🎨 Build receipt card component
8. 🚀 Deploy MVP to Vercel

---

## Open Questions

- [ ] Final name (Receipts works, check App Store)
- [ ] Domain (receipts.app? getreceipts.com? receipts.live?)
- [ ] Monetization timeline (free forever? Pro tier?)
- [ ] First users (invite-only launch? Open?)
