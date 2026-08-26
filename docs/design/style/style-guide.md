# Project Style Guide

## Meta
- Reference slug(s): prism-saas-landing (chrome/component polish), azurodigital.com/saas-website-examples (long-form article layout, adapted structurally for `/blogs/[slug]`), inspoai.io/blogs (image-led card-grid index, adapted structurally for `/blogs`)
- Web benchmark(s): Stripe / Linear-style component polish (pill CTAs, glass panels, generous whitespace)
- Date: 2026-08-26
- Note: this build extended Screenbolt's own already-established design system (`components/landing/**`) rather than introducing a new one — Prism's DNA (glass panels, big radius, pill buttons, gradient-fade footer wordmark) was already the pattern in use, so the blog pages reuse real components (`PublicHeader`, `Footer`, `Reveal`) instead of re-deriving tokens from scratch.

## Palette
- bg: #f5f5f2   surface: rgba(255,255,255,.60)   primary: #090b0c
- accent: #090b0c (inverted on dark hero/CTA sections)   text: #090b0c   muted: #090b0c/50–60

## Typography
- Display/heading font: Inter Tight (`--font-inter-tight`)   Body font: Inter Tight
- Accent font: Instrument Serif italic (`--font-instrument-serif`, class `.font-serif-italic`) — used on one emphasis word per major heading, never full sentences
- Hero scale: `text-[3.5rem] md:text-[5rem]` (blog index), `text-[2.25rem] md:text-[3.25rem]` (blog post h1), tracking-tight, leading-[0.95]–[1.15]

## Shape & depth
- Radius token: `rounded-3xl` (cards, images), `rounded-full` (buttons, pills, badges)
- Shadow token: none by default — depth comes from glass/blur + image overlays, not box-shadow (matches the rest of the landing page)

## Spacing rhythm
- Section padding: `py-14`–`py-24` (px-5 / md:px-8 / md:px-12)   Container max: `max-w-[1280px]` (grids), `max-w-[720px]` (article reading column)   Gap: `gap-6`

## Motion
- `Reveal` component (`components/landing/reveal.tsx`) — fade + translate + blur on scroll into view, `cubic-bezier(.22,1,.36,1)`, used on hero copy, feature cards, and article header
- `hover:scale-105` on card images, `group-hover:translate-x-0.5 group-hover:-translate-y-0.5` on card arrow icons — carried over from existing card patterns (`smart-cards.tsx`)

## Icon set
- Iconify (`@iconify/react`, `<Icon icon="solar:...">`) — Solar icon set, matches existing usage across `components/landing/**`. Not `@solar-icons/react`.

## Signature move
- Image-led bento asymmetry on `/blogs`: one large featured-post card (full width) above a 2–3 col grid of smaller cards — mirrors Prism's `bento-grid`/`overlap-offset` composition techniques and inspoai's roundup-style image-forward cards
- Single-column long-form reading layout on `/blogs/[slug]` (max-w-[720px]) with a full-bleed cover image break between the header and body — structurally modeled on azurodigital.com's article page
