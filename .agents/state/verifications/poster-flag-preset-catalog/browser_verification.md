# Browser Verification

- Surface: local Next.js Studio with a temporary in-memory API
- Browser: connected in-app browser
- Result: pass

## Interaction

1. Opened `/studio`.
2. Selected `Country flags`.
3. Selected `United States`.
4. Selected `Dark`.
5. Reloaded in a fresh tab.

## Readback

- Country flags `aria-checked`: `true`
- Selected country: `United States`
- Selected variant: `Dark`
- Final cold-load console errors: `0`

## Failure characterization

The pre-fix reload reproduced a React hydration mismatch because browser
localStorage was read during the initial render. The revised post-mount,
cancellable hydration handoff removed the mismatch.

Playwright CLI could not launch Chromium in the managed Windows sandbox and
failed with `spawn EPERM` before any application assertion. It is not counted
as application evidence.
