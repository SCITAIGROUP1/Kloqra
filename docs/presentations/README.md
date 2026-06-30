# Kloqra presentations

Slide decks for demos, investor updates, and technical walkthroughs.

## Files

| File                                                                 | Format              | Description                                                       |
| -------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------- |
| [kloqra-demo-and-roadmap.pdf](./kloqra-demo-and-roadmap.pdf)         | **PDF (26 slides)** | Demo + roadmap + agentic development — ready to present           |
| [kloqra-demo-and-roadmap.html](./kloqra-demo-and-roadmap.html)       | HTML                | Source for PDF; open in browser to preview                        |
| [kloqra-demo-and-roadmap.marp.md](./kloqra-demo-and-roadmap.marp.md) | Marp Markdown       | Editable source; export to PPTX via Marp CLI or VS Code extension |
| [generate-pdf.mjs](./generate-pdf.mjs)                               | Script              | Regenerate PDF from HTML                                          |

## Related docs

- **[40-minute demo script](../user-guides/demo-40min-script.md)** — full presenter notes with click paths
- **[Future plan](../architecture/KLOQRA_FUTURE_PLAN.md)** — H0–H4 roadmap detail
- **[WebSocket plan](../../.cursor/plans/websocket_notifications_guide.plan.md)** — realtime architecture

## Regenerate PDF

From repo root (requires `apps/client` devDependencies / Playwright):

```bash
node docs/presentations/generate-pdf.mjs
```

Output: `docs/presentations/kloqra-demo-and-roadmap.pdf`

## Export PowerPoint (PPTX)

**Option A — VS Code / Cursor Marp extension**

1. Install [Marp for VS Code](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
2. Open `kloqra-demo-and-roadmap.marp.md`
3. Command palette → **Marp: Export slide deck** → PPTX

**Option B — Marp CLI**

```bash
cd docs/presentations
npx @marp-team/marp-cli kloqra-demo-and-roadmap.marp.md --pptx -o kloqra-demo-and-roadmap.pptx
```

Requires Chrome/Chromium for export. On macOS:

```bash
npx @marp-team/marp-cli kloqra-demo-and-roadmap.marp.md --pptx \
  --browser-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  -o kloqra-demo-and-roadmap.pptx
```

## Slide outline (26 slides)

1. Title — Kloqra
2. Problem we solve
3. Vision & north-star outcomes
4. Guiding principles
5. Architecture
6. API modules
7. Shipped today
8. Member app demo
9. Admin app demo
10. Realtime hero moment
11. Dual transports
12. Database partitioning
13. CI/CD pipeline
14. Engineering discipline
15. Agentic development
16. WebSocket case study
17. Roadmap horizons
18. H0 Launch hardening
19. H1 Workflow excellence
20. H2 Finance & client value
21. H3 Scale
22. H4 Platform & AI
23. Success metrics
24. Risks & out of scope
25. 40-min demo run-of-show
26. Thank you

## Presenting tips

- Use **two browsers** for the realtime hero moment (slides 8–10 + live demo)
- Seed logins: `member@kloqra.dev` / `admin@kloqra.dev` / `password123`
- Demo project: **Client Portal Redesign** · task **UX research**
- Pair PDF slides 1–17 with live demo minutes 8–24 from the demo script
