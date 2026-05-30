# BolGuessr — Image Evaluation Logic

This document captures the exact reasoning used when selecting puzzle images during
the session where the Wikimedia + Twitter sourcing pipeline was built. It is the
ground truth for the automated evaluation prompt fed to the local vision LLM
(Qwen2.5-VL or Llama 3.2-Vision via Ollama).

---

## What makes a good BolGuessr puzzle image

The player sees the image **before** making any guesses. The image must:
1. Be identifiable as a specific real football match
2. Not directly give away the answer (no score overlay, no "Full-Time" graphic)
3. Show enough visual context to make the puzzle solvable with knowledge
4. Be press/photographic quality, not a designed graphic

---

## Decision trace — real examples from sourcing session

These are actual photos evaluated, in order, with exact reasoning.

### ✅ PASS — @LUFC West Ham vs Leeds (header challenge)
- **What it shows:** Header challenge in the penalty area. West Ham (maroon) vs Leeds (blue/yellow away kit). Packed stadium behind.
- **Why pass:** Both kits clearly visible and distinguishable. Real match action (ball in air, players competing). No text overlay. No score shown. Press photography style, 2048×2048.
- **Difficulty implication:** Medium-hard — kit colours narrow it down but don't confirm the match.

### ❌ FAIL — @WestHam "Full-Time" graphic
- **What it shows:** Squad huddle photo overlaid with "Full-Time", "West Ham 3", Leeds crest, "0" — full score shown.
- **Why fail:** Score overlay directly answers the puzzle. Branded club graphic, not press photo.
- **Key rule triggered:** No score/result text on image.

### ❌ FAIL — @WestHam "TATY SCORES!!!!" goal graphic
- **What it shows:** Studio headshot of Valentín Castellanos with "Goal!" in large text and his name overlaid.
- **Why fail:** Player name explicitly written on the image (too easy). "Goal!" text is a graphic overlay. Studio headshot, not match action. Designed social media template.
- **Key rule triggered:** No player name/club overlays. Not match action.

### ❌ FAIL — @WestHam substitution graphic (Kanté/Taty)
- **What it shows:** Two player headshots with "ON" / "OFF" labels.
- **Why fail:** Not match action. Names visible. Graphic template.

### ❌ FAIL — Wikimedia 1999 UCL Final celebration (wide crowd shot)
- **What it shows:** Man Utd players around a "WINNERS" banner at Camp Nou, tiny in frame, from the stands.
- **Why fail:** "WINNERS" banner reveals the result. Players too small and indistinct to identify. Fan shot, not press photography. Poor composition for puzzle use.
- **Key rule triggered:** No result-revealing text. Players must be legible.

### ✅ PASS — Drogba 2012 UCL Final post-match portrait
- **What it shows:** Drogba in Chelsea blue kit, medal around neck, arms out, celebrating.
- **Why pass:** Recognisable player (Drogba), clear kit (Chelsea blue, Samsung sponsor). No score shown. CC licensed.
- **Caveat:** Post-match not in-game action. Only one team visible. Would be rated lower than a dual-kit action shot.

### ✅✅✅ PASS — Klose vs David Luiz header (Germany 7-1 Brazil, photo 12)
- **What it shows:** Miroslav Klose (Germany, black/red kit) winning a header against David Luiz (Brazil, yellow). Both faces clearly visible. 4928×3185.
- **Why pass:** Both kits clearly visible and contrasting. Both players recognisable by face and kit. Dynamic aerial challenge. No text overlay. Press photography at ~16MP. Iconic match.
- **Difficulty implication:** Easy — both players are very recognisable, iconic match.

### ✅✅ PASS — Müller #13 shooting (Germany 7-1 Brazil, photo 09)
- **What it shows:** Thomas Müller (#13, "MÜLLER" on shirt) about to shoot. Marcelo (Brazil yellow) visible behind.
- **Why pass:** Both kits visible. Real match action. High resolution.
- **Slight concern:** "MÜLLER 13" printed on shirt back makes it almost trivially easy. Still usable but puzzle difficulty = easy.

### ✅✅ PASS — Klose "2 fingers" goal celebration (Germany 7-1 Brazil, photo 11)
- **What it shows:** Klose pointing two fingers up (record-breaking goal), Müller behind him, yellow Brazil fans in background.
- **Why pass:** Iconic identifiable moment. Klose's face recognisable. Germany kit clear.
- **Caveat:** Only Germany visible. Brazil fans in background hint at venue but don't confirm match without knowledge.

### ❌ FAIL — Brazil team huddle (Germany 7-1 Brazil, photo 13)
- **What it shows:** Brazil squad facing away from camera in a huddle, "FIFA World Cup Brazil" branding, yellow fans.
- **Why fail:** No Germany visible at all. Backs to camera — players unidentifiable. Pre-match, not game action. Could be any Brazil game.

### ✅✅✅ PASS — Argentina header / Schweinsteiger watching (2014 WC Final, photo 13)
- **What it shows:** Argentina player (blue away kit) winning header. Bastian Schweinsteiger (#7, Germany white) watching below.
- **Why pass:** Both kits clearly visible and contrasting (Argentina blue, Germany white). Both players recognisable. Dynamic aerial action. No text. ~12MP Agência Brasil press photo.
- **Difficulty implication:** Medium — Schweinsteiger recognisable, but which Argentina player is jumping? Narrows to a Germany vs Argentina match.

### ✅✅ PASS — Messi solo shot (2014 WC Final, photo 04)
- **What it shows:** Messi (#10, "MESSI" on shirt back) striking ball. Argentina blue kit. McDonalds advertising board.
- **Why pass:** Messi instantly recognisable. Argentina kit clear. World Cup context (ball, advertising boards).
- **Caveat:** Only Argentina visible. "MESSI 10" on shirt back makes it easy. Selected photo 13 instead.

### ✅✅✅ PASS — Brazil surrounded by Chile (Brazil vs Chile, photo 13)
- **What it shows:** Brazil player (yellow) surrounded by multiple Chile players (red). Mid-game action. Several players from both sides.
- **Why pass:** Both kits very clearly visible and strongly contrasting (yellow vs red). Multiple players from both teams. Real match action. 5472×3648 (20MP). No text.
- **Difficulty implication:** Medium — Brazil is obvious, Chile or similar red-kit team required as answer.

### ❌ FAIL — Brazil vs Chile crowd/stadium (photo 15)
- **What it shows:** Packed stadium with yellow-clad Brazil fans. No players.
- **Why fail:** No players visible. Could be any Brazil home game. Not puzzle-usable.

### ✅✅✅ PASS — James Rodríguez goal vs Uruguay
- **What it shows:** James (#10, Colombia yellow) mid-shot in the penalty area. Uruguay goalkeeper diving left. Uruguay defender on ground. Both kits (Colombia yellow/red, Uruguay light blue/white) visible.
- **Why pass:** Action shot at the moment of the goal. Both kits visible and distinguishable. Recognisable player (#10). No text overlay. Real press photography.
- **Difficulty implication:** Medium — Colombia and Uruguay kits identifiable, #10 recognisable.

### ❌ FAIL — Brazil vs Cameroon lineup photo
- **What it shows:** Brazil squad lined up for the anthem, children mascots in front, yellow-clad fans behind.
- **Why fail:** Only Brazil visible. Players facing camera but arranged for anthem not action. Pre-match. No Cameroon players shown at all.

### ✅✅✅ PASS — Fernandinho goal vs Cameroon
- **What it shows:** Brazil player (yellow) shooting at close range. Cameroon goalkeeper (green kit) diving. Cameroon defender on the ground. Both kits visible.
- **Why pass:** Both kits clearly visible (Brazil yellow, Cameroon green/red). Genuine goal-scoring action. Ball visible near goal. Both teams represented. No text. 5096×3084 press photo.
- **Difficulty implication:** Hard — Brazil vs which African team in green? Less iconic match.

---

## Decision framework (distilled rules)

### Automatic FAIL — any one of these disqualifies

| Rule | Reason |
|---|---|
| Score/result text overlaid (e.g. "Full-Time 3-0", "2-1") | Directly answers the puzzle |
| "Goal!", "WINNER", "Champions" graphic text | Reveals too much |
| Player name printed/overlaid on image | Makes identification trivial |
| Only one team's kit visible AND no other contextual clues | Insufficient to identify the match |
| No players visible (crowd only, stadium only, trophy only) | Not a match action photo |
| Designed social media template (branded goal card, sub graphic) | Not press photography |
| Getty/Reuters/AP watermark visible | Cannot be used legally |
| Resolution below 900px on shortest edge | Too low quality |
| Pre-match lineup facing camera (anthem pose) | Not action, reveals team |
| Post-match trophy lift that shows both the winner and scoreline | Too revealing |

### Strong PASS signals — these increase score

| Signal | Why it matters |
|---|---|
| Both teams' kits clearly visible and colour-distinguishable | Core requirement for puzzle solvability |
| Ball in play (in air, being struck, in net) | Confirms match action moment |
| Recognisable player visible by face or number | Increases puzzle richness |
| Stadium/crowd context without revealing score | Gives atmosphere without spoilers |
| Horizontal landscape orientation | Better display in puzzle UI |
| Resolution ≥ 1080p (ideally 4K+) | Quality standard |
| Natural press photography lighting and depth of field | Confirms real press photo |
| Dynamic body positions (airborne, stretching, challenging) | Confirms action moment |

### Difficulty signal (for puzzle `difficulty` field)

| Image content | Suggested difficulty |
|---|---|
| Both teams' kits + iconic recognisable players (e.g. Klose, Messi) | `"easy"` |
| Both kits visible, players partly recognisable by number/position | `"medium"` |
| One team clearly identifiable, opponent inferrable from context | `"hard"` |
| Atmospheric, both teams visible but no iconic faces | `"hard"` |

---

## LLM evaluation prompt (Ollama / Qwen2.5-VL)

Use this exact prompt when sending a candidate image to the vision model:

```
You are evaluating whether an image is suitable as a puzzle photo for a football
trivia game called BolGuessr. Players see the photo and must guess: the year,
competition, home team, away team, score, goal scorers, and stadium.

Evaluate this image against the following criteria and return a JSON response.

AUTOMATIC FAIL (set suitable=false immediately if ANY of these are true):
- A score or result is shown as text (e.g. "3-0", "Full-Time", "Final Score")
- A player's name is overlaid as a graphic element
- "Goal!", "WINNER", "Champions" or similar result text is visible
- This is a designed social media graphic/template rather than a press photo
- No football players are visible (crowd only, trophy only, stadium empty)
- Only one team's kit is visible AND the image has no other contextual clues
- A commercial watermark (Getty, Reuters, AP) is visible

SCORING (1-10, only if not auto-failed):
- Start at 5
- +2 if both teams' kit colours are clearly visible and distinguishable
- +1 if the ball is visible and in play
- +1 if at least one recognisable player is visible (face, iconic appearance)
- +1 if this is clear press/sports photography (not a graphic, not a fan selfie)
- -1 if only one team is visible
- -1 if players are very small/distant and not individually distinguishable
- -2 if any player name, shirt name, or club name text is overlaid

Respond ONLY with valid JSON in this exact format:
{
  "suitable": true | false,
  "score": 1-10,
  "auto_fail_reason": "string or null",
  "both_kits_visible": true | false,
  "has_action": true | false,
  "has_text_overlay": true | false,
  "visible_kit_colours": ["colour1", "colour2"],
  "description": "one sentence describing what the photo shows",
  "difficulty": "easy | medium | hard"
}
```

---

## Source quality tiers

Based on what we learned during sourcing:

| Source | Image type | Suitable? | Notes |
|---|---|---|---|
| Official club Twitter — title wins / finals | Real press photos | ✅ Often | Arsenal title win 2026: excellent. Leeds vs West Ham: mixed |
| Official club Twitter — regular matchday | Branded graphics | ❌ Usually | Goal cards, sub graphics — all templates |
| Wikimedia / copa2014.gov.br | Press photos | ✅ Best for 2014 WC Brazil games | CC BY 3.0, 12-20MP |
| Wikimedia / Agência Brasil | Press photos | ✅ | Same as above |
| Wikimedia / other 2014 WC | Fan/crowd photos | ⚠️ Mixed | Check for "(fans)" in filename |
| Wikimedia / 2018 WC (Tasnim) | Press photos | ❌ Too small | 800×557px only |
| Wikimedia / 2022 WC | Fan celebrations | ❌ | No match action photos available |
| Getty Images embedded | Press photos | ❌ | Cannot download/host — paywalled |

---

## Integration notes for `evaluate-image.mjs`

The script should:

1. Send the image as base64 to Ollama at `localhost:11434/api/generate`
2. Use model `qwen2.5vl:7b` (or `llama3.2-vision:11b` as fallback)
3. Parse the JSON response
4. Auto-reject if `suitable === false`
5. Auto-reject if `score < 6`
6. Auto-reject if `has_text_overlay === true`
7. Write approved images + metadata to `~/staging/bolguessr/`
8. Send macOS notification with count of approved candidates

See `scripts/hunt-images.mjs` for the download pipeline this hooks into.
