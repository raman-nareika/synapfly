# Synapfly MVP v0.1 specification

## Product goal
A one-touch 2D endless arcade game inspired by Flappy Bird, but centered on fly-like flight, landing on obstacle surfaces, HP recovery while perched, and MaleCNS-inspired autonomous reactions.

## World/camera
- World coordinates are authoritative.
- Screen X = world X - camera X.
- Camera horizontal speed follows fly horizontal speed with smoothing.
- Fly is not hard-locked to one X coordinate.
- Camera catch-up prevents the fly from reaching/passing the right edge.
- When fly speed < camera speed, the fly drifts left on screen.

## Controls
- Tap in flight: immediate upward impulse + small horizontal speed gain.
- Rapid taps: gain horizontal speed and altitude.
- Hold: after a short threshold, add lift while braking horizontal speed.
- Attached tap: detach only; no flap on the same press.

## Physics
- Fly has x/y, vx/vy, pitch and HP.
- HP never changes physics.
- Max HP = 100.
- Rectangular obstacles only in MVP.
- Top/bottom screen bands are solid and attachable.

## Collision/landing
- Approximate fly collider: circle.
- Obstacle collider: AABB.
- Dynamic substeps reduce tunneling.
- Contact is decomposed into normal/tangential velocity.
- Attach only when approaching the surface and both landing thresholds pass.
- Otherwise apply speed-dependent damage and bounce.
- Minimum collision damage is `MIN_HIT_DAMAGE` (initially 10 HP).
- Attach is allowed on top/bottom/left/right faces.
- Note: horizontal velocity has a positive floor (never goes negative) by design, since the fly always scrolls rightward through the world. In normal one-directional gameplay this means only top/bottom/left faces are ever actually reached; the right face is geometrically supported by the AABB collider but is not reachable through ordinary play.
- Sprite rotates to the attached face.

## Detach
- Detach offsets the fly a few pixels along the surface normal.
- Ceiling-anchored obstacle: after detach, fly initially moves/falls downward.
- Floor-anchored obstacle: after detach, fly initially moves upward.
- Remember exact previous obstacle+face.
- Reattach to that face is blocked until BOTH enough time and enough separation distance have elapsed.
- Collider remains active during the lock.

## Perching / risk-reward
- While attached: heal HP, capped at 100.
- While attached: score grows continuously.
- Longer sit increases heal rate and score multiplier.
- As screen position approaches the left danger zone, autonomous crawl begins.
- On horizontal faces, crawl right relative to obstacle.
- On vertical face of ceiling obstacle, crawl down.
- On vertical face of floor obstacle, crawl up.
- Crawling buys time only; it cannot fully cancel scrolling.
- Crawl never performs normal detach.

## Emergency/panic escape
Two settings:

### HP penalty (default)
- Auto-detach at critical left-screen threshold.
- Store HP at initial landing (`H0`).
- Healing during the perch may raise current HP (`H1`).
- Final panic HP is calculated from `H0`, not `H1`; this automatically removes all healing from that obstacle.
- Random penalty percentage grows with `H0`, so higher starting HP means a larger absolute penalty.
- If `H0 > MIN_HIT_DAMAGE`, keep final HP above the weak-hit threshold when mathematically possible while still imposing a real loss.
- If `H0 <= MIN_HIT_DAMAGE`, final HP must remain below that threshold.
- Final HP >= 1.

### Fatal
- Keep the panic reaction animation/logic, but end the run.

## MaleCNS-inspired layer in MVP
Use heuristic signals for:
- looming -> LC4/LPLC2
- threat/panic -> DNp01
- landing preparation -> DNp07/DNp10
- landing-ready leg pose
- crawling/danger pose

Do NOT describe this MVP as actually simulating the full MaleCNS connectome.

## Themes
- Light is default.
- Dark is optional in Settings.
- Renderer geometry is identical across themes.
- Final neural/brain art backgrounds are post-MVP polish.

## Persistence
Persist with Zustand + react-native-mmkv:
- theme
- panic mode
- forgiveness
- neural view
- scores
- last result

Do not persist active run state.

## Acceptance criteria
1. Fresh install opens menu in landscape and light theme.
2. Tap starts a run; repeated taps clearly increase speed.
3. Hold visibly reduces horizontal speed relative to rapid tapping.
4. Fly can land on all four faces of a rectangle at safe speed.
5. High-speed collision damages instead of always killing instantly.
6. HP and score increase while perched.
7. Crawl behavior matches obstacle anchor and surface orientation.
8. One tap detaches; no immediate same-face reattach.
9. Panic penalty is random, proportional, and obeys the MIN_HIT_DAMAGE boundary rule.
10. Local top scores survive app restart through MMKV.

## Rendering / runtime conventions
- Logical gameplay stage size for MVP: `844×390`.
- Center/letterbox the logical stage when the device aspect ratio differs; do not stretch gameplay coordinates non-uniformly.
- No external custom TTF files are required for MVP; system fonts are acceptable.
- Theme data must expose all color values consumed by the renderer; avoid implicit/missing derived tokens.
- Haptics are event-based: one game event occurrence should produce at most one corresponding haptic trigger.

## Collision robustness
- Anti-tunneling work must scale with per-frame displacement. Dynamic substeps are acceptable for MVP; an equivalent swept approach is also acceptable.
- Do not rely on a fixed coarse number of collision substeps at all speeds.

## Panic feedback details
- Panic rescue must always impose a real loss relative to `H0` when `H0 > 1`.
- Edge case: when `H0 = MIN_HIT_DAMAGE + 1`, preserving HP strictly above the weak-hit threshold is mathematically incompatible with imposing a loss; the real loss takes priority, so ending at the threshold is allowed.
- If UI shows a panic damage number, show the actual visible HP drop from current healed HP to final panic HP. Internal stats may separately track the net panic cost relative to `H0`.

## Starter-code status
The repository may already contain code for some or all of these behaviors. That code is a starter baseline, not an acceptance signal. The first implementation pass must verify behavior against this document on a real native/dev build.
