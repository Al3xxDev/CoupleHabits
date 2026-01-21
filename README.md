# Couple Habits

A modern, PWA-ready web application designed for couples to build and track habits together.

## Features

- **Couple Goals**: Create shared habits (e.g., "Morning Walk") and track progress together.
- **Real-time Sync**: Changes sync instantly between partners using Supabase Realtime.
- **Offline Support**: Works offline with local persistence (IndexedDB) and syncs when back online.
- **Multilingual**: Supports English, Spanish, and Italian.
- **Streaks & Gamification**: Track streaks, get confetti for completions, and visualize progress.
- **Invite System**: Easily link with your partner using a unique 6-digit code.

## Tech Stack

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion
- **State/Sync**: Custom Offline-First Sync Engine (IndexedDB + Supabase)
- **Database**: Supabase (PostgreSQL)
- **Design**: Mobile-first, premium aesthetic with Lucide Icons.

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/couple-habits.git
   cd couple-habits
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/app`: Next.js App Router pages (using `[locale]` for i18n).
- `src/components`: Reusable UI components.
- `src/core`: Domain entities, use cases, and interfaces (Clean Architecture).
- `src/services`: Infrastructure implementations (Supabase, IndexedDB, SyncEngine).
- `src/messages`: Translation dictionaries (en, es, it).

## Deployment

The application is optimized for deployment on Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fcouple-habits)
