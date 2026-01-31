# Receipts

Web app for tracking hot takes and seeing who was right.

## Quick Reference
| Field | Value |
|-------|-------|
| **Location** | `/Users/rosie/clawd/stirman/receipts` |
| **GitHub** | stirman/receipts |
| **Type** | Web App (Next.js) |
| **Live URL** | TBD (Vercel) |
| **Hosting** | Vercel |

## Deploy Process
```bash
cd ~/clawd/stirman/receipts/app

# Vercel auto-deploys on push to main
git add -A && git commit -m "Deploy" && git push
```

Or manual:
```bash
cd ~/clawd/stirman/receipts/app
npx vercel --prod
```

## Key Files
- `app/` — Next.js app directory
- `app/src/app/admin/page.tsx` — Admin dashboard (reference for Daily Divine's admin)
- `app/src/app/api/admin/stats/route.ts` — Stats API
- `.env.local` — Environment variables (gitignored)

## Environment / Secrets
- **OpenAI**: In `.env.local`
- **Clerk**: Auth provider
- **Vercel Postgres**: Database
- **ESPN API**: Free, no key needed

## Architecture Notes
- Next.js 14 with App Router
- Clerk for auth
- Vercel Postgres + Prisma
- OpenAI for verification/resolution
- Admin restricted by username (stirman)

## Recent Changes
- Check git log

## Known Issues
- None

## TODO / Next Steps
- [ ] Check PLAN.md and PROGRESS.md for roadmap
