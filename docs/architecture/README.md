# Architecture Diagrams

SVG architecture diagrams embedded in the resume web app for each of the 5
portfolio projects (PJ1–PJ5).

## Source of truth

The canonical source is **`scripts/build_architecture_svgs.py`** at the repo
root. It emits SVG files programmatically from a structured layout description
(services, groups, arrows, notes) so the 5 diagrams stay visually consistent.

## Regenerate

```bash
python3 scripts/build_architecture_svgs.py
```

Outputs:

- `app/public/architecture/pj1.svg` — PJ1 EC site foundation (3-tier AWS)
- `app/public/architecture/pj2.svg` — PJ2 Monitoring & Job platform
- `app/public/architecture/pj3.svg` — PJ3 Container platform + GitHub Actions CI/CD
- `app/public/architecture/pj4.svg` — PJ4 File integration via Transfer Family + Lambda
- `app/public/architecture/pj5.svg` — PJ5 Sales management system (Java / Spring Boot, logical)

The SVGs are served by Vite under `/architecture/*.svg`.

## Visual conventions

- **Category colors** follow the official AWS 2026 brand palette
  (see `providers/aws/reference/aws-colors.md` in the `cloud-diagram` skill):
  Compute `#ED7100`, Storage `#7AA116`, Database `#C925D1`,
  Networking `#8C4FFF`, Security `#DD344C`, Integration `#E7157B`,
  Migration `#01A88D`, Management `#E7157B`.
- **Boundary groups**: VPC (solid `#8C4FFF`), Region (dashed `#00A4A6`),
  AZ (dashed `#00A4A6`), Public subnet (solid `#7AA116` on pale green fill),
  Private subnet (solid `#00A4A6` on pale blue fill).
- **Arrow kinds**: solid for primary data/request flow, dashed for
  control/config/assume/logs (secondary relationships).

## Resume ↔ diagram mapping

Each diagram elaborates the resume's listed technologies with industry-standard
fill-in (Multi-AZ layout, NAT GWs, ACM certificates, OIDC federation, VPC
endpoints, etc.). The web app's project page shows an explicit breakdown per
diagram under `職務経歴書から` (from resume) vs. `標準プラクティスとして補完`
(standard practice fill-in) so viewers can see which elements are resume-backed
vs. industry elaboration.
