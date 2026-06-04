# Kabsonwater - Firebase Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project created**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project named "kabsonwater"
   - Note your Project ID

3. **Authentication**
   ```bash
   firebase login
   ```

## Step 1: Configure Firebase Project

### 1.1 Update Firebase Configuration
Edit `firebase.js` with your actual Firebase credentials from Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kabsonwater.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 1.2 Create Environment Variables
Create `.env.local` in the web-app directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=kabsonwater.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

**Note:** Environment variables starting with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets here.

## Step 2: Initialize Firebase for Deployment

### 2.1 Create firebase.json
Create `firebase.json` in the project root:

```json
{
  "hosting": {
    "public": ".next/standalone/public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs24"
  }
}
```

### 2.2 Initialize Firebase Project
```bash
firebase init
```

When prompted:
- Select "Hosting" and "Functions"
- Use existing project: select "kabsonwater"
- Set public directory: `.next/standalone/public`
- Configure as SPA: Yes
- Functions language: JavaScript (or TypeScript)
- ESLint: Yes

## Step 3: Build and Deploy

### 3.1 Build Next.js App
```bash
npm run build
```

### 3.2 Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

For first-time deployment:
```bash
firebase deploy
```

## Step 4: Configure Firestore & Rules

### 4.1 Create Firestore Collections
Go to Firebase Console → Firestore Database and create these collections:
- `orders` (customer orders)
- `transactions` (accounting records)
- `suppliers` (supplier data)
- `purchase_orders` (PO records)

### 4.2 Set Firestore Security Rules
Replace default rules with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Public read access to catalog
    match /products/{document=**} {
      allow read: if true;
    }
  }
}
```

### 4.3 Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## Step 5: Deploy Cloud Functions (Optional)

If using the `kabsonwater` functions directory:

```bash
cd ../kabsonwater
npm install
cd ../web-app
firebase deploy --only functions
```

## Step 6: Verify Deployment

### Check Deployment Status
```bash
firebase hosting:channel:list
firebase deploy:log
```

### View Your Live Site
- Open: `https://kabsonwater.firebaseapp.com`
- Or your custom domain if configured

## Continuous Deployment (GitHub Actions)

### 6.1 Create GitHub Workflow
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '24'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: kabsonwater
          channelId: live
```

### 6.2 Add GitHub Secrets
In GitHub repository settings, add these secrets:
- `FIREBASE_SERVICE_ACCOUNT` (download JSON key from Firebase)
- All Firebase environment variables

## Troubleshooting

### Issue: "Missing or insufficient permissions"
**Solution:** Check Firestore rules allow your operations. Update rules in Firebase Console.

### Issue: Build fails with "Firebase config missing"
**Solution:** Ensure `.env.local` has all required `NEXT_PUBLIC_` variables.

### Issue: "Cannot find module '@/lib/commerce'"
**Solution:** Create `src/lib/commerce.ts` with your Firebase service functions.

### View Logs
```bash
firebase functions:log
firebase hosting:channel:log
```

## Production Checklist

- [ ] Update Firebase config with real credentials
- [ ] Set up `.env.local` for all environments
- [ ] Test all forms (orders, accounting, suppliers)
- [ ] Configure custom domain (optional)
- [ ] Set up database backups
- [ ] Monitor Cloud Functions usage
- [ ] Set up Monitoring alerts in Firebase Console
- [ ] Review Firestore Security Rules

## Performance Optimization

### Enable Compression
```bash
firebase hosting:update-config --enable-compression
```

### Set Cache Headers
Add to `firebase.json`:

```json
"hosting": {
  "headers": [
    {
      "source": "**/*.@(js|css|woff2|woff|ttf|otf)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=31536000"
        }
      ]
    }
  ]
}
```

## Support

For issues, check:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment/firebase)
- Firebase Console → Monitoring

