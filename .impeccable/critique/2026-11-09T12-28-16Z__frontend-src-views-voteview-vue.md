---
target: голосовалка по дизайну
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:D:\\PROJECTS\\NewOpros\\newOprosFull\\frontend\\src\\views\\VoteView.vue"
target_fingerprint: "sha256:e43e7383128e98851df6abc428cf40198ca6a416fa075a71121a06b4f596351a"
target_path: "D:\\PROJECTS\\NewOpros\\newOprosFull\\frontend\\src\\views\\VoteView.vue"
timestamp: 2026-11-09T12-28-16Z
slug: frontend-src-views-voteview-vue
---
# Design critique: VoteView

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Progress disappears in the supplied short viewport |
| 2 | Match with the real world | 3 | Language is clear; round/skip rules could be explained better |
| 3 | User control and freedom | 3 | Back/edit/logout exist; no recovery after final submission |
| 4 | Consistency and standards | 3 | Main flow is coherent; progress dots have weaker affordance |
| 5 | Error prevention | 1 | Dot navigation can bypass unanswered nominations |
| 6 | Recognition rather than recall | 3 | Current context is visible; dot states carry little readable context |
| 7 | Flexibility and efficiency | 2 | Direct navigation is fast but validation and keyboard support lag |
| 8 | Aesthetic and minimalist design | 2 | Clean, but the supplied short viewport is empty and compositionally unbalanced |
| 9 | Error recovery | 2 | Inline alert exists, but recovery guidance is limited |
| 10 | Help and documentation | 1 | Little contextual explanation of skip, rounds, and finality |
| **Total** | | **22/40** | **Acceptable foundation** |

## Design Specificity Verdict

The festive illustrations, garlands, nomination copy, and round framing give the product a recognizable world. In the supplied viewport that world largely disappears, leaving a generic survey-wizard composition: dark navy background, white select, and orange pill button. The product character should survive even when peripheral decorations are cropped.

The deterministic scan returned zero findings for `VoteView.vue`. Its scope did not recursively include imported components; manual inspection found accessibility and responsive issues in the progress component. No browser overlay was available, so the screenshot and source were the visual fallback.

## Overall Impression

The interface is pleasant, focused, and already credible. Its biggest opportunity is to make the voting state feel unmistakably authored and dependable across short and mobile viewports, rather than relying on edge decoration that can disappear.

## What's Working

- Strong step hierarchy: nomination title, explanation, selection, navigation.
- Review-before-submit is appropriate protection for an irreversible ballot.
- Final-state copy is warm and explains what happens next.

## Priority Issues

1. **P1 — Step navigation bypasses required choices.** Validate every nomination before review, highlight unanswered rows, and link to the first unresolved step.
2. **P1 — Short viewports break the composition.** Allow vertical scrolling, reduce vertical spacing with height media queries, and keep progress/actions in a safe visible region.
3. **P1 — Progress dots are not sufficiently accessible.** Give each a 44px hit area, descriptive `aria-label`, `aria-current`, visible focus, and non-color state cues.
4. **P2 — Product personality disappears with peripheral decoration.** Place one compact festive accent near the title or progress.
5. **P2 — Select width in the supplied screenshot overwhelms the page.** Confirm the current 560px wrapper is deployed and effective.

## Persona Red Flags

- **Jordan (first-timer):** rules and progress are unclear when the progress strip is cropped; skip is hidden inside the select.
- **Sam (keyboard/screen reader):** small icon-only dots rely on title/color and lack step semantics.
- **Casey (mobile/short viewport):** actions can wrap, progress targets are tiny, and overflow may crop the flow in landscape.

## Minor Observations

- Logout placement can compete with progress.
- Empty alert space creates a gap before an error exists.
- “Назад / Далее” would scan faster than the longer navigation labels.
- Large nomination counts need progress wrapping or scrolling.

## Questions to Consider

- Should the brand still be recognizable when all edge decoration is removed?
- Would names benefit from a role, photo, or short reminder of who the candidate is?
- Is free step-jumping worth keeping if unresolved choices are not yet handled safely?
