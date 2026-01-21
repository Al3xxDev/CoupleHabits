# Deployment Guide

Since this is a **Next.js** application, the easiest and best way to deploy it is with **Vercel** (the creators of Next.js). It provides zero-configuration deployment, global CDN, and automatic HTTPS.

## Prerequisites

1.  **GitHub Account** (You already have this and pushed the code).
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com) using your GitHub account.
3.  **Supabase Credentials**: You will need your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Option 1: Vercel (Recommended)

### 1. Import Project
1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New..."** -> **"Project"**.
3.  You should see your `couple-habits` repository in the list. Click **"Import"**.

### 2. Configure Project
Vercel automatically detects Next.js. You generally don't need to change build settings.

**CRITICAL STEP: Environment Variables**
1.  In the "Configure Project" screen, expand the **"Environment Variables"** section.
2.  Add the variables from your local `.env.local` file:
    *   **Name**: `NEXT_PUBLIC_SUPABASE_URL`
        **Value**: `your_supabase_url_here`
    *   **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
        **Value**: `your_supabase_anon_key_here`

### 3. Deploy
1.  Click **"Deploy"**.
2.  Vercel will clone your repo, install dependencies, build the app, and assign it a domain (e.g., `couple-habits-xyz.vercel.app`).
3.  Wait ~1-2 minutes.
4.  **Done!** Your app is live.

## Option 2: Netlify

1.  Log in to Netlify and click **"Add new site"** -> **"Import an existing project"**.
2.  Connect to GitHub and select `couple-habits`.
3.  **Build Settings**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `.next` (Netlify usually detects Next.js automatically using the Essential Next.js plugin).
4.  **Environment Variables**:
    *   Click "Site settings" -> "Environment variables" to add your Supabase keys.

## Post-Deployment Checks

1.  **Visit the URL**: Open your new Vercel/Netlify URL on your phone.
2.  **Install PWA**: Use "Add to Home Screen" on iOS/Android to install it as an app.
3.  **Test Login/Sync**:
    *   Create a new user.
    *   Create a goal.
    *   Verify that data persists even if you refresh or close the app.
