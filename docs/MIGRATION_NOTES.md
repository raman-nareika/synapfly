# Migration notes from supplied archive

## Kept
- Pure engine approach
- Skia gameplay renderer
- landscape layout
- menu/settings/game-over/leaderboard flow
- HP/healing/score/panic concepts
- Neural View concept
- local logical stage size 844×390

## Changed
- JavaScript -> TypeScript
- AsyncStorage removed
- Zustand added for app state
- MMKV v4 added for persistence
- official MMKV `StateStorage` adapter used with Zustand persist middleware
- MMKV Nitro dependency added
- teal/dusk -> light/dark themes; light default
- fixed missing `inkRGB` token bug
- external TTF requirement removed; system fonts are used
- input upgraded from tap-only to press start/end so short taps and holds can differ
- attached press is consumed as detach-only
- detach vertical direction is based on ceiling/floor anchor
- reattach guard now uses both time and separation distance
- landing now requires approaching the surface
- landing thresholds tightened for meaningful low-speed landing
- collision substeps are dynamic rather than a fixed count
- panic 11-HP edge case always has a real cost
- panic event reports the actual visible HP drop; stats also track net penalty vs HP-at-landing
- haptics are triggered once per event ID rather than repeatedly while an event TTL is high
- stage is centered/letterboxed on differing aspect ratios

## Deferred intentionally
- complex organic/polygonal obstacles
- auto-generated crawl paths
- real neural asset backgrounds
- extracted MaleCNS graph and neural simulation
- online services
