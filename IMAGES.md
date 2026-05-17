# BolGuessr — Image Licensing Strategy

## The core problem

Famous football moment photos (Hand of God, Van Persie header, Grealish headbutt etc.) are
shot by professional sports photographers and owned exclusively by wire agencies:
**Getty Images, Reuters, AFP, Associated Press**.

These images are **not freely available anywhere** — Wikimedia, Flickr, and Openverse will
not have the exact shot you're looking for. Using them without a license on a commercial
(ad-supported) site creates real legal risk.

---

## Licensing tiers — what you can use

| Tier | Cost | Suitable for ads? | Notes |
|---|---|---|---|
| **CC0 / Public Domain** | Free | ✅ Yes | No attribution needed. Rare for match photos. |
| **CC BY / CC BY-SA** | Free | ✅ Yes | Must credit the photographer. Most Openverse results. |
| **CC BY-NC** | Free | ❌ No | Non-commercial only. Cannot use on ad site. |
| **AI-generated** | Low (~£0.10/image) | ✅ Yes | You own the output. No real-player likeness needed. |
| **Fan photographer (negotiated)** | Free–£50 | ✅ With agreement | Email outreach; many say yes for a credit. |
| **Getty Editorial License** | ~£100–300 per image | ✅ Yes | For single-use online. Not scalable long-term. |
| **Getty subscription** | ~£200/month | ✅ Yes | 750+ images/month. Worth it at scale. |

---

## Recommended approach by image type

### Famous historic moments (pre-1990)
- Check Wikimedia Commons for contemporary press photos — some are PD after 70+ years
- Search Openverse with the stadium name + year + "CC" 
- Consider AI illustration (see below)

### Premier League / Champions League (1990s–present)
- Freely licensed fan shots exist on Flickr — often stadium atmosphere, not exact action
- AI illustration is the most reliable path
- Getty license for the 5–10 most iconic puzzles

### Stadium shots
- Freely available on Wikimedia Commons and Openverse for almost every ground
- Great for puzzles where stadium identification is the main challenge

### Match programmes / scoreboards
- Many are on Wikimedia or can be photographed yourself — low risk

---

## AI illustration workflow (recommended for iconic moments)

AI-generated images solve the rights problem entirely. The output belongs to you.
You don't need to depict real players — describe the *moment* not the *person*.

**Recommended tool: Midjourney** (~£8/month for basic)

**Prompt template:**
```
cinematic still from a football match, [describe moment generically],
[stadium name], [year approximate], dramatic lighting, crowd in background,
photorealistic, sports photography style, 16:9
```

**Example prompts:**
- "cinematic still of a football player jumping to head a ball from a long cross, Arena Fonte Nova Brazil 2014, crowd celebrating, photorealistic sports photography"
- "football pitch invader attacking a player in navy blue kit, St Andrews Birmingham stadium 2019, stewards running"
- "football goalkeeper diving but ball crossing the goal line, Premier League, empty stadium during COVID"

**Tools:**
- Midjourney (best quality): midjourney.com
- DALL-E 3 via ChatGPT Plus: already excellent for this
- Stable Diffusion (self-hosted, free): requires GPU but you own everything

---

## Finding freely licensed images: the search script

```bash
node scripts/find-image.mjs "search terms" YYYY-MM-DD
```

This queries Openverse (covers Flickr + Wikimedia + more) for **commercial-use** images only.
It downloads your chosen image directly to `public/images/puzzles/` and prints the
attribution string to copy into `puzzles.ts`.

**Example searches that tend to work:**
```bash
node scripts/find-image.mjs "stamford bridge stadium chelsea"
node scripts/find-image.mjs "wembley stadium arch interior"
node scripts/find-image.mjs "azteca stadium mexico crowd"
node scripts/find-image.mjs "anfield liverpool atmosphere"
node scripts/find-image.mjs "peter crouch celebration"
```

---

## Attribution requirements

When using CC-licensed images, you must credit the photographer.

Each puzzle entry should include:
```typescript
imageAttribution: '"Title" by Creator is licensed under CC BY 2.0. https://...',
imageLicense:     "CC BY",
imageSourceUrl:   "https://www.flickr.com/photos/...",
```

The attribution string is printed automatically by `find-image.mjs`.

---

## Current image audit (as of May 2026)

| Date | Event | Image source | License status |
|---|---|---|---|
| 2026-05-10 | Grealish headbutt | Unknown | ⚠ Needs review |
| 2026-05-11 | Hand of God | Unknown | ⚠ Needs review |
| 2026-05-12 | Papiss Cissé curler | Unknown | ⚠ Needs review |
| 2026-05-13 | Bielsa sportsmanship | Unknown | ⚠ Needs review |
| 2026-05-14 | Goal-line tech failure | Unknown | ⚠ Needs review |
| 2026-05-15 | Crouch bicycle kick | Unknown | ⚠ Needs review |
| 2026-05-16 | Crouch volley Stoke | Unknown | ⚠ Needs review |
| 2026-05-17 | Kane face mask derby | Unknown | ⚠ Needs review |
| 2026-05-18 | Van Persie header | Unknown | ⚠ Needs review |
| 2026-05-19 | Blues League Cup Final | Unknown | ⚠ Needs review |
| 2026-05-20 | Zamora winner | Unknown | ⚠ Needs review |
| 2026-05-21 | Adebayor celebration | Unknown | ⚠ Needs review |

**Immediate priority**: replace the most iconic shots (Hand of God, Van Persie) with either:
1. An AI illustration, OR
2. A freely licensed fan shot from Openverse

---

## Outreach template (for fan photographers)

If you find a great Flickr photo that's CC BY-NC (non-commercial) and want to use it:

> Hi [Name],
>
> I run BolGuessr (bolguessr.com), a daily football trivia game. I found your photo of
> [moment] from [year] and it would be perfect for one of our puzzles.
>
> Would you be willing to grant us permission to use it commercially in exchange for a
> prominent photo credit on the puzzle page? We're a small independent project.
>
> Thanks,
> [Your name]

Most photographers on Flickr are fans who say yes. Getty photographers won't.

---

## Long-term plan

1. **Now**: use existing images cautiously (no ads yet, DMCA risk is low)
2. **Before monetising**: replace all 12 current images with licensed alternatives
3. **Ongoing**: use `find-image.mjs` first, fall back to AI illustration
4. **At scale**: consider a Getty subscription (~£200/month) if you're publishing 7 puzzles/week
