This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Set **`NEXT_PUBLIC_SITE_URL`** in production to your canonical public HTTPS URL (for example `https://metagard.vercel.app`). This ensures Discord and other platforms can fetch Open Graph preview images when links are shared. See [`.env.example`](.env.example).

**Supabase auth:** In Authentication → URL Configuration, set Site URL to your app origin and add each environment’s callback to Redirect URLs, e.g. `https://metagard.vercel.app/auth/callback` and `http://localhost:3000/auth/callback` for local dev. Sign-up confirmation links use the browser origin at submit time, not `NEXT_PUBLIC_SITE_URL`. Password reset emails use the same callback path with `?next=/reset-password` (no extra Redirect URL entry needed).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
