# C128 · MCP and automation recipes

This is a provider-neutral recipe for builders who want to call a public
company-enrichment Actor from an automation or MCP workflow.

## Surfaces

- Apify MCP discovery: https://docs.apify.com/integrations/mcp
- Apify integrations and webhooks: https://docs.apify.com/integrations
- n8n Apify integration examples: https://n8n.io/integrations/apify/
- Make + Apify: https://www.make.com/en/integrations/make/apify
- Zapier + Apify: https://zapier.com/apps/Apify/integrations
- Official MCP Registry: https://registry.modelcontextprotocol.io/

## Safe flow

1. Discover the Actor or endpoint without a token.
2. Configure credentials only in the operator's own client or secret store.
3. Send one authorized public domain or synthetic fixture.
4. Review the result and provenance before writing to a CRM, sheet, or
   procurement system.
5. Treat a run, click, or workflow import as activation evidence only; payment
   requires a first-party checkout or the platform's own settled payout.

No provider approval, installation, integration, or revenue is claimed by this
file. It requests no credentials and performs no third-party writes.
