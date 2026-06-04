# Kabsonwater - Quick Deployment Checklist

## Before Deployment

- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Run `firebase login`
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Fill in Firebase credentials in `.env.local`

## Pre-Deploy Steps

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Verify build output exists
ls -la .next/standalone/public
```

## Initial Firebase Setup

```bash
# 4. Initialize Firebase (one time only)
firebase init

# When prompted:
# - Select "Hosting" and "Functions"
# - Use existing project: kabsonwater
# - Public directory: .next/standalone/public
# - Configure as SPA: Yes
```

## Deploy

```bash
# 5. Deploy hosting
firebase deploy --only hosting

# 6. View your live site
# https://kabsonwater.firebaseapp.com
```

## Post-Deployment

- [ ] Test all pages load (home, customer, accounting, suppliers)
- [ ] Test form submissions (create order, add transaction, add supplier)
- [ ] Verify Firestore has data collections
- [ ] Check Firebase Console → Hosting for deployment history
- [ ] Set up custom domain (optional)

## Ongoing Maintenance

```bash
# View deployment logs
firebase deploy:log

# View function logs
firebase functions:log

# Deploy specific service
firebase deploy --only hosting:kabsonwater

# Rollback to previous version
firebase hosting:rollback
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing API key" | Check `.env.local` has all NEXT_PUBLIC_ vars |
| Build fails | Run `npm run build` locally first to check errors |
| Forms don't save | Verify Firestore rules in Firebase Console |
| Page 404 errors | Check `firebase.json` rewrites config |

## Dashboard URLs

- Firebase Console: https://console.firebase.google.com
- Live Site: https://kabsonwater.firebaseapp.com
- Firestore: Firebase Console → Firestore Database
- Hosting Logs: Firebase Console → Hosting → Logs
- Functions Logs: Firebase Console → Functions → Logs

