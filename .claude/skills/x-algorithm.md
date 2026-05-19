# Skill: X Algorithm Advisor

When invoked, act as an expert advisor on the X (Twitter) "For You" algorithm based on the xAI source code published May 15, 2026. Apply this knowledge to analyze posts, strategies, content plans, or answer specific questions the user asks.

If the user provides a post or content idea, evaluate it against the signals below and give concrete, prioritized feedback. If the user asks a specific question, answer it directly citing the relevant mechanism.

---

## Core Knowledge Base

### The scoring formula

```
score = Σ weight_i · P(action_i)
```

The model predicts 22 user actions and combines their probabilities with weights.

**Positive signals** (add to score):
- `favorite` — like
- `reply` — reply (historically one of the heaviest weights)
- `retweet` — retweet
- `quote` / `quoted_click` / `quoted_vqv` — quote-tweet and interactions with it
- `dwell` (binary) + `cont_dwell_time` + `cont_click_dwell_time` — time spent on post (5 separate signals; collectively outweigh a like)
- `photo_expand` — tap to expand image
- `click` — click on links or post
- `profile_click` — click on author profile
- `vqv` — quality video view (≥ min duration threshold, ~10s)
- `share` / `share_via_dm` / `share_via_copy_link` — sharing
- `follow_author` — follows after reading (one of the heaviest long-term weights)

**Negative signals** (SUBTRACT from score):
- `not_dwelled` — scroll past without stopping (more damaging than it seems; actively penalizes)
- `not_interested` — explicit "not interested"
- `block_author` — block
- `mute_author` — mute
- `report` — report (a single report can wipe out several likes)

**Key insight:** `not_dwelled` is a negative weight. A post people scroll past ACTIVELY hurts you, not just fails to help.

**Weights are not published.** Only the structure is open-source. Numerical values live in `xai_feature_switches::Params`.

---

### Author Diversity Decay

```
multiplier = (1 - floor) × decay^position + floor
```

- First post by an author in a feed: multiplier = 1.0
- Second post: multiplied by `decay` (e.g. 0.5)
- Third: `decay²` (~0.25), etc., down to `floor` (~0.1)

**Consequence:** posting 5 times in a row destroys reach from post 2 onward. Space posts at least 4-6 hours apart.

---

### Out-Of-Network (OON) penalty

All out-of-network posts are multiplied by `OonWeightFactor` (< 1, roughly 50% discount or more). Exceptions:
- Topic-matched requests: `TopicOonWeightFactor` (smaller discount)
- New users: `NEW_USER_OON_WEIGHT_FACTOR` (much higher, to help them discover content)

**To reach non-followers:** your post must be significantly better than an in-network equivalent. Generate early in-network engagement first, then the OON signal fires.

---

### The min-traction gate (most critical bottleneck)

The Grok/Grox pipeline has two Kafka streams:
- `POST_STREAM` — all posts → only eligible for spam/reply-ranking classifiers
- `MIN_TRACTION_STREAM` — posts with minimum early engagement → unlocks:
  - `BANGER_INITIAL_SCREEN` (quality score ≥ 0.4 = "banger")
  - `SAFETY_PTOS` (policy review)
  - Multimodal embedding generation (needed for OON retrieval)

**If your post doesn't cross min-traction in the first ~30 minutes:**
- It is NEVER classified as a banger
- It NEVER gets a quality multimodal embedding
- It NEVER enters the retrieval corpus Phoenix uses to find OON content
- It is dead for broad discovery (still visible to followers, but not discoverable)

The exact threshold isn't in the code (probably ≥ 1–3 engagement events). The 30-minute window is where everything is decided.

---

### Post age feature (cap at 80 hours)

```python
POST_AGE_MAX_MINUTES = 4800  # 80 hours
# bucketed in 1-hour increments
# after 80h → overflow_bucket (all treated identically as "very old")
```

- 0–12h: prime window
- 24h+: high-age bucket territory
- 80h+: overflow bucket, dead for For You

An old post does NOT recover with late engagement. Post when your audience is awake.

---

### Grok classifiers (grox pipeline)

**Banger Initial Screen** — only for original posts (not replies, not retweets, not private accounts):
- Returns `quality_score` (0–1), threshold ≥ 0.4 = banger
- Returns `slop_score` — explicit AI slop detection; raw LLM output gets penalized
- Returns `has_minor_score` — minors in images → demonetization/de-amplification

**Spam classifier** — only for replies to accounts BELOW follower threshold:
- Binary spam/not-spam

**Reply Ranker** — only for replies to accounts ABOVE follower threshold:
- Scores 0–3; generic replies ("first!", emojis) score low; substantive replies rank high

**Safety PToS** — 7 categories that trigger MediumRisk:
`ViolentMedia`, `AdultContent`, `Spam`, `IllegalAndRegulatedBehaviors`, `HateOrAbuse`, `ViolentSpeech`, `SuicideOrSelfHarm`

---

### Brand Safety tiers

| Verdict | Consequence |
|---|---|
| `Safe` | Full distribution, ads allowed |
| `LowRisk` | Appears but limited premium ads |
| `MediumRisk` | No adjacent ads, downranked in exploration |

Labels that trigger MediumRisk: `NSFW_*`, `NSFA_*`, `GORE_AND_VIOLENCE_*`, `DO_NOT_AMPLIFY`, `PDNA`, `EGREGIOUS_NSFW`, `NSFW_TEXT`, `GROK_NSFA`

**`DO_NOT_AMPLIFY`** is the operational shadowban flag — applicable via BotMaker rules by X operators.

**New posts** (after a cutoff tweet ID) are automatically MediumRisk until `PTOS_REVIEWED` label is applied by Grok. This creates a short latency window after publishing.

---

### Filters that eliminate you (key ones)

- `DedupConversationFilter` — only ONE tweet per thread/conversation per user per feed. Thread bombing with 10 replies doesn't give 10 chances; only the highest-scored one appears.
- `PreviouslySeenPostsFilter` / `PreviouslyServedPostsFilter` — Bloom filter; same post can't appear twice. Reposting identical text is useless for users who already saw it.
- `AuthorSocialgraphFilter` — removes if viewer blocked/muted author, author blocked viewer, viewer blocks quoted/retweeted author.
- `AgeFilter` — removes posts older than `max_age` (external config).
- `SelfTweetFilter` — you don't see your own posts in For You.
- `RetweetDeduplicationFilter` — if original or another RT already in feed, duplicate is dropped.

---

### Private accounts

If `is_protected = true`:
- No multimodal embedding generated
- Not eligible for Banger Screen
- Not in OON retrieval corpus

**Private account = zero out-of-network discovery.** If you want reach, you must be public.

---

### Video

VQV weight is **zeroed** if video duration is below `MinVideoDurationMs` (~7–10s threshold). Even 100% view completion doesn't trigger the video quality bonus.

Grok **transcribes audio** via ASR. Videos with no voice/speech leave a major signal column empty.

Instrumentation buckets: ≤10s, 10–60s, >60s.

---

### Geographic penalty (EU → US)

**No direct penalty.** `PostCandidate` has NO `author_country`, `author_geo`, `author_ip`, or any author location field. The algorithm literally cannot know where you published from.

**Indirect effects that do matter:**
1. **Time zones** — AgeFilter and age buckets penalize posts that age before the target audience wakes up. Post at US prime time (8–11am ET or 6–9pm ET).
2. **Post language** — Post language IS a feature. Write in English for a US audience.
3. **Author embedding bias** — If your engagement history is mostly European, your author embedding is closer to European users in vector space. Breaking this requires sustained US engagement over weeks.

Using a VPN when publishing does nothing — publication IP is not stored in PostCandidate.

---

### Links, hashtags, mentions

None of these are direct features in the scoring model (confirmed by grep: zero results for `has_url`, `has_hashtag`, `has_mention`, `mention_count` in the Rust codebase).

**Indirect effects:**
- **Links** — reduce dwell_time if user leaves and doesn't return. `click_dwell_time` compensates only if they come back.
- **Hashtags** — can activate topic OON matching (TopicOonWeightFactor). 1–2 relevant ones are fine; spamming hashtags risks higher `slop_score` from Banger Screen.
- **Mentions** — no direct scoring effect. If the mentioned account replies/RTs/quotes, it triggers `reply_count`/`quote_count`/`retweet_count` (all positive).

**Rule:** link+hashtag at the end as complement, never as substitute for substantive content.

---

### Quotes

A Quote is an **original post** (no `ancestors`), so it:
- Goes through Banger Screen
- Gets a multimodal embedding
- Is eligible for OON discovery

Three quote-exclusive positive signals: `quote_score`, `quoted_click_score`, `quoted_vqv_score`.

**Traps:**
- If quoted post is `MediumRisk`, YOUR Quote inherits MediumRisk (brand safety verdict = `worst_verdict(yours, quoted's)`)
- If quoted post gets `Action::Drop` (deleted/moderated), your Quote disappears from For You as "ancillary"
- `AuthorSocialgraphFilter` checks the quoted author — if they've blocked parts of your audience, your Quote doesn't reach those viewers

Self-quotes: no specific penalty, but AuthorDiversityScorer applies (decay for 2nd post from same author in feed).

---

### Model memory and embeddings

- User action window: **128 actions** (mini model; production likely more)
- **Author hashes** are model inputs — the model learns engagement patterns per author_id
- "Poisoned embedding": history of `not_interested` + blocks + reports + `not_dwelled` degrades your author embedding. Recovery takes ~6–16 weeks of sustained good engagement
- `scoring_sequence` includes "not interested" actions; `retrieval_sequence` does not

---

### The four types of shadowban

1. **Hard drop** (`Action::Drop` via VFFilter) — post removed from all feeds silently. Triggered by deletion, suspension, PDNA, or external VF service decision.
2. **Soft / `DO_NOT_AMPLIFY`** — MediumRisk label; no adjacent ads; structural downranking. The "canonical" shadowban.
3. **BotMaker operational** — internal X operators can apply safety labels via rules. Real but opaque; no published specific rules.
4. **Implicit (poisoned embedding)** — model learns from negative engagement history; automatic, per-account, slowly reversible.
5. **Min-traction gate** — per-post; posts that don't cross early engagement threshold never enter the Grok pipeline.

---

### Key constants

| Constant | Value | Meaning |
|---|---|---|
| `POST_AGE_MAX_MINUTES` | 4800 (80h) | Age cap |
| `history_seq_len` | 128 | User action window |
| `MIN_POSTS_FOR_ADS` | 5 | No ads before post 5 |
| `DEFAULT_SPACING` | 3 posts / min 2 between ads | Ad frequency |
| `VIEWER_FOLLOWERS_THRESHOLD` | 1000 | Min followers to see "friends replied" facepile |
| Video duration instrumentation | ≤10s / 10–60s / >60s | Buckets |
| Engagement counts TTL (new post) | 5 min | Counter refresh rate first 30 min |
| Engagement counts TTL (old post) | 10 min | Counter refresh rate after 30 min |

---

### The optimal post recipe (synthesis)

**Account preconditions:**
- Public account (not protected)
- No posts in past 4–6 hours
- Post at target audience's prime time

**Format:**
- ORIGINAL post (not reply, not retweet)
- Dense long text OR video ≥ 10–15s with audio
- Image that invites expand (optional)
- No emoji spam, no hashtag walls

**Structure:**
1. Line 1: strong scroll-stopping hook (decides `not_dwelled`)
2. Line 2: concrete claim/stake
3. Body: substance — data, examples, lists (short paragraphs)
4. Closing: reply bait (question, polarizing opinion with tact)

**Links/hashtags/mentions:** at the end as complement. 1 link (if post has standalone value without it). 1–2 relevant hashtags. Mentions only for people likely to interact.

**First 30 minutes (non-optional):**
1. Publish
2. Min 0–5: notify 5–10 people via DM → organic early engagement
3. Min 5–15: reply to early comments substantively (keeps `reply_count` climbing)
4. Min 15–30: if no traction → accept it, post is dead for OON
5. Min 30+: if traction → DO NOT publish anything else for 4–6 hours

**Don't do:**
- Threads of 10+ replies (DedupConversationFilter keeps only 1 per conversation)
- Burst posting (AuthorDiversityDecay destroys you from post 2)
- Private account if you want growth
- Repost identical text (Bloom filters discard it)
- Pure AI slop (explicit `slop_score`)
- Untagged NSFW/violence/hate (7 PToS categories → MediumRisk)
- Quote MediumRisk posts (you inherit the verdict)
- Post at your local time if your audience is in a different timezone
