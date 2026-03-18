# Ownership Chart

## asaluke.io — FitPro Platform

### Roles & Responsibilities

| Area | Founder | Dev | Ops |
|------|---------|-----|-----|
| Product vision & offer design | **Owner** | — | — |
| Pricing & revenue strategy | **Owner** | — | — |
| Content creation (programs, guides) | **Owner** | — | — |
| Marketing & user acquisition | **Owner** | — | — |
| Backend architecture | Informed | **Owner** | — |
| Authentication & security | Informed | **Owner** | — |
| Database schema & migrations | — | **Owner** | — |
| API development | — | **Owner** | — |
| Stripe integration & webhook logic | — | **Owner** | Consulted |
| Payment reconciliation | Informed | — | **Owner** |
| Customer support & disputes | Informed | — | **Owner** |
| Refund processing | Approved by Founder | — | **Owner** |
| Deployment & hosting (Vercel) | — | **Owner** | Consulted |
| Domain management (asaluke.io) | **Owner** | Consulted | — |
| Monitoring & uptime | — | Consulted | **Owner** |
| Incident response | Informed | **Owner** | Consulted |

### Decision Authority

- **Revenue decisions** (pricing, offers, discounts) → Founder only
- **Backend changes** (schema, APIs, security) → Dev only
- **Payment operations** (refunds, disputes, reconciliation) → Ops only
- **Deployments** → Dev executes, Founder approves

### Escalation Path

```
Customer issue → Ops resolves
  ↓ (if technical)
Dev investigates
  ↓ (if revenue/product impact)
Founder decides
```
