# Talon Landing Page

Developer-first pricing signals API landing page.

## Overview

Landing page for Talon - a competitor price tracking API that turns price changes into signals.

## Tech Stack

- **Framework**: Astro
- **Deployment**: Vercel
- **Styling**: Custom CSS (dark SaaS aesthetic)

## Project Structure

```
src/
├── components/
│   └── Landing.astro      # Main landing page
├── layouts/
│   └── Layout.astro       # Base layout
├── pages/
│   ├── index.astro        # Home page
│   └── docs.astro         # API documentation
└── env                    # Environment variables
```

## Environment Variables

```env
PUBLIC_API_URL=https://price-tracking-api.p.rapidapi.com
PUBLIC_API_KEY=demo_test_2024
PUBLIC_DEMO_URL=https://api-talon.fly.dev/demo
PUBLIC_DEMO_KEY=demo_test_2024
```

## API Endpoints

### Demo (Internal Backend)
- **POST** `/demo/track-product` - Create product tracker
- **GET** `/products/product/:id` - Get price data

### Production (RapidAPI)
- **Base URL**: `https://price-tracking-api.p.rapidapi.com`
- **Headers**: `X-RapidAPI-Key`, `X-RapidAPI-Host`

## Demo Section

The "Try Talon" section allows users to test the API without authentication:

1. User enters product URL and CSS selector
2. Frontend calls `POST /demo/track-product` to create tracker
3. Frontend immediately calls `GET /products/product/:id` to fetch price data
4. Response is displayed in JSON format

## Deployment

1. Connect GitHub repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploys automatically on git push

## Updates Log

### 2024-04-18
- Initial landing page with hero, features, how it works, CTA
- Demo section with live API testing
- API documentation page
- RapidAPI integration for production API
- Internal demo endpoint for testing without auth
- GitHub push deployment setup
- Vercel configuration

## Notes

- The demo uses internal backend (`api-talon.fly.dev/demo`) without auth
- Production examples show RapidAPI integration
- All buttons link to RapidAPI marketplace for signups