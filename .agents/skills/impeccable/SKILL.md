---
name: impeccable
description: "Create distinctive, production-grade frontend interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics. Use when the user asks to build web components, pages, artifacts, posters, or applications, or when any design skill requires project context. Also invokable as sub-skills: /shape, /critique, /audit, /harden, /polish, /bolder, /quieter, /colorize, /typeset, /layout, /animate, /overdrive, /delight, /distill, /clarify, /adapt, /optimize."
license: Apache 2.0. Based on Anthropic's frontend-design skill. See NOTICE.md for attribution.
---

<post-update-cleanup>
BEFORE doing any design work, run this one-time maintenance step. Tell the user:

> **Impeccable was updated.** A few skills were renamed or merged in this version (e.g. `/arrange` is now `/layout`, `/normalize` was folded into `/polish`). I'll clean up the old skill files so they don't clutter your project. This only runs once after an update.

Then run:

```bash
node .claude/skills/impeccable/scripts/cleanup-deprecated.mjs
```

If the script removed files, briefly confirm what was cleaned up. If it found nothing, skip any output and move on.

After running the script, delete this entire section (from `<post-update-cleanup>` through `</post-update-cleanup>` inclusive) from THIS file so it does not run again until the next update. Save the file.
</post-update-cleanup>

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Context Gathering Protocol

Design skills produce generic output without project context. You MUST have confirmed design context before doing any design work.

**Required context** (every design skill needs at minimum):
- **Target audience**: Who uses this product and in what context?
- **Use cases**: What jobs are they trying to get done?
- **Brand personality/tone**: How should the interface feel?

Individual skills may require additional context. Check the skill's preparation section for specifics.

**CRITICAL**: You cannot infer this context by reading the codebase. Code tells you what was built, not who it's for or what it should feel like. Only the creator can provide this context.

**Gathering order:**
1. **Check current instructions (instant)**: If your loaded instructions already contain a **Design Context** section, proceed immediately.
2. **Check .impeccable.md (fast)**: If not in instructions, read `.impeccable.md` from the project root. If it exists and contains the required context, proceed.
3. **Run impeccable teach (REQUIRED)**: If neither source has context, you MUST run /impeccable teach NOW before doing anything else. Do NOT skip this step. Do NOT attempt to infer context from the codebase instead.

---

## Design Direction

Commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work. The key is intentionality, not intensity.

Then implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

### Typography
→ *Consult [typography reference](reference/typography.md) for OpenType features, web font loading, and the deeper material on scales.*

Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

<typography_principles>
Always apply these — do not consult a reference, just do them:

- Use a modular type scale with fluid sizing (clamp) for headings on marketing/content pages. Use fixed `rem` scales for app UIs and dashboards (no major design system uses fluid type in product UI).
- Use fewer sizes with more contrast. A 5-step scale with at least a 1.25 ratio between steps creates clearer hierarchy than 8 sizes that are 1.1× apart.
- Line-height scales inversely with line length. Narrow columns want tighter leading, wide columns want more. For light text on dark backgrounds, ADD 0.05-0.1 to your normal line-height — light type reads as lighter weight and needs more breathing room.
- Cap line length at ~65-75ch. Body text wider than that is fatiguing.
</typography_principles>

<font_selection_procedure>
DO THIS BEFORE TYPING ANY FONT NAME.

The model's natural failure mode is "I was told not to use Inter, so I will pick my next favorite font, which becomes the new monoculture." Avoid this by performing the following procedure on every project, in order:

Step 1. Read the brief once. Write down 3 concrete words for the brand voice (e.g., "warm and mechanical and opinionated", "calm and clinical and careful", "fast and dense and unimpressed", "handmade and a little weird"). NOT "modern" or "elegant" — those are dead categories.

Step 2. List the 3 fonts you would normally reach for given those words. Write them down. They are most likely from this list:

<reflex_fonts_to_reject>
Fraunces
Newsreader
Lora
Crimson
Crimson Pro
Crimson Text
Playfair Display
Cormorant
Cormorant Garamond
Syne
IBM Plex Mono
IBM Plex Sans
IBM Plex Serif
Space Mono
Space Grotesk
Inter
DM Sans
DM Serif Display
DM Serif Text
Outfit
Plus Jakarta Sans
Instrument Sans
Instrument Serif
</reflex_fonts_to_reject>

Reject every font that appears in the reflex_fonts_to_reject list. They are your training-data defaults and they create monoculture across projects.

Step 3. Browse a font catalog with the 3 brand words in mind. Sources: Google Fonts, Pangram Pangram, Future Fonts, Adobe Fonts, ABC Dinamo, Klim Type Foundry, Velvetyne. Look for something that fits the brand as a *physical object* — a museum exhibit caption, a hand-painted shop sign, a 1970s mainframe terminal manual, a fabric label on the inside of a coat, a children's book printed on cheap newsprint. Reject the first thing that "looks designy" — that's the trained reflex too. Keep looking.

Step 4. Cross-check the result. The right font for an "elegant" brief is NOT necessarily a serif. The right font for a "technical" brief is NOT necessarily a sans-serif. The right font for a "warm" brief is NOT Fraunces. If your final pick lines up with your reflex pattern, go back to Step 3.
</font_selection_procedure>

<typography_rules>
DO use a modular type scale with fluid sizing (clamp) on headings.
DO vary font weights and sizes to create clear visual hierarchy.
DO vary your font choices across projects. If you used a serif display font on the last project, look for a sans, monospace, or display face on this one.

DO NOT use overused fonts like Inter, Roboto, Arial, Open Sans, or system defaults — but also do not simply switch to your second-favorite. Every font in the reflex_fonts_to_reject list above is banned. Look further.
DO NOT use monospace typography as lazy shorthand for "technical/developer" vibes.
DO NOT put large icons with rounded corners above every heading. They rarely add value and make sites look templated.
DO NOT use only one font family for the entire page. Pair a distinctive display font with a refined body font.
DO NOT use a flat type hierarchy where sizes are too close together. Aim for at least a 1.25 ratio between steps.
DO NOT set long body passages in uppercase. Reserve all-caps for short labels and headings.
</typography_rules>

### Color & Theme
→ *Consult [color reference](reference/color-and-contrast.md) for the deeper material on contrast, accessibility, and palette construction.*

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

<color_principles>
Always apply these — do not consult a reference, just do them:

- Use OKLCH, not HSL. OKLCH is perceptually uniform: equal steps in lightness *look* equal, which HSL does not deliver. As you move toward white or black, REDUCE chroma — high chroma at extreme lightness looks garish. A light blue at 85% lightness wants ~0.08 chroma, not the 0.15 of your base color.
- Tint your neutrals toward your brand hue. Even a chroma of 0.005-0.01 is perceptible and creates subconscious cohesion between brand color and UI surfaces. The hue you tint toward should come from THIS brand, not from a "warm = friendly" or "cool = tech" formula. Pick the brand's actual hue first, then tint everything toward it.
- The 60-30-10 rule is about visual *weight*, not pixel count. 60% neutral / surface, 30% secondary text and borders, 10% accent. Accents work BECAUSE they're rare. Overuse kills their power.
</color_principles>

<theme_selection>
Theme (light vs dark) should be DERIVED from audience and viewing context, not picked from a default. Read the brief and ask: when is this product used, by whom, in what physical setting?

- A perp DEX consumed during fast trading sessions → dark
- A hospital portal consumed by anxious patients on phones late at night → light
- A children's reading app → light
- A vintage motorcycle forum where users sit in their garage at 9pm → dark
- An observability dashboard for SREs in a dark office → dark
- A wedding planning checklist for couples on a Sunday morning → light
- A music player app for headphone listening at night → dark
- A food magazine homepage browsed during a coffee break → light

Do not default everything to light "to play it safe." Do not default everything to dark "to look cool." Both defaults are the lazy reflex. The correct theme is the one the actual user wants in their actual context.
</theme_selection>

<color_rules>
DO use modern CSS color functions (oklch, color-mix, light-dark) for perceptually uniform, maintainable palettes.
DO tint your neutrals toward your brand hue. Even a subtle hint creates subconscious cohesion.

DO NOT use gray text on colored backgrounds; it looks washed out. Use a shade of the background color instead.
DO NOT use pure black (#000) or pure white (#fff). Always tint; pure black/white never appears in nature.
DO NOT use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds.
DO NOT use gradient text for impact — see <absolute_bans> below for the strict definition. Solid colors only for text.
DO NOT default to dark mode with glowing accents. It looks "cool" without requiring actual design decisions.
DO NOT default to light mode "to be safe" either. The point is to choose, not to retreat to a safe option.
</color_rules>

### Layout & Space
→ *Consult [spatial reference](reference/spatial-design.md) for the deeper material on grids, container queries, and optical adjustments.*

Create visual rhythm through varied spacing, not the same padding everywhere. Embrace asymmetry and unexpected compositions. Break the grid intentionally for emphasis.

<spatial_principles>
Always apply these — do not consult a reference, just do them:

- Use a 4pt spacing scale with semantic token names (`--space-sm`, `--space-md`), not pixel-named (`--spacing-8`). Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96. 8pt is too coarse — you'll often want 12px between two values.
- Use `gap` instead of margins for sibling spacing. It eliminates margin collapse and the cleanup hacks that come with it.
- Vary spacing for hierarchy. A heading with extra space above it reads as more important — make use of that. Don't apply the same padding everywhere.
- Self-adjusting grid pattern: `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` is the breakpoint-free responsive grid for card-style content.
- Container queries are for components, viewport queries are for page layout. A card in a sidebar should adapt to the sidebar's width, not the viewport's.
</spatial_principles>

<spatial_rules>
DO create visual rhythm through varied spacing: tight groupings, generous separations.
DO use fluid spacing with clamp() that breathes on larger screens.
DO use asymmetry and unexpected compositions; break the grid intentionally for emphasis.

DO NOT wrap everything in cards. Not everything needs a container.
DO NOT nest cards inside cards. Visual noise; flatten the hierarchy.
DO NOT use identical card grids (same-sized cards with icon + heading + text, repeated endlessly).
DO NOT use the hero metric layout template (big number, small label, supporting stats, gradient accent).
DO NOT center everything. Left-aligned text with asymmetric layouts feels more designed.
DO NOT use the same spacing everywhere. Without rhythm, layouts feel monotonous.
DO NOT let body text wrap beyond ~80 characters per line. Add a max-width like 65–75ch so the eye can track easily.
</spatial_rules>

### Visual Details

<absolute_bans>
These CSS patterns are NEVER acceptable. They are the most recognizable AI design tells. Match-and-refuse: if you find yourself about to write any of these, stop and rewrite the element with a different structure entirely.

BAN 1: Side-stripe borders on cards/list items/callouts/alerts
  - PATTERN: `border-left:` or `border-right:` with width greater than 1px
  - INCLUDES: hard-coded colors AND CSS variables
  - FORBIDDEN: `border-left: 3px solid red`, `border-left: 4px solid #ff0000`, `border-left: 4px solid var(--color-warning)`, `border-left: 5px solid oklch(...)`, etc.
  - WHY: this is the single most overused "design touch" in admin, dashboard, and medical UIs. It never looks intentional regardless of color, radius, opacity, or whether the variable name is "primary" or "warning" or "accent."
  - REWRITE: use a different element structure entirely. Do not just swap to box-shadow inset. Reach for full borders, background tints, leading numbers/icons, or no visual indicator at all.

BAN 2: Gradient text
  - PATTERN: `background-clip: text` (or `-webkit-background-clip: text`) combined with a gradient background
  - FORBIDDEN: any combination that makes text fill come from a `linear-gradient`, `radial-gradient`, or `conic-gradient`
  - WHY: gradient text is decorative rather than meaningful and is one of the top three AI design tells
  - REWRITE: use a single solid color for text. If you want emphasis, use weight or size, not gradient fill.
</absolute_bans>

DO: Use intentional, purposeful decorative elements that reinforce brand.
DO NOT: Use border-left or border-right greater than 1px as a colored accent stripe on cards, list items, callouts, or alerts. See <absolute_bans> above for the strict CSS pattern.
DO NOT: Use glassmorphism everywhere (blur effects, glass cards, glow borders used decoratively rather than purposefully).
DO NOT: Use sparklines as decoration. Tiny charts that look sophisticated but convey nothing meaningful.
DO NOT: Use rounded rectangles with generic drop shadows. Safe, forgettable, could be any AI output.
DO NOT: Use modals unless there's truly no better alternative. Modals are lazy.

### Motion
→ *Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion.*

Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.

**DO**: Use motion to convey state changes: entrances, exits, feedback
**DO**: Use exponential easing (ease-out-quart/quint/expo) for natural deceleration
**DO**: For height animations, use grid-template-rows transitions instead of animating height directly
**DON'T**: Animate layout properties (width, height, padding, margin). Use transform and opacity only
**DON'T**: Use bounce or elastic easing. They feel dated and tacky; real objects decelerate smoothly

### Interaction
→ *Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns.*

Make interactions feel fast. Use optimistic UI: update immediately, sync later.

**DO**: Use progressive disclosure. Start simple, reveal sophistication through interaction (basic options first, advanced behind expandable sections; hover states that reveal secondary actions)
**DO**: Design empty states that teach the interface, not just say "nothing here"
**DO**: Make every interactive surface feel intentional and responsive
**DON'T**: Repeat the same information (redundant headers, intros that restate the heading)
**DON'T**: Make every button primary. Use ghost buttons, text links, secondary styles; hierarchy matters

### Responsive
→ *Consult [responsive reference](reference/responsive-design.md) for mobile-first, fluid design, and container queries.*

**DO**: Use container queries (@container) for component-level responsiveness
**DO**: Adapt the interface for different contexts, not just shrink it
**DON'T**: Hide critical functionality on mobile. Adapt the interface, don't amputate it

### UX Writing
→ *Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states.*

**DO**: Make every word earn its place
**DON'T**: Repeat information users can already see

---

## The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which AI made this?"

Review the DON'T guidelines above. They are the fingerprints of AI-generated work from 2024-2025.

---

## Implementation Principles

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices across generations.

Remember: Claude is capable of extraordinary creative work. Don't hold back. Show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

---

## Craft Mode

If this skill is invoked with the argument "craft" (e.g., `/impeccable craft [feature description]`), follow the [craft flow](reference/craft.md). Pass any additional arguments as the feature description.

---

## Teach Mode

If this skill is invoked with the argument "teach" (e.g., `/impeccable teach`), skip all design work above and instead run the teach flow below. This is a one-time setup that gathers design context for the project.

### Step 1: Explore the Codebase

Before asking questions, thoroughly scan the project to discover what you can:

- **README and docs**: Project purpose, target audience, any stated goals
- **Package.json / config files**: Tech stack, dependencies, existing design libraries
- **Existing components**: Current design patterns, spacing, typography in use
- **Brand assets**: Logos, favicons, color values already defined
- **Design tokens / CSS variables**: Existing color palettes, font stacks, spacing scales
- **Any style guides or brand documentation**

Note what you've learned and what remains unclear.

### Step 2: Ask UX-Focused Questions

STOP and call the AskUserQuestion tool to clarify. Focus only on what you couldn't infer from the codebase:

#### Users & Purpose
- Who uses this? What's their context when using it?
- What job are they trying to get done?
- What emotions should the interface evoke? (confidence, delight, calm, urgency, etc.)

#### Brand & Personality
- How would you describe the brand personality in 3 words?
- Any reference sites or apps that capture the right feel? What specifically about them?
- What should this explicitly NOT look like? Any anti-references?

#### Aesthetic Preferences
- Any strong preferences for visual direction? (minimal, bold, elegant, playful, technical, organic, etc.)
- Light mode, dark mode, or both?
- Any colors that must be used or avoided?

#### Accessibility & Inclusion
- Specific accessibility requirements? (WCAG level, known user needs)
- Considerations for reduced motion, color blindness, or other accommodations?

Skip questions where the answer is already clear from the codebase exploration.

### Step 3: Write Design Context

Synthesize your findings and the user's answers into a `## Design Context` section:

```markdown
## Design Context

### Users
[Who they are, their context, the job to be done]

### Brand Personality
[Voice, tone, 3-word personality, emotional goals]

### Aesthetic Direction
[Visual tone, references, anti-references, theme]

### Design Principles
[3-5 principles derived from the conversation that should guide all design decisions]
```

Write this section to `.impeccable.md` in the project root. If the file already exists, update the Design Context section in place.

Then STOP and call the AskUserQuestion tool to clarify. whether they'd also like the Design Context appended to CLAUDE.md. If yes, append or update the section there as well.

Confirm completion and summarize the key design principles that will now guide all future work.

---

## Extract Mode

If this skill is invoked with the argument "extract" (e.g., `/impeccable extract [target]`), follow the [extract flow](reference/extract.md). Pass any additional arguments as the extraction target.

---

## Sub-Skills

The following sections contain the full instructions for each companion skill. When the user invokes `/[skill-name]` or the context clearly calls for a specific skill, read and follow the corresponding section below.


---

### /shape

> Plan the UX and UI for a feature before writing code. Runs a structured discovery interview, then produces a design brie...

## MANDATORY PREPARATION

Invoke /impeccable, which contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding. If no design context exists yet, you MUST run /impeccable teach first.

---

Shape the UX and UI for a feature before any code is written. This skill produces a **design brief**: a structured artifact that guides implementation through discovery, not guesswork.

**Scope**: Design planning only. This skill does NOT write code. It produces the thinking that makes code good.

**Output**: A design brief that can be handed off to /impeccable craft, /impeccable, or any other implementation skill.

## Philosophy

Most AI-generated UIs fail not because of bad code, but because of skipped thinking. They jump to "here's a card grid" without asking "what is the user trying to accomplish?" This skill inverts that: understand deeply first, so implementation is precise.

## Phase 1: Discovery Interview

**Do NOT write any code or make any design decisions during this phase.** Your only job is to understand the feature deeply enough to make excellent design decisions later.

Ask these questions in conversation, adapting based on answers. Don't dump them all at once; have a natural dialogue. STOP and call the AskUserQuestion tool to clarify.

### Purpose & Context
- What is this feature for? What problem does it solve?
- Who specifically will use it? (Not "users"; be specific: role, context, frequency)
- What does success look like? How will you know this feature is working?
- What's the user's state of mind when they reach this feature? (Rushed? Exploring? Anxious? Focused?)

### Content & Data
- What content or data does this feature display or collect?
- What are the realistic ranges? (Minimum, typical, maximum, e.g., 0 items, 5 items, 500 items)
- What are the edge cases? (Empty state, error state, first-time use, power user)
- Is any content dynamic? What changes and how often?

### Design Goals
- What's the single most important thing a user should do or understand here?
- What should this feel like? (Fast/efficient? Calm/trustworthy? Fun/playful? Premium/refined?)
- Are there existing patterns in the product this should be consistent with?
- Are there specific examples (inside or outside the product) that capture what you're going for?

### Constraints
- Are there technical constraints? (Framework, performance budget, browser support)
- Are there content constraints? (Localization, dynamic text length, user-generated content)
- Mobile/responsive requirements?
- Accessibility requirements beyond WCAG AA?

### Anti-Goals
- What should this NOT be? What would be a wrong direction?
- What's the biggest risk of getting this wrong?

## Phase 2: Design Brief

After the interview, synthesize everything into a structured design brief. Present it to the user for confirmation before considering this skill complete.

### Brief Structure

**1. Feature Summary** (2-3 sentences)
What this is, who it's for, what it needs to accomplish.

**2. Primary User Action**
The single most important thing a user should do or understand here.

**3. Design Direction**
How this should feel. What aesthetic approach fits. Reference the project's design context from `.impeccable.md` and explain how this feature should express it.

**4. Layout Strategy**
High-level spatial approach: what gets emphasis, what's secondary, how information flows. Describe the visual hierarchy and rhythm, not specific CSS.

**5. Key States**
List every state the feature needs: default, empty, loading, error, success, edge cases. For each, note what the user needs to see and feel.

**6. Interaction Model**
How users interact with this feature. What happens on click, hover, scroll? What feedback do they get? What's the flow from entry to completion?

**7. Content Requirements**
What copy, labels, empty state messages, error messages, and microcopy are needed. Note any dynamic content and its realistic ranges.

**8. Recommended References**
Based on the brief, list which impeccable reference files would be most valuable during implementation (e.g., spatial-design.md for complex layouts, motion-design.md for animated features, interaction-design.md for form-heavy features).

**9. Open Questions**
Anything unresolved that the implementer should resolve during build.

---

STOP and call the AskUserQuestion tool to clarify. Get explicit confirmation of the brief before finishing. If the user disagrees with any part, revisit the relevant discovery questions.

Once confirmed, the brief is complete. The user can now hand it to /impeccable, or use it to guide any other implementation approach. (If the user wants the full discovery-then-build flow in one step, they should use /impeccable craft instead, which runs this skill internally.)

---

### /critique

> Evaluate design from a UX perspective, assessing visual hierarchy, information architecture, emotional resonance, cognit...

## STEPS

### Step 1: Preparation

Invoke /impeccable, which contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding. If no design context exists yet, you MUST run /impeccable teach first. Additionally gather: what the interface is trying to accomplish.

### Step 2: Gather Assessments

Launch two independent assessments. **Neither must see the other's output** to avoid bias.

You SHOULD delegate each assessment to a separate sub-agent for independence. Use your environment's agent spawning mechanism (e.g., Claude Code's `Agent` tool, or Codex's subagent spawning). Sub-agents should return their findings as structured text. Do NOT output findings to the user yet.

If sub-agents are not available in the current environment, complete each assessment sequentially, writing findings to internal notes before proceeding.

**Tab isolation**: When browser automation is available, each assessment MUST create its own new tab. Never reuse an existing tab, even if one is already open at the correct URL. This prevents the two assessments from interfering with each other's page state.

#### Assessment A: LLM Design Review

Read the relevant source files (HTML, CSS, JS/TS) and, if browser automation is available, visually inspect the live page. **Create a new tab** for this; do not reuse existing tabs. After navigation, label the tab by setting the document title:
```javascript
document.title = '[LLM] ' + document.title;
```
Think like a design director. Evaluate:

**AI Slop Detection (CRITICAL)**: Does this look like every other AI-generated interface? Review against ALL **DON'T** guidelines in the impeccable skill. Check for AI color palette, gradient text, dark glows, glassmorphism, hero metric layouts, identical card grids, generic fonts, and all other tells. **The test**: If someone said "AI made this," would you believe them immediately?

**Holistic Design Review**: visual hierarchy (eye flow, primary action clarity), information architecture (structure, grouping, cognitive load), emotional resonance (does it match brand and audience?), discoverability (are interactive elements obvious?), composition (balance, whitespace, rhythm), typography (hierarchy, readability, font choices), color (purposeful use, cohesion, accessibility), states & edge cases (empty, loading, error, success), microcopy (clarity, tone, helpfulness).

**Cognitive Load** (consult [cognitive-load](reference/cognitive-load.md)):
- Run the 8-item cognitive load checklist. Report failure count: 0-1 = low (good), 2-3 = moderate, 4+ = critical.
- Count visible options at each decision point. If >4, flag it.
- Check for progressive disclosure: is complexity revealed only when needed?

**Emotional Journey**:
- What emotion does this interface evoke? Is that intentional?
- **Peak-end rule**: Is the most intense moment positive? Does the experience end well?
- **Emotional valleys**: Check for anxiety spikes at high-stakes moments (payment, delete, commit). Are there design interventions (progress indicators, reassurance copy, undo options)?

**Nielsen's Heuristics** (consult [heuristics-scoring](reference/heuristics-scoring.md)):
Score each of the 10 heuristics 0-4. This scoring will be presented in the report.

Return structured findings covering: AI slop verdict, heuristic scores, cognitive load assessment, what's working (2-3 items), priority issues (3-5 with what/why/fix), minor observations, and provocative questions.

#### Assessment B: Automated Detection

Run the bundled deterministic detector, which flags 25 specific patterns (AI slop tells + general design quality).

**CLI scan**:
```bash
npx impeccable --json [--fast] [target]
```

- Pass HTML/JSX/TSX/Vue/Svelte files or directories as `[target]` (anything with markup). Do not pass CSS-only files.
- For URLs, skip the CLI scan (it requires Puppeteer). Use browser visualization instead.
- For large directories (200+ scannable files), use `--fast` (regex-only, skips jsdom)
- For 500+ files, narrow scope or ask the user
- Exit code 0 = clean, 2 = findings

**Browser visualization** (when browser automation tools are available AND the target is a viewable page):

The overlay is a **visual aid for the user**. It highlights issues directly in their browser. Do NOT scroll through the page to screenshot overlays. Instead, read the console output to get the results programmatically.

1. **Start the live detection server**:
   ```bash
   npx impeccable live &
   ```
   Note the port printed to stdout (auto-assigned). Use `--port=PORT` to fix it.
2. **Create a new tab** and navigate to the page (use dev server URL for local files, or direct URL). Do not reuse existing tabs.
3. **Label the tab** via `javascript_tool` so the user can distinguish it:
   ```javascript
   document.title = '[Human] ' + document.title;
   ```
4. **Scroll to top** to ensure the page is scrolled to the very top before injection
5. **Inject** via `javascript_tool` (replace PORT with the port from step 1):
   ```javascript
   const s = document.createElement('script'); s.src = 'http://localhost:PORT/detect.js'; document.head.appendChild(s);
   ```
6. Wait 2-3 seconds for the detector to render overlays
7. **Read results from console** using `read_console_messages` with pattern `impeccable`. The detector logs all findings with the `[impeccable]` prefix. Do NOT scroll through the page to take screenshots of the overlays.
8. **Cleanup**: Stop the live server when done:
   ```bash
   npx impeccable live stop
   ```

For multi-view targets, inject on 3-5 representative pages. If injection fails, continue with CLI results only.

Return: CLI findings (JSON), browser console findings (if applicable), and any false positives noted.

### Step 3: Generate Combined Critique Report

Synthesize both assessments into a single report. Do NOT simply concatenate. Weave the findings together, noting where the LLM review and detector agree, where the detector caught issues the LLM missed, and where detector findings are false positives.

Structure your feedback as a design director would:

#### Design Health Score
> *Consult [heuristics-scoring](reference/heuristics-scoring.md)*

Present the Nielsen's 10 heuristics scores as a table:

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | ? | [specific finding or "n/a" if solid] |
| 2 | Match System / Real World | ? | |
| 3 | User Control and Freedom | ? | |
| 4 | Consistency and Standards | ? | |
| 5 | Error Prevention | ? | |
| 6 | Recognition Rather Than Recall | ? | |
| 7 | Flexibility and Efficiency | ? | |
| 8 | Aesthetic and Minimalist Design | ? | |
| 9 | Error Recovery | ? | |
| 10 | Help and Documentation | ? | |
| **Total** | | **??/40** | **[Rating band]** |

Be honest with scores. A 4 means genuinely excellent. Most real interfaces score 20-32.

#### Anti-Patterns Verdict

**Start here.** Does this look AI-generated?

**LLM assessment**: Your own evaluation of AI slop tells. Cover overall aesthetic feel, layout sameness, generic composition, missed opportunities for personality.

**Deterministic scan**: Summarize what the automated detector found, with counts and file locations. Note any additional issues the detector caught that you missed, and flag any false positives.

**Visual overlays** (if browser was used): Tell the user that overlays are now visible in the **[Human]** tab in their browser, highlighting the detected issues. Summarize what the console output reported.

#### Overall Impression
A brief gut reaction: what works, what doesn't, and the single biggest opportunity.

#### What's Working
Highlight 2-3 things done well. Be specific about why they work.

#### Priority Issues
The 3-5 most impactful design problems, ordered by importance.

For each issue, tag with **P0-P3 severity** (consult [heuristics-scoring](reference/heuristics-scoring.md) for severity definitions):
- **[P?] What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: What to do about it (be concrete)
- **Suggested command**: Which command could address this (from: /polish, /typeset, /colorize, /quieter, /critique, /overdrive, /clarify, /bolder, /audit, /distill, /harden, /layout, /shape, /animate, /optimize, /adapt, /delight)

#### Persona Red Flags
> *Consult [personas](reference/personas.md)*

Auto-select 2-3 personas most relevant to this interface type (use the selection table in the reference). If `CLAUDE.md` contains a `## Design Context` section from `impeccable teach`, also generate 1-2 project-specific personas from the audience/brand info.

For each selected persona, walk through the primary user action and list specific red flags found:

**Alex (Power User)**: No keyboard shortcuts detected. Form requires 8 clicks for primary action. Forced modal onboarding. High abandonment risk.

**Jordan (First-Timer)**: Icon-only nav in sidebar. Technical jargon in error messages ("404 Not Found"). No visible help. Will abandon at step 2.

Be specific. Name the exact elements and interactions that fail each persona. Don't write generic persona descriptions; write what broke for them.

#### Minor Observations
Quick notes on smaller issues worth addressing.

#### Questions to Consider
Provocative questions that might unlock better solutions:
- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a confident version of this look like?"

**Remember**:
- Be direct. Vague feedback wastes everyone's time.
- Be specific. "The submit button," not "some elements."
- Say what's wrong AND why it matters to users.
- Give concrete suggestions, not just "consider exploring..."
- Prioritize ruthlessly. If everything is important, nothing is.
- Don't soften criticism. Developers need honest feedback to ship great design.

### Step 4: Ask the User

**After presenting findings**, use targeted questions based on what was actually found. STOP and call the AskUserQuestion tool to clarify. These answers will shape the action plan.

Ask questions along these lines (adapt to the specific findings; do NOT ask generic questions):

1. **Priority direction**: Based on the issues found, ask which category matters most to the user right now. For example: "I found problems with visual hierarchy, color usage, and information overload. Which area should we tackle first?" Offer the top 2-3 issue categories as options.

2. **Design intent**: If the critique found a tonal mismatch, ask whether it was intentional. For example: "The interface feels clinical and corporate. Is that the intended tone, or should it feel warmer/bolder/more playful?" Offer 2-3 tonal directions as options based on what would fix the issues found.

3. **Scope**: Ask how much the user wants to take on. For example: "I found N issues. Want to address everything, or focus on the top 3?" Offer scope options like "Top 3 only", "All issues", "Critical issues only".

4. **Constraints** (optional; only ask if relevant): If the findings touch many areas, ask if anything is off-limits. For example: "Should any sections stay as-is?" This prevents the plan from touching things the user considers done.

**Rules for questions**:
- Every question must reference specific findings from the report. Never ask generic "who is your audience?" questions.
- Keep it to 2-4 questions maximum. Respect the user's time.
- Offer concrete options, not open-ended prompts.
- If findings are straightforward (e.g., only 1-2 clear issues), skip questions and go directly to Step 5.

### Step 5: Recommended Actions

**After receiving the user's answers**, present a prioritized action summary reflecting the user's priorities and scope from Step 4.

#### Action Summary

List recommended commands in priority order, based on the user's answers:

1. **`/command-name`**: Brief description of what to fix (specific context from critique findings)
2. **`/command-name`**: Brief description (specific context)
...

**Rules for recommendations**:
- Only recommend commands from: /polish, /typeset, /colorize, /quieter, /critique, /overdrive, /clarify, /bolder, /audit, /distill, /harden, /layout, /shape, /animate, /optimize, /adapt, /delight
- Order by the user's stated priorities first, then by impact
- Each item's description should carry enough context that the command knows what to focus on
- Map each Priority Issue to the appropriate command
- Skip commands that would address zero issues
- If the user chose a limited scope, only include items within that scope
- If the user marked areas as off-limits, exclude commands that would touch those areas
- End with `/polish` as the final step if any fixes were recommended

After presenting the summary, tell the user:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/critique` after fixes to see your score improve.

---

### /audit

> Run technical quality checks across accessibility, performance, theming, responsive design, and anti-patterns. Generates...

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

Run systematic **technical** quality checks and generate a comprehensive report. Don't fix issues — document them for other commands to address.

This is a code-level audit, not a design critique. Check what's measurable and verifiable in the implementation.

## Diagnostic Scan

Run comprehensive checks across 5 dimensions. Score each dimension 0-4 using the criteria below.

### 1. Accessibility (A11y)

**Check for**:
- **Contrast issues**: Text contrast ratios < 4.5:1 (or 7:1 for AAA)
- **Missing ARIA**: Interactive elements without proper roles, labels, or states
- **Keyboard navigation**: Missing focus indicators, illogical tab order, keyboard traps
- **Semantic HTML**: Improper heading hierarchy, missing landmarks, divs instead of buttons
- **Alt text**: Missing or poor image descriptions
- **Form issues**: Inputs without labels, poor error messaging, missing required indicators

**Score 0-4**: 0=Inaccessible (fails WCAG A), 1=Major gaps (few ARIA labels, no keyboard nav), 2=Partial (some a11y effort, significant gaps), 3=Good (WCAG AA mostly met, minor gaps), 4=Excellent (WCAG AA fully met, approaches AAA)

### 2. Performance

**Check for**:
- **Layout thrashing**: Reading/writing layout properties in loops
- **Expensive animations**: Animating layout properties (width, height, top, left) instead of transform/opacity
- **Missing optimization**: Images without lazy loading, unoptimized assets, missing will-change
- **Bundle size**: Unnecessary imports, unused dependencies
- **Render performance**: Unnecessary re-renders, missing memoization

**Score 0-4**: 0=Severe issues (layout thrash, unoptimized everything), 1=Major problems (no lazy loading, expensive animations), 2=Partial (some optimization, gaps remain), 3=Good (mostly optimized, minor improvements possible), 4=Excellent (fast, lean, well-optimized)

### 3. Theming

**Check for**:
- **Hard-coded colors**: Colors not using design tokens
- **Broken dark mode**: Missing dark mode variants, poor contrast in dark theme
- **Inconsistent tokens**: Using wrong tokens, mixing token types
- **Theme switching issues**: Values that don't update on theme change

**Score 0-4**: 0=No theming (hard-coded everything), 1=Minimal tokens (mostly hard-coded), 2=Partial (tokens exist but inconsistently used), 3=Good (tokens used, minor hard-coded values), 4=Excellent (full token system, dark mode works perfectly)

### 4. Responsive Design

**Check for**:
- **Fixed widths**: Hard-coded widths that break on mobile
- **Touch targets**: Interactive elements < 44x44px
- **Horizontal scroll**: Content overflow on narrow viewports
- **Text scaling**: Layouts that break when text size increases
- **Missing breakpoints**: No mobile/tablet variants

**Score 0-4**: 0=Desktop-only (breaks on mobile), 1=Major issues (some breakpoints, many failures), 2=Partial (works on mobile, rough edges), 3=Good (responsive, minor touch target or overflow issues), 4=Excellent (fluid, all viewports, proper touch targets)

### 5. Anti-Patterns (CRITICAL)

Check against ALL the **DON'T** guidelines in the impeccable skill. Look for AI slop tells (AI color palette, gradient text, glassmorphism, hero metrics, card grids, generic fonts) and general design anti-patterns (gray on color, nested cards, bounce easing, redundant copy).

**Score 0-4**: 0=AI slop gallery (5+ tells), 1=Heavy AI aesthetic (3-4 tells), 2=Some tells (1-2 noticeable), 3=Mostly clean (subtle issues only), 4=No AI tells (distinctive, intentional design)

## Generate Report

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | ? | [most critical a11y issue or "--"] |
| 2 | Performance | ? | |
| 3 | Responsive Design | ? | |
| 4 | Theming | ? | |
| 5 | Anti-Patterns | ? | |
| **Total** | | **??/20** | **[Rating band]** |

**Rating bands**: 18-20 Excellent (minor polish), 14-17 Good (address weak dimensions), 10-13 Acceptable (significant work needed), 6-9 Poor (major overhaul), 0-5 Critical (fundamental issues)

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells. Be brutally honest.

### Executive Summary
- Audit Health Score: **??/20** ([rating band])
- Total issues found (count by severity: P0/P1/P2/P3)
- Top 3-5 critical issues
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with **P0-P3 severity**:
- **P0 Blocking**: Prevents task completion — fix immediately
- **P1 Major**: Significant difficulty or WCAG AA violation — fix before release
- **P2 Minor**: Annoyance, workaround exists — fix in next pass
- **P3 Polish**: Nice-to-fix, no real user impact — fix if time permits

For each issue, document:
- **[P?] Issue name**
- **Location**: Component, file, line
- **Category**: Accessibility / Performance / Theming / Responsive / Anti-Pattern
- **Impact**: How it affects users
- **WCAG/Standard**: Which standard it violates (if applicable)
- **Recommendation**: How to fix it
- **Suggested command**: Which command to use (prefer: /polish, /typeset, /colorize, /quieter, /critique, /overdrive, /clarify, /bolder, /audit, /distill, /harden, /layout, /shape, /animate, /optimize, /adapt, /delight)

### Patterns & Systemic Issues

Identify recurring problems that indicate systemic gaps rather than one-off mistakes:
- "Hard-coded colors appear in 15+ components, should use design tokens"
- "Touch targets consistently too small (<44px) throughout mobile experience"

### Positive Findings

Note what's working well — good practices to maintain and replicate.

## Recommended Actions

List recommended commands in priority order (P0 first, then P1, then P2):

1. **[P?] `/command-name`** — Brief description (specific context from audit findings)
2. **[P?] `/command-name`** — Brief description (specific context)

**Rules**: Only recommend commands from: /polish, /typeset, /colorize, /quieter, /critique, /overdrive, /clarify, /bolder, /audit, /distill, /harden, /layout, /shape, /animate, /optimize, /adapt, /delight. Map findings to the most appropriate command. End with `/polish` as the final step if any fixes were recommended.

After presenting the summary, tell the user:

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/audit` after fixes to see your score improve.

**IMPORTANT**: Be thorough but actionable. Too many P3 issues creates noise. Focus on what actually matters.

**NEVER**:
- Report issues without explaining impact (why does this matter?)
- Provide generic recommendations (be specific and actionable)
- Skip positive findings (celebrate what works)
- Forget to prioritize (everything can't be P0)
- Report false positives without verification

Remember: You're a technical quality auditor. Document systematically, prioritize ruthlessly, cite specific code locations, and provide clear paths to improvement.

---

### /harden

> Make interfaces production-ready: error handling, empty states, onboarding flows, i18n, text overflow, and edge case man...

Strengthen interfaces against edge cases, errors, internationalization issues, and real-world usage scenarios that break idealized designs.

## Assess Hardening Needs

Identify weaknesses and edge cases:

1. **Test with extreme inputs**:
   - Very long text (names, descriptions, titles)
   - Very short text (empty, single character)
   - Special characters (emoji, RTL text, accents)
   - Large numbers (millions, billions)
   - Many items (1000+ list items, 50+ options)
   - No data (empty states)

2. **Test error scenarios**:
   - Network failures (offline, slow, timeout)
   - API errors (400, 401, 403, 404, 500)
   - Validation errors
   - Permission errors
   - Rate limiting
   - Concurrent operations

3. **Test internationalization**:
   - Long translations (German is often 30% longer than English)
   - RTL languages (Arabic, Hebrew)
   - Character sets (Chinese, Japanese, Korean, emoji)
   - Date/time formats
   - Number formats (1,000 vs 1.000)
   - Currency symbols

**CRITICAL**: Designs that only work with perfect data aren't production-ready. Harden against reality.

## Hardening Dimensions

Systematically improve resilience:

### Text Overflow & Wrapping

**Long text handling**:
```css
/* Single line with ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line with clamp */
.line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Allow wrapping */
.wrap {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
```

**Flex/Grid overflow**:
```css
/* Prevent flex items from overflowing */
.flex-item {
  min-width: 0; /* Allow shrinking below content size */
  overflow: hidden;
}

/* Prevent grid items from overflowing */
.grid-item {
  min-width: 0;
  min-height: 0;
}
```

**Responsive text sizing**:
- Use `clamp()` for fluid typography
- Set minimum readable sizes (14px on mobile)
- Test text scaling (zoom to 200%)
- Ensure containers expand with text

### Internationalization (i18n)

**Text expansion**:
- Add 30-40% space budget for translations
- Use flexbox/grid that adapts to content
- Test with longest language (usually German)
- Avoid fixed widths on text containers

```jsx
// ❌ Bad: Assumes short English text
<button className="w-24">Submit</button>

// ✅ Good: Adapts to content
<button className="px-4 py-2">Submit</button>
```

**RTL (Right-to-Left) support**:
```css
/* Use logical properties */
margin-inline-start: 1rem; /* Not margin-left */
padding-inline: 1rem; /* Not padding-left/right */
border-inline-end: 1px solid; /* Not border-right */

/* Or use dir attribute */
[dir="rtl"] .arrow { transform: scaleX(-1); }
```

**Character set support**:
- Use UTF-8 encoding everywhere
- Test with Chinese/Japanese/Korean (CJK) characters
- Test with emoji (they can be 2-4 bytes)
- Handle different scripts (Latin, Cyrillic, Arabic, etc.)

**Date/Time formatting**:
```javascript
// ✅ Use Intl API for proper formatting
new Intl.DateTimeFormat('en-US').format(date); // 1/15/2024
new Intl.DateTimeFormat('de-DE').format(date); // 15.1.2024

new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD' 
}).format(1234.56); // $1,234.56
```

**Pluralization**:
```javascript
// ❌ Bad: Assumes English pluralization
`${count} item${count !== 1 ? 's' : ''}`

// ✅ Good: Use proper i18n library
t('items', { count }) // Handles complex plural rules
```

### Error Handling

**Network errors**:
- Show clear error messages
- Provide retry button
- Explain what happened
- Offer offline mode (if applicable)
- Handle timeout scenarios

```jsx
// Error states with recovery
{error && (
  <ErrorMessage>
    <p>Failed to load data. {error.message}</p>
    <button onClick={retry}>Try again</button>
  </ErrorMessage>
)}
```

**Form validation errors**:
- Inline errors near fields
- Clear, specific messages
- Suggest corrections
- Don't block submission unnecessarily
- Preserve user input on error

**API errors**:
- Handle each status code appropriately
  - 400: Show validation errors
  - 401: Redirect to login
  - 403: Show permission error
  - 404: Show not found state
  - 429: Show rate limit message
  - 500: Show generic error, offer support

**Graceful degradation**:
- Core functionality works without JavaScript
- Images have alt text
- Progressive enhancement
- Fallbacks for unsupported features

### Edge Cases & Boundary Conditions

**Empty states**:
- No items in list
- No search results
- No notifications
- No data to display
- Provide clear next action

**Loading states**:
- Initial load
- Pagination load
- Refresh
- Show what's loading ("Loading your projects...")
- Time estimates for long operations

**Large datasets**:
- Pagination or virtual scrolling
- Search/filter capabilities
- Performance optimization
- Don't load all 10,000 items at once

**Concurrent operations**:
- Prevent double-submission (disable button while loading)
- Handle race conditions
- Optimistic updates with rollback
- Conflict resolution

**Permission states**:
- No permission to view
- No permission to edit
- Read-only mode
- Clear explanation of why

**Browser compatibility**:
- Polyfills for modern features
- Fallbacks for unsupported CSS
- Feature detection (not browser detection)
- Test in target browsers

### Onboarding & First-Run Experience

Production-ready features work for first-time users, not just power users. Design the paths that get new users to value:

**Empty states**: Every zero-data screen needs:
- What will appear here (description or illustration)
- Why it matters to the user
- Clear CTA to create the first item or start from a template
- Visual interest (not just blank space with "No items yet")

Empty state types to handle:
- **First use**: emphasize value, provide templates
- **User cleared**: light touch, easy to recreate
- **No results**: suggest a different query, offer to clear filters
- **No permissions**: explain why, how to get access

**First-run experience**: Get users to their "aha moment" as quickly as possible.
- Show, don't tell -- working examples over descriptions
- Progressive disclosure -- teach one thing at a time, not everything upfront
- Make onboarding optional -- let experienced users skip
- Provide smart defaults so required setup is minimal

**Feature discovery**: Teach features when users need them, not upfront.
- Contextual tooltips at point of use (brief, dismissable, one-time)
- Badges or indicators on new or unused features
- Celebrate activation events quietly (a toast, not a modal)

**NEVER**:
- Force long onboarding before users can touch the product
- Show the same tooltip repeatedly (track and respect dismissals)
- Block the entire UI during a guided tour
- Create separate tutorial modes disconnected from the real product
- Design empty states that just say "No items" with no next action

### Input Validation & Sanitization

**Client-side validation**:
- Required fields
- Format validation (email, phone, URL)
- Length limits
- Pattern matching
- Custom validation rules

**Server-side validation** (always):
- Never trust client-side only
- Validate and sanitize all inputs
- Protect against injection attacks
- Rate limiting

**Constraint handling**:
```html
<!-- Set clear constraints -->
<input 
  type="text"
  maxlength="100"
  pattern="[A-Za-z0-9]+"
  required
  aria-describedby="username-hint"
/>
<small id="username-hint">
  Letters and numbers only, up to 100 characters
</small>
```

### Accessibility Resilience

**Keyboard navigation**:
- All functionality accessible via keyboard
- Logical tab order
- Focus management in modals
- Skip links for long content

**Screen reader support**:
- Proper ARIA labels
- Announce dynamic changes (live regions)
- Descriptive alt text
- Semantic HTML

**Motion sensitivity**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**High contrast mode**:
- Test in Windows high contrast mode
- Don't rely only on color
- Provide alternative visual cues

### Performance Resilience

**Slow connections**:
- Progressive image loading
- Skeleton screens
- Optimistic UI updates
- Offline support (service workers)

**Memory leaks**:
- Clean up event listeners
- Cancel subscriptions
- Clear timers/intervals
- Abort pending requests on unmount

**Throttling & Debouncing**:
```javascript
// Debounce search input
const debouncedSearch = debounce(handleSearch, 300);

// Throttle scroll handler
const throttledScroll = throttle(handleScroll, 100);
```

## Testing Strategies

**Manual testing**:
- Test with extreme data (very long, very short, empty)
- Test in different languages
- Test offline
- Test slow connection (throttle to 3G)
- Test with screen reader
- Test keyboard-only navigation
- Test on old browsers

**Automated testing**:
- Unit tests for edge cases
- Integration tests for error scenarios
- E2E tests for critical paths
- Visual regression tests
- Accessibility tests (axe, WAVE)

**IMPORTANT**: Hardening is about expecting the unexpected. Real users will do things you never imagined.

**NEVER**:
- Assume perfect input (validate everything)
- Ignore internationalization (design for global)
- Leave error messages generic ("Error occurred")
- Forget offline scenarios
- Trust client-side validation alone
- Use fixed widths for text
- Assume English-length text
- Block entire interface when one component errors

## Verify Hardening

Test thoroughly with edge cases:

- **Long text**: Try names with 100+ characters
- **Emoji**: Use emoji in all text fields
- **RTL**: Test with Arabic or Hebrew
- **CJK**: Test with Chinese/Japanese/Korean
- **Network issues**: Disable internet, throttle connection
- **Large datasets**: Test with 1000+ items
- **Concurrent actions**: Click submit 10 times rapidly
- **Errors**: Force API errors, test all error states
- **Empty**: Remove all data, test empty states

Remember: You're hardening for production reality, not demo perfection. Expect users to input weird data, lose connection mid-flow, and use your product in unexpected ways. Build resilience into every component.

---

### /polish

> Performs a final quality pass fixing alignment, spacing, consistency, and micro-detail issues before shipping. Use when ...

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: quality bar (MVP vs flagship).

---

Perform a meticulous final pass to catch all the small details that separate good work from great work. The difference between shipped and polished.

## Design System Discovery

Before polishing, understand the system you are polishing toward:

1. **Find the design system**: Search for design system documentation, component libraries, style guides, or token definitions. Study the core patterns: color tokens, spacing scale, typography styles, component API.
2. **Note the conventions**: How are shared components imported? What spacing scale is used? Which colors come from tokens vs hard-coded values? What motion and interaction patterns are established?
3. **Identify drift**: Where does the target feature deviate from the system? Hard-coded values that should be tokens, custom components that duplicate shared ones, spacing that doesn't match the scale.

If a design system exists, polish should align the feature with it. If none exists, polish against the conventions visible in the codebase.

## Pre-Polish Assessment

Understand the current state and goals:

1. **Review completeness**:
   - Is it functionally complete?
   - Are there known issues to preserve (mark with TODOs)?
   - What's the quality bar? (MVP vs flagship feature?)
   - When does it ship? (How much time for polish?)

2. **Identify polish areas**:
   - Visual inconsistencies
   - Spacing and alignment issues
   - Interaction state gaps
   - Copy inconsistencies
   - Edge cases and error states
   - Loading and transition smoothness

**CRITICAL**: Polish is the last step, not the first. Don't polish work that's not functionally complete.

## Polish Systematically

Work through these dimensions methodically:

### Visual Alignment & Spacing

- **Pixel-perfect alignment**: Everything lines up to grid
- **Consistent spacing**: All gaps use spacing scale (no random 13px gaps)
- **Optical alignment**: Adjust for visual weight (icons may need offset for optical centering)
- **Responsive consistency**: Spacing and alignment work at all breakpoints
- **Grid adherence**: Elements snap to baseline grid

**Check**:
- Enable grid overlay and verify alignment
- Check spacing with browser inspector
- Test at multiple viewport sizes
- Look for elements that "feel" off

### Typography Refinement

- **Hierarchy consistency**: Same elements use same sizes/weights throughout
- **Line length**: 45-75 characters for body text
- **Line height**: Appropriate for font size and context
- **Widows & orphans**: No single words on last line
- **Hyphenation**: Appropriate for language and column width
- **Kerning**: Adjust letter spacing where needed (especially headlines)
- **Font loading**: No FOUT/FOIT flashes

### Color & Contrast

- **Contrast ratios**: All text meets WCAG standards
- **Consistent token usage**: No hard-coded colors, all use design tokens
- **Theme consistency**: Works in all theme variants
- **Color meaning**: Same colors mean same things throughout
- **Accessible focus**: Focus indicators visible with sufficient contrast
- **Tinted neutrals**: No pure gray or pure black—add subtle color tint (0.01 chroma)
- **Gray on color**: Never put gray text on colored backgrounds—use a shade of that color or transparency

### Interaction States

Every interactive element needs all states:

- **Default**: Resting state
- **Hover**: Subtle feedback (color, scale, shadow)
- **Focus**: Keyboard focus indicator (never remove without replacement)
- **Active**: Click/tap feedback
- **Disabled**: Clearly non-interactive
- **Loading**: Async action feedback
- **Error**: Validation or error state
- **Success**: Successful completion

**Missing states create confusion and broken experiences**.

### Micro-interactions & Transitions

- **Smooth transitions**: All state changes animated appropriately (150-300ms)
- **Consistent easing**: Use ease-out-quart/quint/expo for natural deceleration. Never bounce or elastic—they feel dated.
- **No jank**: 60fps animations, only animate transform and opacity
- **Appropriate motion**: Motion serves purpose, not decoration
- **Reduced motion**: Respects `prefers-reduced-motion`

### Content & Copy

- **Consistent terminology**: Same things called same names throughout
- **Consistent capitalization**: Title Case vs Sentence case applied consistently
- **Grammar & spelling**: No typos
- **Appropriate length**: Not too wordy, not too terse
- **Punctuation consistency**: Periods on sentences, not on labels (unless all labels have them)

### Icons & Images

- **Consistent style**: All icons from same family or matching style
- **Appropriate sizing**: Icons sized consistently for context
- **Proper alignment**: Icons align with adjacent text optically
- **Alt text**: All images have descriptive alt text
- **Loading states**: Images don't cause layout shift, proper aspect ratios
- **Retina support**: 2x assets for high-DPI screens

### Forms & Inputs

- **Label consistency**: All inputs properly labeled
- **Required indicators**: Clear and consistent
- **Error messages**: Helpful and consistent
- **Tab order**: Logical keyboard navigation
- **Auto-focus**: Appropriate (don't overuse)
- **Validation timing**: Consistent (on blur vs on submit)

### Edge Cases & Error States

- **Loading states**: All async actions have loading feedback
- **Empty states**: Helpful empty states, not just blank space
- **Error states**: Clear error messages with recovery paths
- **Success states**: Confirmation of successful actions
- **Long content**: Handles very long names, descriptions, etc.
- **No content**: Handles missing data gracefully
- **Offline**: Appropriate offline handling (if applicable)

### Responsiveness

- **All breakpoints**: Test mobile, tablet, desktop
- **Touch targets**: 44x44px minimum on touch devices
- **Readable text**: No text smaller than 14px on mobile
- **No horizontal scroll**: Content fits viewport
- **Appropriate reflow**: Content adapts logically

### Performance

- **Fast initial load**: Optimize critical path
- **No layout shift**: Elements don't jump after load (CLS)
- **Smooth interactions**: No lag or jank
- **Optimized images**: Appropriate formats and sizes
- **Lazy loading**: Off-screen content loads lazily

### Code Quality

- **Remove console logs**: No debug logging in production
- **Remove commented code**: Clean up dead code
- **Remove unused imports**: Clean up unused dependencies
- **Consistent naming**: Variables and functions follow conventions
- **Type safety**: No TypeScript `any` or ignored errors
- **Accessibility**: Proper ARIA labels and semantic HTML

## Polish Checklist

Go through systematically:

- [ ] Visual alignment perfect at all breakpoints
- [ ] Spacing uses design tokens consistently
- [ ] Typography hierarchy consistent
- [ ] All interactive states implemented
- [ ] All transitions smooth (60fps)
- [ ] Copy is consistent and polished
- [ ] Icons are consistent and properly sized
- [ ] All forms properly labeled and validated
- [ ] Error states are helpful
- [ ] Loading states are clear
- [ ] Empty states are welcoming
- [ ] Touch targets are 44x44px minimum
- [ ] Contrast ratios meet WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors or warnings
- [ ] No layout shift on load
- [ ] Works in all supported browsers
- [ ] Respects reduced motion preference
- [ ] Code is clean (no TODOs, console.logs, commented code)

**IMPORTANT**: Polish is about details. Zoom in. Squint at it. Use it yourself. The little things add up.

**NEVER**:
- Polish before it's functionally complete
- Spend hours on polish if it ships in 30 minutes (triage)
- Introduce bugs while polishing (test thoroughly)
- Ignore systematic issues (if spacing is off everywhere, fix the system)
- Perfect one thing while leaving others rough (consistent quality level)
- Create new one-off components when design system equivalents exist
- Hard-code values that should use design tokens

## Final Verification

Before marking as done:

- **Use it yourself**: Actually interact with the feature
- **Test on real devices**: Not just browser DevTools
- **Ask someone else to review**: Fresh eyes catch things
- **Compare to design**: Match intended design
- **Check all states**: Don't just test happy path

## Clean Up

After polishing, ensure code quality:

- **Replace custom implementations**: If the design system provides a component you reimplemented, switch to the shared version.
- **Remove orphaned code**: Delete unused styles, components, or files made obsolete by polish.
- **Consolidate tokens**: If you introduced new values, check whether they should be tokens.
- **Verify DRYness**: Look for duplication introduced during polishing and consolidate.

Remember: You have impeccable attention to detail and exquisite taste. Polish until it feels effortless, looks intentional, and works flawlessly. Sweat the details - they matter.

---

### /bolder

> Amplify safe or boring designs to make them more visually interesting and stimulating. Increases impact while maintainin...

Increase visual impact and personality in designs that are too safe, generic, or visually underwhelming, creating more engaging and memorable experiences.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

## Assess Current State

Analyze what makes the design feel too safe or boring:

1. **Identify weakness sources**:
   - **Generic choices**: System fonts, basic colors, standard layouts
   - **Timid scale**: Everything is medium-sized with no drama
   - **Low contrast**: Everything has similar visual weight
   - **Static**: No motion, no energy, no life
   - **Predictable**: Standard patterns with no surprises
   - **Flat hierarchy**: Nothing stands out or commands attention

2. **Understand the context**:
   - What's the brand personality? (How far can we push?)
   - What's the purpose? (Marketing can be bolder than financial dashboards)
   - Who's the audience? (What will resonate?)
   - What are the constraints? (Brand guidelines, accessibility, performance)

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: "Bolder" doesn't mean chaotic or garish. It means distinctive, memorable, and confident. Think intentional drama, not random chaos.

**WARNING - AI SLOP TRAP**: When making things "bolder," AI defaults to the same tired tricks: cyan/purple gradients, glassmorphism, neon accents on dark backgrounds, gradient text on metrics. These are the OPPOSITE of bold—they're generic. Review ALL the DON'T guidelines in the impeccable skill before proceeding. Bold means distinctive, not "more effects."

## Plan Amplification

Create a strategy to increase impact while maintaining coherence:

- **Focal point**: What should be the hero moment? (Pick ONE, make it amazing)
- **Personality direction**: Maximalist chaos? Elegant drama? Playful energy? Dark moody? Choose a lane.
- **Risk budget**: How experimental can we be? Push boundaries within constraints.
- **Hierarchy amplification**: Make big things BIGGER, small things smaller (increase contrast)

**IMPORTANT**: Bold design must still be usable. Impact without function is just decoration.

## Amplify the Design

Systematically increase impact across these dimensions:

### Typography Amplification
- **Replace generic fonts**: Swap system fonts for distinctive choices (see impeccable skill for inspiration)
- **Extreme scale**: Create dramatic size jumps (3x-5x differences, not 1.5x)
- **Weight contrast**: Pair 900 weights with 200 weights, not 600 with 400
- **Unexpected choices**: Variable fonts, display fonts for headlines, condensed/extended widths, monospace as intentional accent (not as lazy "dev tool" default)

### Color Intensification
- **Increase saturation**: Shift to more vibrant, energetic colors (but not neon)
- **Bold palette**: Introduce unexpected color combinations—avoid the purple-blue gradient AI slop
- **Dominant color strategy**: Let one bold color own 60% of the design
- **Sharp accents**: High-contrast accent colors that pop
- **Tinted neutrals**: Replace pure grays with tinted grays that harmonize with your palette
- **Rich gradients**: Intentional multi-stop gradients (not generic purple-to-blue)

### Spatial Drama
- **Extreme scale jumps**: Make important elements 3-5x larger than surroundings
- **Break the grid**: Let hero elements escape containers and cross boundaries
- **Asymmetric layouts**: Replace centered, balanced layouts with tension-filled asymmetry
- **Generous space**: Use white space dramatically (100-200px gaps, not 20-40px)
- **Overlap**: Layer elements intentionally for depth

### Visual Effects
- **Dramatic shadows**: Large, soft shadows for elevation (but not generic drop shadows on rounded rectangles)
- **Background treatments**: Mesh patterns, noise textures, geometric patterns, intentional gradients (not purple-to-blue)
- **Texture & depth**: Grain, halftone, duotone, layered elements—NOT glassmorphism (it's overused AI slop)
- **Borders & frames**: Thick borders, decorative frames, custom shapes (not rounded rectangles with colored border on one side)
- **Custom elements**: Illustrative elements, custom icons, decorative details that reinforce brand

### Motion & Animation
- **Entrance choreography**: Staggered, dramatic page load animations with 50-100ms delays
- **Scroll effects**: Parallax, reveal animations, scroll-triggered sequences
- **Micro-interactions**: Satisfying hover effects, click feedback, state changes
- **Transitions**: Smooth, noticeable transitions using ease-out-quart/quint/expo (not bounce or elastic—they cheapen the effect)

### Composition Boldness
- **Hero moments**: Create clear focal points with dramatic treatment
- **Diagonal flows**: Escape horizontal/vertical rigidity with diagonal arrangements
- **Full-bleed elements**: Use full viewport width/height for impact
- **Unexpected proportions**: Golden ratio? Throw it out. Try 70/30, 80/20 splits

**NEVER**:
- Add effects randomly without purpose (chaos ≠ bold)
- Sacrifice readability for aesthetics (body text must be readable)
- Make everything bold (then nothing is bold - need contrast)
- Ignore accessibility (bold design must still meet WCAG standards)
- Overwhelm with motion (animation fatigue is real)
- Copy trendy aesthetics blindly (bold means distinctive, not derivative)

## Verify Quality

Ensure amplification maintains usability and coherence:

- **NOT AI slop**: Does this look like every other AI-generated "bold" design? If yes, start over.
- **Still functional**: Can users accomplish tasks without distraction?
- **Coherent**: Does everything feel intentional and unified?
- **Memorable**: Will users remember this experience?
- **Performant**: Do all these effects run smoothly?
- **Accessible**: Does it still meet accessibility standards?

**The test**: If you showed this to someone and said "AI made this bolder," would they believe you immediately? If yes, you've failed. Bold means distinctive, not "more AI effects."

Remember: Bold design is confident design. It takes risks, makes statements, and creates memorable experiences. But bold without strategy is just loud. Be intentional, be dramatic, be unforgettable.

---

### /quieter

> Tones down visually aggressive or overstimulating designs, reducing intensity while preserving quality. Use when the use...

Reduce visual intensity in designs that are too bold, aggressive, or overstimulating, creating a more refined and approachable aesthetic without losing effectiveness.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

## Assess Current State

Analyze what makes the design feel too intense:

1. **Identify intensity sources**:
   - **Color saturation**: Overly bright or saturated colors
   - **Contrast extremes**: Too much high-contrast juxtaposition
   - **Visual weight**: Too many bold, heavy elements competing
   - **Animation excess**: Too much motion or overly dramatic effects
   - **Complexity**: Too many visual elements, patterns, or decorations
   - **Scale**: Everything is large and loud with no hierarchy

2. **Understand the context**:
   - What's the purpose? (Marketing vs tool vs reading experience)
   - Who's the audience? (Some contexts need energy)
   - What's working? (Don't throw away good ideas)
   - What's the core message? (Preserve what matters)

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: "Quieter" doesn't mean boring or generic. It means refined, sophisticated, and easier on the eyes. Think luxury, not laziness.

## Plan Refinement

Create a strategy to reduce intensity while maintaining impact:

- **Color approach**: Desaturate or shift to more sophisticated tones?
- **Hierarchy approach**: Which elements should stay bold (very few), which should recede?
- **Simplification approach**: What can be removed entirely?
- **Sophistication approach**: How can we signal quality through restraint?

**IMPORTANT**: Great quiet design is harder than great bold design. Subtlety requires precision.

## Refine the Design

Systematically reduce intensity across these dimensions:

### Color Refinement
- **Reduce saturation**: Shift from fully saturated to 70-85% saturation
- **Soften palette**: Replace bright colors with muted, sophisticated tones
- **Reduce color variety**: Use fewer colors more thoughtfully
- **Neutral dominance**: Let neutrals do more work, use color as accent (10% rule)
- **Gentler contrasts**: High contrast only where it matters most
- **Tinted grays**: Use warm or cool tinted grays instead of pure gray—adds sophistication without loudness
- **Never gray on color**: If you have gray text on a colored background, use a darker shade of that color or transparency instead

### Visual Weight Reduction
- **Typography**: Reduce font weights (900 → 600, 700 → 500), decrease sizes where appropriate
- **Hierarchy through subtlety**: Use weight, size, and space instead of color and boldness
- **White space**: Increase breathing room, reduce density
- **Borders & lines**: Reduce thickness, decrease opacity, or remove entirely

### Simplification
- **Remove decorative elements**: Gradients, shadows, patterns, textures that don't serve purpose
- **Simplify shapes**: Reduce border radius extremes, simplify custom shapes
- **Reduce layering**: Flatten visual hierarchy where possible
- **Clean up effects**: Reduce or remove blur effects, glows, multiple shadows

### Motion Reduction
- **Reduce animation intensity**: Shorter distances (10-20px instead of 40px), gentler easing
- **Remove decorative animations**: Keep functional motion, remove flourishes
- **Subtle micro-interactions**: Replace dramatic effects with gentle feedback
- **Refined easing**: Use ease-out-quart for smooth, understated motion—never bounce or elastic
- **Remove animations entirely** if they're not serving a clear purpose

### Composition Refinement
- **Reduce scale jumps**: Smaller contrast between sizes creates calmer feeling
- **Align to grid**: Bring rogue elements back into systematic alignment
- **Even out spacing**: Replace extreme spacing variations with consistent rhythm

**NEVER**:
- Make everything the same size/weight (hierarchy still matters)
- Remove all color (quiet ≠ grayscale)
- Eliminate all personality (maintain character through refinement)
- Sacrifice usability for aesthetics (functional elements still need clear affordances)
- Make everything small and light (some anchors needed)

## Verify Quality

Ensure refinement maintains quality:

- **Still functional**: Can users still accomplish tasks easily?
- **Still distinctive**: Does it have character, or is it generic now?
- **Better reading**: Is text easier to read for extended periods?
- **Sophistication**: Does it feel more refined and premium?

Remember: Quiet design is confident design. It doesn't need to shout. Less is more, but less is also harder. Refine with precision and maintain intentionality.

---

### /colorize

> Add strategic color to features that are too monochromatic or lack visual interest, making interfaces more engaging and ...

Strategically introduce color to designs that are too monochromatic, gray, or lacking in visual warmth and personality.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: existing brand colors.

---

## Assess Color Opportunity

Analyze the current state and identify opportunities:

1. **Understand current state**:
   - **Color absence**: Pure grayscale? Limited neutrals? One timid accent?
   - **Missed opportunities**: Where could color add meaning, hierarchy, or delight?
   - **Context**: What's appropriate for this domain and audience?
   - **Brand**: Are there existing brand colors we should use?

2. **Identify where color adds value**:
   - **Semantic meaning**: Success (green), error (red), warning (yellow/orange), info (blue)
   - **Hierarchy**: Drawing attention to important elements
   - **Categorization**: Different sections, types, or states
   - **Emotional tone**: Warmth, energy, trust, creativity
   - **Wayfinding**: Helping users navigate and understand structure
   - **Delight**: Moments of visual interest and personality

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: More color ≠ better. Strategic color beats rainbow vomit every time. Every color should have a purpose.

## Plan Color Strategy

Create a purposeful color introduction plan:

- **Color palette**: What colors match the brand/context? (Choose 2-4 colors max beyond neutrals)
- **Dominant color**: Which color owns 60% of colored elements?
- **Accent colors**: Which colors provide contrast and highlights? (30% and 10%)
- **Application strategy**: Where does each color appear and why?

**IMPORTANT**: Color should enhance hierarchy and meaning, not create chaos. Less is more when it matters more.

## Introduce Color Strategically

Add color systematically across these dimensions:

### Semantic Color
- **State indicators**:
  - Success: Green tones (emerald, forest, mint)
  - Error: Red/pink tones (rose, crimson, coral)
  - Warning: Orange/amber tones
  - Info: Blue tones (sky, ocean, indigo)
  - Neutral: Gray/slate for inactive states

- **Status badges**: Colored backgrounds or borders for states (active, pending, completed, etc.)
- **Progress indicators**: Colored bars, rings, or charts showing completion or health

### Accent Color Application
- **Primary actions**: Color the most important buttons/CTAs
- **Links**: Add color to clickable text (maintain accessibility)
- **Icons**: Colorize key icons for recognition and personality
- **Headers/titles**: Add color to section headers or key labels
- **Hover states**: Introduce color on interaction

### Background & Surfaces
- **Tinted backgrounds**: Replace pure gray (`#f5f5f5`) with warm neutrals (`oklch(97% 0.01 60)`) or cool tints (`oklch(97% 0.01 250)`)
- **Colored sections**: Use subtle background colors to separate areas
- **Gradient backgrounds**: Add depth with subtle, intentional gradients (not generic purple-blue)
- **Cards & surfaces**: Tint cards or surfaces slightly for warmth

**Use OKLCH for color**: It's perceptually uniform, meaning equal steps in lightness *look* equal. Great for generating harmonious scales.

### Data Visualization
- **Charts & graphs**: Use color to encode categories or values
- **Heatmaps**: Color intensity shows density or importance
- **Comparison**: Color coding for different datasets or timeframes

### Borders & Accents
- **Accent borders**: Add colored left/top borders to cards or sections
- **Underlines**: Color underlines for emphasis or active states
- **Dividers**: Subtle colored dividers instead of gray lines
- **Focus rings**: Colored focus indicators matching brand

### Typography Color
- **Colored headings**: Use brand colors for section headings (maintain contrast)
- **Highlight text**: Color for emphasis or categories
- **Labels & tags**: Small colored labels for metadata or categories

### Decorative Elements
- **Illustrations**: Add colored illustrations or icons
- **Shapes**: Geometric shapes in brand colors as background elements
- **Gradients**: Colorful gradient overlays or mesh backgrounds
- **Blobs/organic shapes**: Soft colored shapes for visual interest

## Balance & Refinement

Ensure color addition improves rather than overwhelms:

### Maintain Hierarchy
- **Dominant color** (60%): Primary brand color or most used accent
- **Secondary color** (30%): Supporting color for variety
- **Accent color** (10%): High contrast for key moments
- **Neutrals** (remaining): Gray/black/white for structure

### Accessibility
- **Contrast ratios**: Ensure WCAG compliance (4.5:1 for text, 3:1 for UI components)
- **Don't rely on color alone**: Use icons, labels, or patterns alongside color
- **Test for color blindness**: Verify red/green combinations work for all users

### Cohesion
- **Consistent palette**: Use colors from defined palette, not arbitrary choices
- **Systematic application**: Same color meanings throughout (green always = success)
- **Temperature consistency**: Warm palette stays warm, cool stays cool

**NEVER**:
- Use every color in the rainbow (choose 2-4 colors beyond neutrals)
- Apply color randomly without semantic meaning
- Put gray text on colored backgrounds—it looks washed out; use a darker shade of the background color or transparency instead
- Use pure gray for neutrals—add subtle color tint (warm or cool) for sophistication
- Use pure black (`#000`) or pure white (`#fff`) for large areas
- Violate WCAG contrast requirements
- Use color as the only indicator (accessibility issue)
- Make everything colorful (defeats the purpose)
- Default to purple-blue gradients (AI slop aesthetic)

## Verify Color Addition

Test that colorization improves the experience:

- **Better hierarchy**: Does color guide attention appropriately?
- **Clearer meaning**: Does color help users understand states/categories?
- **More engaging**: Does the interface feel warmer and more inviting?
- **Still accessible**: Do all color combinations meet WCAG standards?
- **Not overwhelming**: Is color balanced and purposeful?

Remember: Color is emotional and powerful. Use it to create warmth, guide attention, communicate meaning, and express personality. But restraint and strategy matter more than saturation and variety. Be colorful, but be intentional.

---

### /typeset

> Improves typography by fixing font choices, hierarchy, sizing, weight, and readability so text feels intentional. Use wh...

Assess and improve typography that feels generic, inconsistent, or poorly structured — turning default-looking text into intentional, well-crafted type.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

## Assess Current Typography

Analyze what's weak or generic about the current type:

1. **Font choices**:
   - Are we using invisible defaults? (Inter, Roboto, Arial, Open Sans, system defaults)
   - Does the font match the brand personality? (A playful brand shouldn't use a corporate typeface)
   - Are there too many font families? (More than 2-3 is almost always a mess)

2. **Hierarchy**:
   - Can you tell headings from body from captions at a glance?
   - Are font sizes too close together? (14px, 15px, 16px = muddy hierarchy)
   - Are weight contrasts strong enough? (Medium vs Regular is barely visible)

3. **Sizing & scale**:
   - Is there a consistent type scale, or are sizes arbitrary?
   - Does body text meet minimum readability? (16px+)
   - Is the sizing strategy appropriate for the context? (Fixed `rem` scales for app UIs; fluid `clamp()` for marketing/content page headings)

4. **Readability**:
   - Are line lengths comfortable? (45-75 characters ideal)
   - Is line-height appropriate for the font and context?
   - Is there enough contrast between text and background?

5. **Consistency**:
   - Are the same elements styled the same way throughout?
   - Are font weights used consistently? (Not bold in one section, semibold in another for the same role)
   - Is letter-spacing intentional or default everywhere?

**CRITICAL**: The goal isn't to make text "fancier" — it's to make it clearer, more readable, and more intentional. Good typography is invisible; bad typography is distracting.

## Plan Typography Improvements

Consult the [typography reference](reference/typography.md) from the impeccable skill for detailed guidance on scales, pairing, and loading strategies.

Create a systematic plan:

- **Font selection**: Do fonts need replacing? What fits the brand/context?
- **Type scale**: Establish a modular scale (e.g., 1.25 ratio) with clear hierarchy
- **Weight strategy**: Which weights serve which roles? (Regular for body, Semibold for labels, Bold for headings — or whatever fits)
- **Spacing**: Line-heights, letter-spacing, and margins between typographic elements

## Improve Typography Systematically

### Font Selection

If fonts need replacing:
- Choose fonts that reflect the brand personality
- Pair with genuine contrast (serif + sans, geometric + humanist) — or use a single family in multiple weights
- Ensure web font loading doesn't cause layout shift (`font-display: swap`, metric-matched fallbacks)

### Establish Hierarchy

Build a clear type scale:
- **5 sizes cover most needs**: caption, secondary, body, subheading, heading
- **Use a consistent ratio** between levels (1.25, 1.333, or 1.5)
- **Combine dimensions**: Size + weight + color + space for strong hierarchy — don't rely on size alone
- **App UIs**: Use a fixed `rem`-based type scale, optionally adjusted at 1-2 breakpoints. Fluid sizing undermines the spatial predictability that dense, container-based layouts need
- **Marketing / content pages**: Use fluid sizing via `clamp(min, preferred, max)` for headings and display text. Keep body text fixed

### Fix Readability

- Set `max-width` on text containers using `ch` units (`max-width: 65ch`)
- Adjust line-height per context: tighter for headings (1.1-1.2), looser for body (1.5-1.7)
- Increase line-height slightly for light-on-dark text
- Ensure body text is at least 16px / 1rem

### Refine Details

- Use `tabular-nums` for data tables and numbers that should align
- Apply proper `letter-spacing`: slightly open for small caps and uppercase, default or tight for large display text
- Use semantic token names (`--text-body`, `--text-heading`), not value names (`--font-16`)
- Set `font-kerning: normal` and consider OpenType features where appropriate

### Weight Consistency

- Define clear roles for each weight and stick to them
- Don't use more than 3-4 weights (Regular, Medium, Semibold, Bold is plenty)
- Load only the weights you actually use (each weight adds to page load)

**NEVER**:
- Use more than 2-3 font families
- Pick sizes arbitrarily — commit to a scale
- Set body text below 16px
- Use decorative/display fonts for body text
- Disable browser zoom (`user-scalable=no`)
- Use `px` for font sizes — use `rem` to respect user settings
- Default to Inter/Roboto/Open Sans when personality matters
- Pair fonts that are similar but not identical (two geometric sans-serifs)

## Verify Typography Improvements

- **Hierarchy**: Can you identify heading vs body vs caption instantly?
- **Readability**: Is body text comfortable to read in long passages?
- **Consistency**: Are same-role elements styled identically throughout?
- **Personality**: Does the typography reflect the brand?
- **Performance**: Are web fonts loading efficiently without layout shift?
- **Accessibility**: Does text meet WCAG contrast ratios? Is it zoomable to 200%?

Remember: Typography is the foundation of interface design — it carries the majority of information. Getting it right is the highest-leverage improvement you can make.

---

### /layout

> Improve layout, spacing, and visual rhythm. Fixes monotonous grids, inconsistent spacing, and weak visual hierarchy. Use...

Assess and improve layout and spacing that feels monotonous, crowded, or structurally weak — turning generic arrangements into intentional, rhythmic compositions.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

## Assess Current Layout

Analyze what's weak about the current spatial design:

1. **Spacing**:
   - Is spacing consistent or arbitrary? (Random padding/margin values)
   - Is all spacing the same? (Equal padding everywhere = no rhythm)
   - Are related elements grouped tightly, with generous space between groups?

2. **Visual hierarchy**:
   - Apply the squint test: blur your (metaphorical) eyes — can you still identify the most important element, second most important, and clear groupings?
   - Is hierarchy achieved effectively? (Space and weight alone can be enough — but is the current approach working?)
   - Does whitespace guide the eye to what matters?

3. **Grid & structure**:
   - Is there a clear underlying structure, or does the layout feel random?
   - Are identical card grids used everywhere? (Icon + heading + text, repeated endlessly)
   - Is everything centered? (Left-aligned with asymmetric layouts feels more designed, but not a hard and fast rule)

4. **Rhythm & variety**:
   - Does the layout have visual rhythm? (Alternating tight/generous spacing)
   - Is every section structured the same way? (Monotonous repetition)
   - Are there intentional moments of surprise or emphasis?

5. **Density**:
   - Is the layout too cramped? (Not enough breathing room)
   - Is the layout too sparse? (Excessive whitespace without purpose)
   - Does density match the content type? (Data-dense UIs need tighter spacing; marketing pages need more air)

**CRITICAL**: Layout problems are often the root cause of interfaces feeling "off" even when colors and fonts are fine. Space is a design material — use it with intention.

## Plan Layout Improvements

Consult the [spatial design reference](reference/spatial-design.md) from the impeccable skill for detailed guidance on grids, rhythm, and container queries.

Create a systematic plan:

- **Spacing system**: Use a consistent scale — whether that's a framework's built-in scale (e.g., Tailwind), rem-based tokens, or a custom system. The specific values matter less than consistency.
- **Hierarchy strategy**: How will space communicate importance?
- **Layout approach**: What structure fits the content? Flex for 1D, Grid for 2D, named areas for complex page layouts.
- **Rhythm**: Where should spacing be tight vs generous?

## Improve Layout Systematically

### Establish a Spacing System

- Use a consistent spacing scale — framework scales (Tailwind, etc.), rem-based tokens, or a custom scale all work. What matters is that values come from a defined set, not arbitrary numbers.
- Name tokens semantically if using custom properties: `--space-xs` through `--space-xl`, not `--spacing-8`
- Use `gap` for sibling spacing instead of margins — eliminates margin collapse hacks
- Apply `clamp()` for fluid spacing that breathes on larger screens

### Create Visual Rhythm

- **Tight grouping** for related elements (8-12px between siblings)
- **Generous separation** between distinct sections (48-96px)
- **Varied spacing** within sections — not every row needs the same gap
- **Asymmetric compositions** — break the predictable centered-content pattern when it makes sense

### Choose the Right Layout Tool

- **Use Flexbox for 1D layouts**: Rows of items, nav bars, button groups, card contents, most component internals. Flex is simpler and more appropriate for the majority of layout tasks.
- **Use Grid for 2D layouts**: Page-level structure, dashboards, data-dense interfaces, anything where rows AND columns need coordinated control.
- **Don't default to Grid** when Flexbox with `flex-wrap` would be simpler and more flexible.
- Use `repeat(auto-fit, minmax(280px, 1fr))` for responsive grids without breakpoints.
- Use named grid areas (`grid-template-areas`) for complex page layouts — redefine at breakpoints.

### Break Card Grid Monotony

- Don't default to card grids for everything — spacing and alignment create visual grouping naturally
- Use cards only when content is truly distinct and actionable — never nest cards inside cards
- Vary card sizes, span columns, or mix cards with non-card content to break repetition

### Strengthen Visual Hierarchy

- Use the fewest dimensions needed for clear hierarchy. Space alone can be enough — generous whitespace around an element draws the eye. Some of the most sophisticated designs achieve rhythm with just space and weight. Add color or size contrast only when simpler means aren't sufficient.
- Be aware of reading flow — in LTR languages, the eye naturally scans top-left to bottom-right, but primary action placement depends on context (e.g., bottom-right in dialogs, top in navigation).
- Create clear content groupings through proximity and separation.

### Manage Depth & Elevation

- Create a semantic z-index scale (dropdown → sticky → modal-backdrop → modal → toast → tooltip)
- Build a consistent shadow scale (sm → md → lg → xl) — shadows should be subtle
- Use elevation to reinforce hierarchy, not as decoration

### Optical Adjustments

- If an icon looks visually off-center despite being geometrically centered, nudge it — but only if you're confident it actually looks wrong. Don't adjust speculatively.

**NEVER**:
- Use arbitrary spacing values outside your scale
- Make all spacing equal — variety creates hierarchy
- Wrap everything in cards — not everything needs a container
- Nest cards inside cards — use spacing and dividers for hierarchy within
- Use identical card grids everywhere (icon + heading + text, repeated)
- Center everything — left-aligned with asymmetry feels more designed
- Default to the hero metric layout (big number, small label, stats, gradient) as a template. If showing real user data, a prominent metric can work — but it should display actual data, not decorative numbers.
- Default to CSS Grid when Flexbox would be simpler — use the simplest tool for the job
- Use arbitrary z-index values (999, 9999) — build a semantic scale

## Verify Layout Improvements

- **Squint test**: Can you identify primary, secondary, and groupings with blurred vision?
- **Rhythm**: Does the page have a satisfying beat of tight and generous spacing?
- **Hierarchy**: Is the most important content obvious within 2 seconds?
- **Breathing room**: Does the layout feel comfortable, not cramped or wasteful?
- **Consistency**: Is the spacing system applied uniformly?
- **Responsiveness**: Does the layout adapt gracefully across screen sizes?

Remember: Space is the most underused design tool. A layout with the right rhythm and hierarchy can make even simple content feel polished and intentional.

---

### /animate

> Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usabilit...

Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and create delight.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: performance constraints.

---

## Assess Animation Opportunities

Analyze where motion would improve the experience:

1. **Identify static areas**:
   - **Missing feedback**: Actions without visual acknowledgment (button clicks, form submission, etc.)
   - **Jarring transitions**: Instant state changes that feel abrupt (show/hide, page loads, route changes)
   - **Unclear relationships**: Spatial or hierarchical relationships that aren't obvious
   - **Lack of delight**: Functional but joyless interactions
   - **Missed guidance**: Opportunities to direct attention or explain behavior

2. **Understand the context**:
   - What's the personality? (Playful vs serious, energetic vs calm)
   - What's the performance budget? (Mobile-first? Complex page?)
   - Who's the audience? (Motion-sensitive users? Power users who want speed?)
   - What matters most? (One hero animation vs many micro-interactions?)

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: Respect `prefers-reduced-motion`. Always provide non-animated alternatives for users who need them.

## Plan Animation Strategy

Create a purposeful animation plan:

- **Hero moment**: What's the ONE signature animation? (Page load? Hero section? Key interaction?)
- **Feedback layer**: Which interactions need acknowledgment?
- **Transition layer**: Which state changes need smoothing?
- **Delight layer**: Where can we surprise and delight?

**IMPORTANT**: One well-orchestrated experience beats scattered animations everywhere. Focus on high-impact moments.

## Implement Animations

Add motion systematically across these categories:

### Entrance Animations
- **Page load choreography**: Stagger element reveals (100-150ms delays), fade + slide combinations
- **Hero section**: Dramatic entrance for primary content (scale, parallax, or creative effects)
- **Content reveals**: Scroll-triggered animations using intersection observer
- **Modal/drawer entry**: Smooth slide + fade, backdrop fade, focus management

### Micro-interactions
- **Button feedback**:
  - Hover: Subtle scale (1.02-1.05), color shift, shadow increase
  - Click: Quick scale down then up (0.95 → 1), ripple effect
  - Loading: Spinner or pulse state
- **Form interactions**:
  - Input focus: Border color transition, slight scale or glow
  - Validation: Shake on error, check mark on success, smooth color transitions
- **Toggle switches**: Smooth slide + color transition (200-300ms)
- **Checkboxes/radio**: Check mark animation, ripple effect
- **Like/favorite**: Scale + rotation, particle effects, color transition

### State Transitions
- **Show/hide**: Fade + slide (not instant), appropriate timing (200-300ms)
- **Expand/collapse**: Height transition with overflow handling, icon rotation
- **Loading states**: Skeleton screen fades, spinner animations, progress bars
- **Success/error**: Color transitions, icon animations, gentle scale pulse
- **Enable/disable**: Opacity transitions, cursor changes

### Navigation & Flow
- **Page transitions**: Crossfade between routes, shared element transitions
- **Tab switching**: Slide indicator, content fade/slide
- **Carousel/slider**: Smooth transforms, snap points, momentum
- **Scroll effects**: Parallax layers, sticky headers with state changes, scroll progress indicators

### Feedback & Guidance
- **Hover hints**: Tooltip fade-ins, cursor changes, element highlights
- **Drag & drop**: Lift effect (shadow + scale), drop zone highlights, smooth repositioning
- **Copy/paste**: Brief highlight flash on paste, "copied" confirmation
- **Focus flow**: Highlight path through form or workflow

### Delight Moments
- **Empty states**: Subtle floating animations on illustrations
- **Completed actions**: Confetti, check mark flourish, success celebrations
- **Easter eggs**: Hidden interactions for discovery
- **Contextual animation**: Weather effects, time-of-day themes, seasonal touches

## Technical Implementation

Use appropriate techniques for each animation:

### Timing & Easing

**Durations by purpose:**
- **100-150ms**: Instant feedback (button press, toggle)
- **200-300ms**: State changes (hover, menu open)
- **300-500ms**: Layout changes (accordion, modal)
- **500-800ms**: Entrance animations (page load)

**Easing curves (use these, not CSS defaults):**
```css
/* Recommended - natural deceleration */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);    /* Smooth, refined */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);   /* Slightly snappier */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);     /* Confident, decisive */

/* AVOID - feel dated and tacky */
/* bounce: cubic-bezier(0.34, 1.56, 0.64, 1); */
/* elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6); */
```

**Exit animations are faster than entrances.** Use ~75% of enter duration.

### CSS Animations
```css
/* Prefer for simple, declarative animations */
- transitions for state changes
- @keyframes for complex sequences
- transform + opacity only (GPU-accelerated)
```

### JavaScript Animation
```javascript
/* Use for complex, interactive animations */
- Web Animations API for programmatic control
- Framer Motion for React
- GSAP for complex sequences
```

### Performance
- **GPU acceleration**: Use `transform` and `opacity`, avoid layout properties
- **will-change**: Add sparingly for known expensive animations
- **Reduce paint**: Minimize repaints, use `contain` where appropriate
- **Monitor FPS**: Ensure 60fps on target devices

### Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**NEVER**:
- Use bounce or elastic easing curves—they feel dated and draw attention to the animation itself
- Animate layout properties (width, height, top, left)—use transform instead
- Use durations over 500ms for feedback—it feels laggy
- Animate without purpose—every animation needs a reason
- Ignore `prefers-reduced-motion`—this is an accessibility violation
- Animate everything—animation fatigue makes interfaces feel exhausting
- Block interaction during animations unless intentional

## Verify Quality

Test animations thoroughly:

- **Smooth at 60fps**: No jank on target devices
- **Feels natural**: Easing curves feel organic, not robotic
- **Appropriate timing**: Not too fast (jarring) or too slow (laggy)
- **Reduced motion works**: Animations disabled or simplified appropriately
- **Doesn't block**: Users can interact during/after animations
- **Adds value**: Makes interface clearer or more delightful

Remember: Motion should enhance understanding and provide feedback, not just add decoration. Animate with purpose, respect performance constraints, and always consider accessibility. Great animation is invisible - it just makes everything feel right.

---

### /overdrive

> Pushes interfaces past conventional limits with technically ambitious implementations — shaders, spring physics, scroll-...

Start your response with:

```
──────────── ⚡ OVERDRIVE ─────────────
》》》 Entering overdrive mode...
```

Push an interface past conventional limits. This isn't just about visual effects — it's about using the full power of the browser to make any part of an interface feel extraordinary: a table that handles a million rows, a dialog that morphs from its trigger, a form that validates in real-time with streaming feedback, a page transition that feels cinematic.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

**EXTRA IMPORTANT FOR THIS SKILL**: Context determines what "extraordinary" means. A particle system on a creative portfolio is impressive. The same particle system on a settings page is embarrassing. But a settings page with instant optimistic saves and animated state transitions? That's extraordinary too. Understand the project's personality and goals before deciding what's appropriate.

### Propose Before Building

This skill has the highest potential to misfire. Do NOT jump straight into implementation. You MUST:

1. **Think through 2-3 different directions** — consider different techniques, levels of ambition, and aesthetic approaches. For each direction, briefly describe what the result would look and feel like.
2. **STOP and call the AskUserQuestion tool to clarify.** to present these directions and get the user's pick before writing any code. Explain trade-offs (browser support, performance cost, complexity).
3. Only proceed with the direction the user confirms.

Skipping this step risks building something embarrassing that needs to be thrown away.

### Iterate with Browser Automation

Technically ambitious effects almost never work on the first try. You MUST actively use browser automation tools to preview your work, visually verify the result, and iterate. Do not assume the effect looks right — check it. Expect multiple rounds of refinement. The gap between "technically works" and "looks extraordinary" is closed through visual iteration, not code alone.

---

## Assess What "Extraordinary" Means Here

The right kind of technical ambition depends entirely on what you're working with. Before choosing a technique, ask: **what would make a user of THIS specific interface say "wow, that's nice"?**

### For visual/marketing surfaces
Pages, hero sections, landing pages, portfolios — the "wow" is often sensory: a scroll-driven reveal, a shader background, a cinematic page transition, generative art that responds to the cursor.

### For functional UI
Tables, forms, dialogs, navigation — the "wow" is in how it FEELS: a dialog that morphs from the button that triggered it via View Transitions, a data table that renders 100k rows at 60fps via virtual scrolling, a form with streaming validation that feels instant, drag-and-drop with spring physics.

### For performance-critical UI
The "wow" is invisible but felt: a search that filters 50k items without a flicker, a complex form that never blocks the main thread, an image editor that processes in near-real-time. The interface just never hesitates.

### For data-heavy interfaces
Charts and dashboards — the "wow" is in fluidity: GPU-accelerated rendering via Canvas/WebGL for massive datasets, animated transitions between data states, force-directed graph layouts that settle naturally.

**The common thread**: something about the implementation goes beyond what users expect from a web interface. The technique serves the experience, not the other way around.

## The Toolkit

Organized by what you're trying to achieve, not by technology name.

### Make transitions feel cinematic
- **View Transitions API** (same-document: all browsers; cross-document: no Firefox) — shared element morphing between states. A list item expanding into a detail page. A button morphing into a dialog. This is the closest thing to native FLIP animations.
- **`@starting-style`** (all browsers) — animate elements from `display: none` to visible with CSS only, including entry keyframes
- **Spring physics** — natural motion with mass, tension, and damping instead of cubic-bezier. Libraries: motion (formerly Framer Motion), GSAP, or roll your own spring solver.

### Tie animation to scroll position
- **Scroll-driven animations** (`animation-timeline: scroll()`) — CSS-only, no JS. Parallax, progress bars, reveal sequences all driven by scroll position. (Chrome/Edge/Safari; Firefox: flag only — always provide a static fallback)

### Render beyond CSS
- **WebGL** (all browsers) — shader effects, post-processing, particle systems. Libraries: Three.js, OGL (lightweight), regl. Use for effects CSS can't express.
- **WebGPU** (Chrome/Edge; Safari partial; Firefox: flag only) — next-gen GPU compute. More powerful than WebGL but limited browser support. Always fall back to WebGL2.
- **Canvas 2D / OffscreenCanvas** — custom rendering, pixel manipulation, or moving heavy rendering off the main thread entirely via Web Workers + OffscreenCanvas.
- **SVG filter chains** — displacement maps, turbulence, morphology for organic distortion effects. CSS-animatable.

### Make data feel alive
- **Virtual scrolling** — render only visible rows for tables/lists with tens of thousands of items. No library required for simple cases; TanStack Virtual for complex ones.
- **GPU-accelerated charts** — Canvas or WebGL-rendered data visualization for datasets too large for SVG/DOM. Libraries: deck.gl, regl-based custom renderers.
- **Animated data transitions** — morph between chart states rather than replacing. D3's `transition()` or View Transitions for DOM-based charts.

### Animate complex properties
- **`@property`** (all browsers) — register custom CSS properties with types, enabling animation of gradients, colors, and complex values that CSS can't normally interpolate.
- **Web Animations API** (all browsers) — JavaScript-driven animations with the performance of CSS. Composable, cancellable, reversible. The foundation for complex choreography.

### Push performance boundaries
- **Web Workers** — move computation off the main thread. Heavy data processing, image manipulation, search indexing — anything that would cause jank.
- **OffscreenCanvas** — render in a Worker thread. The main thread stays free while complex visuals render in the background.
- **WASM** — near-native performance for computation-heavy features. Image processing, physics simulations, codecs.

### Interact with the device
- **Web Audio API** — spatial audio, audio-reactive visualizations, sonic feedback. Requires user gesture to start.
- **Device APIs** — orientation, ambient light, geolocation. Use sparingly and always with user permission.

**NOTE**: This skill is about enhancing how an interface FEELS, not changing what a product DOES. Adding real-time collaboration, offline support, or new backend capabilities are product decisions, not UI enhancements. Focus on making existing features feel extraordinary.

## Implement with Discipline

### Progressive enhancement is non-negotiable

Every technique must degrade gracefully. The experience without the enhancement must still be good.

```css
@supports (animation-timeline: scroll()) {
  .hero { animation-timeline: scroll(); }
}
```

```javascript
if ('gpu' in navigator) { /* WebGPU */ }
else if (canvas.getContext('webgl2')) { /* WebGL2 fallback */ }
/* CSS-only fallback must still look good */
```

### Performance rules

- Target 60fps. If dropping below 50, simplify.
- Respect `prefers-reduced-motion` — always. Provide a beautiful static alternative.
- Lazy-initialize heavy resources (WebGL contexts, WASM modules) only when near viewport.
- Pause off-screen rendering. Kill what you can't see.
- Test on real mid-range devices, not just your development machine.

### Polish is the difference

The gap between "cool" and "extraordinary" is in the last 20% of refinement: the easing curve on a spring animation, the timing offset in a staggered reveal, the subtle secondary motion that makes a transition feel physical. Don't ship the first version that works — ship the version that feels inevitable.

**NEVER**:
- Ignore `prefers-reduced-motion` — this is an accessibility requirement, not a suggestion
- Ship effects that cause jank on mid-range devices
- Use bleeding-edge APIs without a functional fallback
- Add sound without explicit user opt-in
- Use technical ambition to mask weak design fundamentals — fix those first with other skills
- Layer multiple competing extraordinary moments — focus creates impact, excess creates noise

## Verify the Result

- **The wow test**: Show it to someone who hasn't seen it. Do they react?
- **The removal test**: Take it away. Does the experience feel diminished, or does nobody notice?
- **The device test**: Run it on a phone, a tablet, a Chromebook. Still smooth?
- **The accessibility test**: Enable reduced motion. Still beautiful?
- **The context test**: Does this make sense for THIS brand and audience?

Remember: "Technically extraordinary" isn't about using the newest API. It's about making an interface do something users didn't think a website could do.

---

### /delight

> Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates fu...

Identify opportunities to add moments of joy, personality, and unexpected polish that transform functional interfaces into delightful experiences.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: what's appropriate for the domain (playful vs professional vs quirky vs elegant).

---

## Assess Delight Opportunities

Identify where delight would enhance (not distract from) the experience:

1. **Find natural delight moments**:
   - **Success states**: Completed actions (save, send, publish)
   - **Empty states**: First-time experiences, onboarding
   - **Loading states**: Waiting periods that could be entertaining
   - **Achievements**: Milestones, streaks, completions
   - **Interactions**: Hover states, clicks, drags
   - **Errors**: Softening frustrating moments
   - **Easter eggs**: Hidden discoveries for curious users

2. **Understand the context**:
   - What's the brand personality? (Playful? Professional? Quirky? Elegant?)
   - Who's the audience? (Tech-savvy? Creative? Corporate?)
   - What's the emotional context? (Accomplishment? Exploration? Frustration?)
   - What's appropriate? (Banking app ≠ gaming app)

3. **Define delight strategy**:
   - **Subtle sophistication**: Refined micro-interactions (luxury brands)
   - **Playful personality**: Whimsical illustrations and copy (consumer apps)
   - **Helpful surprises**: Anticipating needs before users ask (productivity tools)
   - **Sensory richness**: Satisfying sounds, smooth animations (creative tools)

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: Delight should enhance usability, never obscure it. If users notice the delight more than accomplishing their goal, you've gone too far.

## Delight Principles

Follow these guidelines:

### Delight Amplifies, Never Blocks
- Delight moments should be quick (< 1 second)
- Never delay core functionality for delight
- Make delight skippable or subtle
- Respect user's time and task focus

### Surprise and Discovery
- Hide delightful details for users to discover
- Reward exploration and curiosity
- Don't announce every delight moment
- Let users share discoveries with others

### Appropriate to Context
- Match delight to emotional moment (celebrate success, empathize with errors)
- Respect the user's state (don't be playful during critical errors)
- Match brand personality and audience expectations
- Cultural sensitivity (what's delightful varies by culture)

### Compound Over Time
- Delight should remain fresh with repeated use
- Vary responses (not same animation every time)
- Reveal deeper layers with continued use
- Build anticipation through patterns

## Delight Techniques

Add personality and joy through these methods:

### Micro-interactions & Animation

**Button delight**:
```css
/* Satisfying button press */
.button {
  transition: transform 0.1s, box-shadow 0.1s;
}
.button:active {
  transform: translateY(2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Ripple effect on click */
/* Smooth lift on hover */
.button:hover {
  transform: translateY(-2px);
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1); /* ease-out-quart */
}
```

**Loading delight**:
- Playful loading animations (not just spinners)
- Personality in loading messages (write product-specific ones, not generic AI filler)
- Progress indication with encouraging messages
- Skeleton screens with subtle animations

**Success animations**:
- Checkmark draw animation
- Confetti burst for major achievements
- Gentle scale + fade for confirmation
- Satisfying sound effects (subtle)

**Hover surprises**:
- Icons that animate on hover
- Color shifts or glow effects
- Tooltip reveals with personality
- Cursor changes (custom cursors for branded experiences)

### Personality in Copy

**Playful error messages**:
```
"Error 404"
"This page is playing hide and seek. (And winning)"

"Connection failed"
"Looks like the internet took a coffee break. Want to retry?"
```

**Encouraging empty states**:
```
"No projects"
"Your canvas awaits. Create something amazing."

"No messages"
"Inbox zero! You're crushing it today."
```

**Playful labels & tooltips**:
```
"Delete"
"Send to void" (for playful brand)

"Help"
"Rescue me" (tooltip)
```

**IMPORTANT**: Match copy personality to brand. Banks shouldn't be wacky, but they can be warm.

### Illustrations & Visual Personality

**Custom illustrations**:
- Empty state illustrations (not stock icons)
- Error state illustrations (friendly monsters, quirky characters)
- Loading state illustrations (animated characters)
- Success state illustrations (celebrations)

**Icon personality**:
- Custom icon set matching brand personality
- Animated icons (subtle motion on hover/click)
- Illustrative icons (more detailed than generic)
- Consistent style across all icons

**Background effects**:
- Subtle particle effects
- Gradient mesh backgrounds
- Geometric patterns
- Parallax depth
- Time-of-day themes (morning vs night)

### Satisfying Interactions

**Drag and drop delight**:
- Lift effect on drag (shadow, scale)
- Snap animation when dropped
- Satisfying placement sound
- Undo toast ("Dropped in wrong place? [Undo]")

**Toggle switches**:
- Smooth slide with spring physics
- Color transition
- Haptic feedback on mobile
- Optional sound effect

**Progress & achievements**:
- Streak counters with celebratory milestones
- Progress bars that "celebrate" at 100%
- Badge unlocks with animation
- Playful stats ("You're on fire! 5 days in a row")

**Form interactions**:
- Input fields that animate on focus
- Checkboxes with a satisfying scale pulse when checked
- Success state that celebrates valid input
- Auto-grow textareas

### Sound Design

**Subtle audio cues** (when appropriate):
- Notification sounds (distinctive but not annoying)
- Success sounds (satisfying "ding")
- Error sounds (empathetic, not harsh)
- Typing sounds for chat/messaging
- Ambient background audio (very subtle)

**IMPORTANT**:
- Respect system sound settings
- Provide mute option
- Keep volumes quiet (subtle cues, not alarms)
- Don't play on every interaction (sound fatigue is real)

### Easter Eggs & Hidden Delights

**Discovery rewards**:
- Konami code unlocks special theme
- Hidden keyboard shortcuts (Cmd+K for special features)
- Hover reveals on logos or illustrations
- Alt text jokes on images (for screen reader users too!)
- Console messages for developers ("Like what you see? We're hiring!")

**Seasonal touches**:
- Holiday themes (subtle, tasteful)
- Seasonal color shifts
- Weather-based variations
- Time-based changes (dark at night, light during day)

**Contextual personality**:
- Different messages based on time of day
- Responses to specific user actions
- Randomized variations (not same every time)
- Progressive reveals with continued use

### Loading & Waiting States

**Make waiting engaging**:
- Interesting loading messages that rotate
- Progress bars with personality
- Mini-games during long loads
- Fun facts or tips while waiting
- Countdown with encouraging messages

```
Loading messages — write ones specific to your product, not generic AI filler:
- "Crunching your latest numbers..."
- "Syncing with your team's changes..."
- "Preparing your dashboard..."
- "Checking for updates since yesterday..."
```

**WARNING**: Avoid cliched loading messages like "Herding pixels", "Teaching robots to dance", "Consulting the magic 8-ball", "Counting backwards from infinity". These are AI-slop copy — instantly recognizable as machine-generated. Write messages that are specific to what your product actually does.

### Celebration Moments

**Success celebrations**:
- Confetti for major milestones
- Animated checkmarks for completions
- Progress bar celebrations at 100%
- "Achievement unlocked" style notifications
- Personalized messages ("You published your 10th article!")

**Milestone recognition**:
- First-time actions get special treatment
- Streak tracking and celebration
- Progress toward goals
- Anniversary celebrations

## Implementation Patterns

**Animation libraries**:
- Framer Motion (React)
- GSAP (universal)
- Lottie (After Effects animations)
- Canvas confetti (party effects)

**Sound libraries**:
- Howler.js (audio management)
- Use-sound (React hook)

**Physics libraries**:
- React Spring (spring physics)
- Popmotion (animation primitives)

**IMPORTANT**: File size matters. Compress images, optimize animations, lazy load delight features.

**NEVER**:
- Delay core functionality for delight
- Force users through delightful moments (make skippable)
- Use delight to hide poor UX
- Overdo it (less is more)
- Ignore accessibility (animate responsibly, provide alternatives)
- Make every interaction delightful (special moments should be special)
- Sacrifice performance for delight
- Be inappropriate for context (read the room)

## Verify Delight Quality

Test that delight actually delights:

- **User reactions**: Do users smile? Share screenshots?
- **Doesn't annoy**: Still pleasant after 100th time?
- **Doesn't block**: Can users opt out or skip?
- **Performant**: No jank, no slowdown
- **Appropriate**: Matches brand and context
- **Accessible**: Works with reduced motion, screen readers

Remember: Delight is the difference between a tool and an experience. Add personality, surprise users positively, and create moments worth sharing. But always respect usability - delight should enhance, never obstruct.

---

### /distill

> Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean. Use when...

Remove unnecessary complexity from designs, revealing the essential elements and creating clarity through ruthless simplification.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first.

---

## Assess Current State

Analyze what makes the design feel complex or cluttered:

1. **Identify complexity sources**:
   - **Too many elements**: Competing buttons, redundant information, visual clutter
   - **Excessive variation**: Too many colors, fonts, sizes, styles without purpose
   - **Information overload**: Everything visible at once, no progressive disclosure
   - **Visual noise**: Unnecessary borders, shadows, backgrounds, decorations
   - **Confusing hierarchy**: Unclear what matters most
   - **Feature creep**: Too many options, actions, or paths forward

2. **Find the essence**:
   - What's the primary user goal? (There should be ONE)
   - What's actually necessary vs nice-to-have?
   - What can be removed, hidden, or combined?
   - What's the 20% that delivers 80% of value?

If any of these are unclear from the codebase, STOP and call the AskUserQuestion tool to clarify.

**CRITICAL**: Simplicity is not about removing features - it's about removing obstacles between users and their goals. Every element should justify its existence.

## Plan Simplification

Create a ruthless editing strategy:

- **Core purpose**: What's the ONE thing this should accomplish?
- **Essential elements**: What's truly necessary to achieve that purpose?
- **Progressive disclosure**: What can be hidden until needed?
- **Consolidation opportunities**: What can be combined or integrated?

**IMPORTANT**: Simplification is hard. It requires saying no to good ideas to make room for great execution. Be ruthless.

## Simplify the Design

Systematically remove complexity across these dimensions:

### Information Architecture
- **Reduce scope**: Remove secondary actions, optional features, redundant information
- **Progressive disclosure**: Hide complexity behind clear entry points (accordions, modals, step-through flows)
- **Combine related actions**: Merge similar buttons, consolidate forms, group related content
- **Clear hierarchy**: ONE primary action, few secondary actions, everything else tertiary or hidden
- **Remove redundancy**: If it's said elsewhere, don't repeat it here

### Visual Simplification
- **Reduce color palette**: Use 1-2 colors plus neutrals, not 5-7 colors
- **Limit typography**: One font family, 3-4 sizes maximum, 2-3 weights
- **Remove decorations**: Eliminate borders, shadows, backgrounds that don't serve hierarchy or function
- **Flatten structure**: Reduce nesting, remove unnecessary containers—never nest cards inside cards
- **Remove unnecessary cards**: Cards aren't needed for basic layout; use spacing and alignment instead
- **Consistent spacing**: Use one spacing scale, remove arbitrary gaps

### Layout Simplification
- **Linear flow**: Replace complex grids with simple vertical flow where possible
- **Remove sidebars**: Move secondary content inline or hide it
- **Full-width**: Use available space generously instead of complex multi-column layouts
- **Consistent alignment**: Pick left or center, stick with it
- **Generous white space**: Let content breathe, don't pack everything tight

### Interaction Simplification
- **Reduce choices**: Fewer buttons, fewer options, clearer path forward (paradox of choice is real)
- **Smart defaults**: Make common choices automatic, only ask when necessary
- **Inline actions**: Replace modal flows with inline editing where possible
- **Remove steps**: Can signup be one step instead of three? Can checkout be simplified?
- **Clear CTAs**: ONE obvious next step, not five competing actions

### Content Simplification
- **Shorter copy**: Cut every sentence in half, then do it again
- **Active voice**: "Save changes" not "Changes will be saved"
- **Remove jargon**: Plain language always wins
- **Scannable structure**: Short paragraphs, bullet points, clear headings
- **Essential information only**: Remove marketing fluff, legalese, hedging
- **Remove redundant copy**: No headers restating intros, no repeated explanations, say it once

### Code Simplification
- **Remove unused code**: Dead CSS, unused components, orphaned files
- **Flatten component trees**: Reduce nesting depth
- **Consolidate styles**: Merge similar styles, use utilities consistently
- **Reduce variants**: Does that component need 12 variations, or can 3 cover 90% of cases?

**NEVER**:
- Remove necessary functionality (simplicity ≠ feature-less)
- Sacrifice accessibility for simplicity (clear labels and ARIA still required)
- Make things so simple they're unclear (mystery ≠ minimalism)
- Remove information users need to make decisions
- Eliminate hierarchy completely (some things should stand out)
- Oversimplify complex domains (match complexity to actual task complexity)

## Verify Simplification

Ensure simplification improves usability:

- **Faster task completion**: Can users accomplish goals more quickly?
- **Reduced cognitive load**: Is it easier to understand what to do?
- **Still complete**: Are all necessary features still accessible?
- **Clearer hierarchy**: Is it obvious what matters most?
- **Better performance**: Does simpler design load faster?

## Document Removed Complexity

If you removed features or options:
- Document why they were removed
- Consider if they need alternative access points
- Note any user feedback to monitor

Remember: You have great taste and judgment. Simplification is an act of confidence - knowing what to keep and courage to remove the rest. As Antoine de Saint-Exupéry said: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."

---

### /clarify

> Improve unclear UX copy, error messages, microcopy, labels, and instructions to make interfaces easier to understand. Us...

Identify and improve unclear, confusing, or poorly written interface text to make the product easier to understand and use.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: audience technical level and users' mental state in context.

---

## Assess Current Copy

Identify what makes the text unclear or ineffective:

1. **Find clarity problems**:
   - **Jargon**: Technical terms users won't understand
   - **Ambiguity**: Multiple interpretations possible
   - **Passive voice**: "Your file has been uploaded" vs "We uploaded your file"
   - **Length**: Too wordy or too terse
   - **Assumptions**: Assuming user knowledge they don't have
   - **Missing context**: Users don't know what to do or why
   - **Tone mismatch**: Too formal, too casual, or inappropriate for situation

2. **Understand the context**:
   - Who's the audience? (Technical? General? First-time users?)
   - What's the user's mental state? (Stressed during error? Confident during success?)
   - What's the action? (What do we want users to do?)
   - What's the constraint? (Character limits? Space limitations?)

**CRITICAL**: Clear copy helps users succeed. Unclear copy creates frustration, errors, and support tickets.

## Plan Copy Improvements

Create a strategy for clearer communication:

- **Primary message**: What's the ONE thing users need to know?
- **Action needed**: What should users do next (if anything)?
- **Tone**: How should this feel? (Helpful? Apologetic? Encouraging?)
- **Constraints**: Length limits, brand voice, localization considerations

**IMPORTANT**: Good UX writing is invisible. Users should understand immediately without noticing the words.

## Improve Copy Systematically

Refine text across these common areas:

### Error Messages
**Bad**: "Error 403: Forbidden"
**Good**: "You don't have permission to view this page. Contact your admin for access."

**Bad**: "Invalid input"
**Good**: "Email addresses need an @ symbol. Try: name@example.com"

**Principles**:
- Explain what went wrong in plain language
- Suggest how to fix it
- Don't blame the user
- Include examples when helpful
- Link to help/support if applicable

### Form Labels & Instructions
**Bad**: "DOB (MM/DD/YYYY)"
**Good**: "Date of birth" (with placeholder showing format)

**Bad**: "Enter value here"
**Good**: "Your email address" or "Company name"

**Principles**:
- Use clear, specific labels (not generic placeholders)
- Show format expectations with examples
- Explain why you're asking (when not obvious)
- Put instructions before the field, not after
- Keep required field indicators clear

### Button & CTA Text
**Bad**: "Click here" | "Submit" | "OK"
**Good**: "Create account" | "Save changes" | "Got it, thanks"

**Principles**:
- Describe the action specifically
- Use active voice (verb + noun)
- Match user's mental model
- Be specific ("Save" is better than "OK")

### Help Text & Tooltips
**Bad**: "This is the username field"
**Good**: "Choose a username. You can change this later in Settings."

**Principles**:
- Add value (don't just repeat the label)
- Answer the implicit question ("What is this?" or "Why do you need this?")
- Keep it brief but complete
- Link to detailed docs if needed

### Empty States
**Bad**: "No items"
**Good**: "No projects yet. Create your first project to get started."

**Principles**:
- Explain why it's empty (if not obvious)
- Show next action clearly
- Make it welcoming, not dead-end

### Success Messages
**Bad**: "Success"
**Good**: "Settings saved! Your changes will take effect immediately."

**Principles**:
- Confirm what happened
- Explain what happens next (if relevant)
- Be brief but complete
- Match the user's emotional moment (celebrate big wins)

### Loading States
**Bad**: "Loading..." (for 30+ seconds)
**Good**: "Analyzing your data... this usually takes 30-60 seconds"

**Principles**:
- Set expectations (how long?)
- Explain what's happening (when it's not obvious)
- Show progress when possible
- Offer escape hatch if appropriate ("Cancel")

### Confirmation Dialogs
**Bad**: "Are you sure?"
**Good**: "Delete 'Project Alpha'? This can't be undone."

**Principles**:
- State the specific action
- Explain consequences (especially for destructive actions)
- Use clear button labels ("Delete project" not "Yes")
- Don't overuse confirmations (only for risky actions)

### Navigation & Wayfinding
**Bad**: Generic labels like "Items" | "Things" | "Stuff"
**Good**: Specific labels like "Your projects" | "Team members" | "Settings"

**Principles**:
- Be specific and descriptive
- Use language users understand (not internal jargon)
- Make hierarchy clear
- Consider information scent (breadcrumbs, current location)

## Apply Clarity Principles

Every piece of copy should follow these rules:

1. **Be specific**: "Enter email" not "Enter value"
2. **Be concise**: Cut unnecessary words (but don't sacrifice clarity)
3. **Be active**: "Save changes" not "Changes will be saved"
4. **Be human**: "Oops, something went wrong" not "System error encountered"
5. **Be helpful**: Tell users what to do, not just what happened
6. **Be consistent**: Use same terms throughout (don't vary for variety)

**NEVER**:
- Use jargon without explanation
- Blame users ("You made an error" → "This field is required")
- Be vague ("Something went wrong" without explanation)
- Use passive voice unnecessarily
- Write overly long explanations (be concise)
- Use humor for errors (be empathetic instead)
- Assume technical knowledge
- Vary terminology (pick one term and stick with it)
- Repeat information (headers restating intros, redundant explanations)
- Use placeholders as the only labels (they disappear when users type)

## Verify Improvements

Test that copy improvements work:

- **Comprehension**: Can users understand without context?
- **Actionability**: Do users know what to do next?
- **Brevity**: Is it as short as possible while remaining clear?
- **Consistency**: Does it match terminology elsewhere?
- **Tone**: Is it appropriate for the situation?

Remember: You're a clarity expert with excellent communication skills. Write like you're explaining to a smart friend who's unfamiliar with the product. Be clear, be helpful, be human.

---

### /adapt

> Adapt designs to work across different screen sizes, devices, contexts, or platforms. Implements breakpoints, fluid layo...

Adapt existing designs to work effectively across different contexts - different screen sizes, devices, platforms, or use cases.

## MANDATORY PREPARATION

Invoke /impeccable — it contains design principles, anti-patterns, and the **Context Gathering Protocol**. Follow the protocol before proceeding — if no design context exists yet, you MUST run /impeccable teach first. Additionally gather: target platforms/devices and usage contexts.

---

## Assess Adaptation Challenge

Understand what needs adaptation and why:

1. **Identify the source context**:
   - What was it designed for originally? (Desktop web? Mobile app?)
   - What assumptions were made? (Large screen? Mouse input? Fast connection?)
   - What works well in current context?

2. **Understand target context**:
   - **Device**: Mobile, tablet, desktop, TV, watch, print?
   - **Input method**: Touch, mouse, keyboard, voice, gamepad?
   - **Screen constraints**: Size, resolution, orientation?
   - **Connection**: Fast wifi, slow 3G, offline?
   - **Usage context**: On-the-go vs desk, quick glance vs focused reading?
   - **User expectations**: What do users expect on this platform?

3. **Identify adaptation challenges**:
   - What won't fit? (Content, navigation, features)
   - What won't work? (Hover states on touch, tiny touch targets)
   - What's inappropriate? (Desktop patterns on mobile, mobile patterns on desktop)

**CRITICAL**: Adaptation is not just scaling - it's rethinking the experience for the new context.

## Plan Adaptation Strategy

Create context-appropriate strategy:

### Mobile Adaptation (Desktop → Mobile)

**Layout Strategy**:
- Single column instead of multi-column
- Vertical stacking instead of side-by-side
- Full-width components instead of fixed widths
- Bottom navigation instead of top/side navigation

**Interaction Strategy**:
- Touch targets 44x44px minimum (not hover-dependent)
- Swipe gestures where appropriate (lists, carousels)
- Bottom sheets instead of dropdowns
- Thumbs-first design (controls within thumb reach)
- Larger tap areas with more spacing

**Content Strategy**:
- Progressive disclosure (don't show everything at once)
- Prioritize primary content (secondary content in tabs/accordions)
- Shorter text (more concise)
- Larger text (16px minimum)

**Navigation Strategy**:
- Hamburger menu or bottom navigation
- Reduce navigation complexity
- Sticky headers for context
- Back button in navigation flow

### Tablet Adaptation (Hybrid Approach)

**Layout Strategy**:
- Two-column layouts (not single or three-column)
- Side panels for secondary content
- Master-detail views (list + detail)
- Adaptive based on orientation (portrait vs landscape)

**Interaction Strategy**:
- Support both touch and pointer
- Touch targets 44x44px but allow denser layouts than phone
- Side navigation drawers
- Multi-column forms where appropriate

### Desktop Adaptation (Mobile → Desktop)

**Layout Strategy**:
- Multi-column layouts (use horizontal space)
- Side navigation always visible
- Multiple information panels simultaneously
- Fixed widths with max-width constraints (don't stretch to 4K)

**Interaction Strategy**:
- Hover states for additional information
- Keyboard shortcuts
- Right-click context menus
- Drag and drop where helpful
- Multi-select with Shift/Cmd

**Content Strategy**:
- Show more information upfront (less progressive disclosure)
- Data tables with many columns
- Richer visualizations
- More detailed descriptions

### Print Adaptation (Screen → Print)

**Layout Strategy**:
- Page breaks at logical points
- Remove navigation, footer, interactive elements
- Black and white (or limited color)
- Proper margins for binding

**Content Strategy**:
- Expand shortened content (show full URLs, hidden sections)
- Add page numbers, headers, footers
- Include metadata (print date, page title)
- Convert charts to print-friendly versions

### Email Adaptation (Web → Email)

**Layout Strategy**:
- Narrow width (600px max)
- Single column only
- Inline CSS (no external stylesheets)
- Table-based layouts (for email client compatibility)

**Interaction Strategy**:
- Large, obvious CTAs (buttons not text links)
- No hover states (not reliable)
- Deep links to web app for complex interactions

## Implement Adaptations

Apply changes systematically:

### Responsive Breakpoints

Choose appropriate breakpoints:
- Mobile: 320px-767px
- Tablet: 768px-1023px
- Desktop: 1024px+
- Or content-driven breakpoints (where design breaks)

### Layout Adaptation Techniques

- **CSS Grid/Flexbox**: Reflow layouts automatically
- **Container Queries**: Adapt based on container, not viewport
- **`clamp()`**: Fluid sizing between min and max
- **Media queries**: Different styles for different contexts
- **Display properties**: Show/hide elements per context

### Touch Adaptation

- Increase touch target sizes (44x44px minimum)
- Add more spacing between interactive elements
- Remove hover-dependent interactions
- Add touch feedback (ripples, highlights)
- Consider thumb zones (easier to reach bottom than top)

### Content Adaptation

- Use `display: none` sparingly (still downloads)
- Progressive enhancement (core content first, enhancements on larger screens)
- Lazy loading for off-screen content
- Responsive images (`srcset`, `picture` element)

### Navigation Adaptation

- Transform complex nav to hamburger/drawer on mobile
- Bottom nav bar for mobile apps
- Persistent side navigation on desktop
- Breadcrumbs on smaller screens for context

**IMPORTANT**: Test on real devices, not just browser DevTools. Device emulation is helpful but not perfect.

**NEVER**:
- Hide core functionality on mobile (if it matters, make it work)
- Assume desktop = powerful device (consider accessibility, older machines)
- Use different information architecture across contexts (confusing)
- Break user expectations for platform (mobile users expect mobile patterns)
- Forget landscape orientation on mobile/tablet
- Use generic breakpoints blindly (use content-driven breakpoints)
- Ignore touch on desktop (many desktop devices have touch)

## Verify Adaptations

Test thoroughly across contexts:

- **Real devices**: Test on actual phones, tablets, desktops
- **Different orientations**: Portrait and landscape
- **Different browsers**: Safari, Chrome, Firefox, Edge
- **Different OS**: iOS, Android, Windows, macOS
- **Different input methods**: Touch, mouse, keyboard
- **Edge cases**: Very small screens (320px), very large screens (4K)
- **Slow connections**: Test on throttled network

Remember: You're a cross-platform design expert. Make experiences that feel native to each context while maintaining brand and functionality consistency. Adapt intentionally, test thoroughly.

---

### /optimize

> Diagnoses and fixes UI performance across loading speed, rendering, animations, images, and bundle size. Use when the us...

Identify and fix performance issues to create faster, smoother user experiences.

## Assess Performance Issues

Understand current performance and identify problems:

1. **Measure current state**:
   - **Core Web Vitals**: LCP, FID/INP, CLS scores
   - **Load time**: Time to interactive, first contentful paint
   - **Bundle size**: JavaScript, CSS, image sizes
   - **Runtime performance**: Frame rate, memory usage, CPU usage
   - **Network**: Request count, payload sizes, waterfall

2. **Identify bottlenecks**:
   - What's slow? (Initial load? Interactions? Animations?)
   - What's causing it? (Large images? Expensive JavaScript? Layout thrashing?)
   - How bad is it? (Perceivable? Annoying? Blocking?)
   - Who's affected? (All users? Mobile only? Slow connections?)

**CRITICAL**: Measure before and after. Premature optimization wastes time. Optimize what actually matters.

## Optimization Strategy

Create systematic improvement plan:

### Loading Performance

**Optimize Images**:
- Use modern formats (WebP, AVIF)
- Proper sizing (don't load 3000px image for 300px display)
- Lazy loading for below-fold images
- Responsive images (`srcset`, `picture` element)
- Compress images (80-85% quality is usually imperceptible)
- Use CDN for faster delivery

```html
<img 
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```

**Reduce JavaScript Bundle**:
- Code splitting (route-based, component-based)
- Tree shaking (remove unused code)
- Remove unused dependencies
- Lazy load non-critical code
- Use dynamic imports for large components

```javascript
// Lazy load heavy component
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**Optimize CSS**:
- Remove unused CSS
- Critical CSS inline, rest async
- Minimize CSS files
- Use CSS containment for independent regions

**Optimize Fonts**:
- Use `font-display: swap` or `optional`
- Subset fonts (only characters you need)
- Preload critical fonts
- Use system fonts when appropriate
- Limit font weights loaded

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately */
  unicode-range: U+0020-007F; /* Basic Latin only */
}
```

**Optimize Loading Strategy**:
- Critical resources first (async/defer non-critical)
- Preload critical assets
- Prefetch likely next pages
- Service worker for offline/caching
- HTTP/2 or HTTP/3 for multiplexing

### Rendering Performance

**Avoid Layout Thrashing**:
```javascript
// ❌ Bad: Alternating reads and writes (causes reflows)
elements.forEach(el => {
  const height = el.offsetHeight; // Read (forces layout)
  el.style.height = height * 2; // Write
});

// ✅ Good: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2; // All writes
});
```

**Optimize Rendering**:
- Use CSS `contain` property for independent regions
- Minimize DOM depth (flatter is faster)
- Reduce DOM size (fewer elements)
- Use `content-visibility: auto` for long lists
- Virtual scrolling for very long lists (react-window, react-virtualized)

**Reduce Paint & Composite**:
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating layout properties (width, height, top, left)
- Use `will-change` sparingly for known expensive operations
- Minimize paint areas (smaller is faster)

### Animation Performance

**GPU Acceleration**:
```css
/* ✅ GPU-accelerated (fast) */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ CPU-bound (slow) */
.animated {
  left: 100px;
  width: 300px;
}
```

**Smooth 60fps**:
- Target 16ms per frame (60fps)
- Use `requestAnimationFrame` for JS animations
- Debounce/throttle scroll handlers
- Use CSS animations when possible
- Avoid long-running JavaScript during animations

**Intersection Observer**:
```javascript
// Efficiently detect when elements enter viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible, lazy load or animate
    }
  });
});
```

### React/Framework Optimization

**React-specific**:
- Use `memo()` for expensive components
- `useMemo()` and `useCallback()` for expensive computations
- Virtualize long lists
- Code split routes
- Avoid inline function creation in render
- Use React DevTools Profiler

**Framework-agnostic**:
- Minimize re-renders
- Debounce expensive operations
- Memoize computed values
- Lazy load routes and components

### Network Optimization

**Reduce Requests**:
- Combine small files
- Use SVG sprites for icons
- Inline small critical assets
- Remove unused third-party scripts

**Optimize APIs**:
- Use pagination (don't load everything)
- GraphQL to request only needed fields
- Response compression (gzip, brotli)
- HTTP caching headers
- CDN for static assets

**Optimize for Slow Connections**:
- Adaptive loading based on connection (navigator.connection)
- Optimistic UI updates
- Request prioritization
- Progressive enhancement

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP < 2.5s)
- Optimize hero images
- Inline critical CSS
- Preload key resources
- Use CDN
- Server-side rendering

### First Input Delay (FID < 100ms) / INP (< 200ms)
- Break up long tasks
- Defer non-critical JavaScript
- Use web workers for heavy computation
- Reduce JavaScript execution time

### Cumulative Layout Shift (CLS < 0.1)
- Set dimensions on images and videos
- Don't inject content above existing content
- Use `aspect-ratio` CSS property
- Reserve space for ads/embeds
- Avoid animations that cause layout shifts

```css
/* Reserve space for image */
.image-container {
  aspect-ratio: 16 / 9;
}
```

## Performance Monitoring

**Tools to use**:
- Chrome DevTools (Lighthouse, Performance panel)
- WebPageTest
- Core Web Vitals (Chrome UX Report)
- Bundle analyzers (webpack-bundle-analyzer)
- Performance monitoring (Sentry, DataDog, New Relic)

**Key metrics**:
- LCP, FID/INP, CLS (Core Web Vitals)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Total Blocking Time (TBT)
- Bundle size
- Request count

**IMPORTANT**: Measure on real devices with real network conditions. Desktop Chrome with fast connection isn't representative.

**NEVER**:
- Optimize without measuring (premature optimization)
- Sacrifice accessibility for performance
- Break functionality while optimizing
- Use `will-change` everywhere (creates new layers, uses memory)
- Lazy load above-fold content
- Optimize micro-optimizations while ignoring major issues (optimize the biggest bottleneck first)
- Forget about mobile performance (often slower devices, slower connections)

## Verify Improvements

Test that optimizations worked:

- **Before/after metrics**: Compare Lighthouse scores
- **Real user monitoring**: Track improvements for real users
- **Different devices**: Test on low-end Android, not just flagship iPhone
- **Slow connections**: Throttle to 3G, test experience
- **No regressions**: Ensure functionality still works
- **User perception**: Does it *feel* faster?

Remember: Performance is a feature. Fast experiences feel more responsive, more polished, more professional. Optimize systematically, measure ruthlessly, and prioritize user-perceived performance.