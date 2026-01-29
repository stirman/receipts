# App Clips — Setup & Strategy

## What Are App Clips?

App Clips are lightweight versions of your iOS app (< 15MB) that users can launch instantly without downloading the full app from the App Store.

**Entry Points:**
- Links in Safari, Messages, Mail
- QR codes
- NFC tags
- App Clip Codes (Apple's branded QR)
- Location-based suggestions (Maps, Siri)

---

## The Partiful Model

Partiful nailed App Clips for viral growth:

1. **Host creates event** → Gets shareable link
2. **Guest taps link** → App Clip loads instantly (< 2 sec)
3. **Guest RSVPs** → Core action complete, no friction
4. **Prompt to download** → "Get the full app for more features"

**Key Insight:** The *content* (event/receipt) spreads the app, not marketing.

---

## Receipts App Clip Strategy

### User Flow

```
1. User A creates a take on receipts.app
   ↓
2. User A shares link: receipts.app/t/abc123
   ↓
3. User B (iOS) taps link
   ↓
4. App Clip launches instantly
   - Shows the take card
   - "Challenge this take" button
   - "Share" button
   ↓
5. User B challenges or shares
   ↓
6. Prompt: "Download Receipts for full features"
```

### App Clip Features (MVP)
- View any take
- Challenge a take (create counter-take)
- Share a take
- Sign in with Apple (optional)

### Full App Features
- Create takes from scratch
- View profile & history
- Leaderboards
- Notifications
- Settings

---

## Technical Requirements

### 1. Apple Developer Account
✅ Stirman already has this (Team ID: KWD3L4D838)

### 2. Xcode Project Setup

```
Receipts/
├── Receipts.xcodeproj
├── Receipts/              ← Full app target
│   ├── ReceiptsApp.swift
│   ├── ContentView.swift
│   └── ...
├── ReceiptsClip/          ← App Clip target
│   ├── ReceiptsClipApp.swift
│   ├── TakeView.swift     ← Shared with main app
│   └── ...
└── Shared/                ← Shared code
    ├── Models/
    ├── Services/
    └── Components/
```

### 3. Add App Clip Target in Xcode

1. File → New → Target
2. Select "App Clip"
3. Name: "ReceiptsClip"
4. Bundle ID: `com.stirman.receipts.Clip`

### 4. Associated Domains

In both targets' Signing & Capabilities:

```
Associated Domains:
  appclips:receipts.app
  applinks:receipts.app
```

### 5. Apple App Site Association (AASA)

Host at `https://receipts.app/.well-known/apple-app-site-association`:

```json
{
  "appclips": {
    "apps": ["KWD3L4D838.com.stirman.receipts.Clip"]
  },
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": [
          "KWD3L4D838.com.stirman.receipts",
          "KWD3L4D838.com.stirman.receipts.Clip"
        ],
        "components": [
          {
            "/": "/t/*",
            "comment": "Take pages"
          }
        ]
      }
    ]
  }
}
```

### 6. App Clip Experience in App Store Connect

1. Go to App Store Connect → Your App → App Clip
2. Add "App Clip Experience"
3. Set the URL: `https://receipts.app/t/`
4. Upload App Clip Card image (1800x1200px)
5. Set action button: "Open" or "View"

### 7. Smart App Banner (Web Fallback)

For non-iOS or when App Clip fails, add to web pages:

```html
<meta name="apple-itunes-app" content="app-id=YOUR_APP_ID, app-clip-bundle-id=com.stirman.receipts.Clip, app-clip-display=card">
```

---

## Size Constraints

App Clips must be **< 15MB** (was 10MB, increased in iOS 16).

**Strategies to stay small:**
- Share code with main app (Shared/ folder)
- Lazy load images
- Minimal dependencies
- No heavy frameworks
- Use SF Symbols instead of custom icons

---

## Testing App Clips

### Local Testing
1. In Xcode, select the App Clip scheme
2. Edit scheme → Run → Arguments
3. Add `_XCAppClipURL` environment variable:
   ```
   _XCAppClipURL = https://receipts.app/t/test123
   ```
4. Run on device

### TestFlight
App Clips can be tested via TestFlight alongside the main app.

### App Clip Codes (QR)
Generate via App Store Connect for testing physical codes.

---

## URL Scheme

**Take URLs:**
```
https://receipts.app/t/{take_id}
```

**Challenge URLs:**
```
https://receipts.app/t/{take_id}/challenge
```

**Profile URLs:**
```
https://receipts.app/u/{username}
```

**Versus URLs:**
```
https://receipts.app/vs/{versus_id}
```

---

## Implementation Checklist

- [ ] Create Xcode project with App Clip target
- [ ] Configure Associated Domains
- [ ] Set up AASA file on server
- [ ] Build TakeView (shared component)
- [ ] Implement deep link handling
- [ ] Configure App Store Connect experience
- [ ] Test on physical device
- [ ] Submit to TestFlight
- [ ] Add Smart App Banner to web

---

## What You (Stirman) Need To Do

1. **Nothing right now!** I'll set up the Xcode project
2. **Later:** Approve the App ID and Clip ID in Developer Portal
3. **Later:** Configure App Store Connect App Clip Experience

The web app can work immediately. App Clip adds native iOS feel but isn't required for MVP.

---

## Timeline

| Task | Time |
|------|------|
| Web MVP (receipts work without app) | Week 1-2 |
| iOS App Clip | Week 3-4 |
| Full iOS App | Week 5-6 |

**Recommendation:** Ship the web version first. App Clip is a growth accelerator, not a blocker.
