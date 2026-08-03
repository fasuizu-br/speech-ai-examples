# C127 — company enrichment and due-diligence contract

This contract describes a public, operator-controlled preflight for resolving a company, supplier, issuer, LEI, VAT, or public procurement entity before CRM, compliance, or bid work. It is a discovery surface, not permission to access private systems.

## Public demand surfaces

- OpenCorporates: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-opencorporates-company-enrichment
- Companies House: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-companies-house-enrichment
- SEC EDGAR: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-sec-edgar-enrichment
- GLEIF LEI: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-gleif-lei-enrichment
- VIES VAT: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-vies-vat-enrichment
- Compras.gov.br: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-compras-gov-enrichment
- SAM.gov: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c127-sam-entity-enrichment

## Minimal contract

1. The operator supplies a public company name, identifier, domain, VAT, LEI, CIK, UEI, or procurement reference.
2. The preflight returns candidate matches, source URLs, freshness, and an explicit uncertainty/review state.
3. The operator verifies the official source before using the result in a CRM, bid, billing, or compliance workflow.
4. Any paid enrichment uses only an approved account and the documented provider terms.

No API keys, OAuth tokens, CUI, sanctions decisions, private customer data, or automated adverse action belong in this repository.

## Measurement contract

Measure public route visit → CTA click → completed preflight → qualified contact → checkout redirect → confirmed payment → settlement → bank reconciliation. Traffic, a public API response, a lead, or a checkout redirect is not revenue.
