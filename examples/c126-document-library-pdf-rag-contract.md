# C126 — document-library PDF→Markdown/RAG opt-in contract

This public contract describes a buyer-owned workflow for turning authorized document-library files into reviewable Markdown/RAG artifacts. It is a discovery and qualification surface, not an authorization to access private content.

## Supported demand surfaces

- SharePoint / Microsoft Graph driveItem: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-sharepoint-pdf-rag/
- Box webhooks and file content: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-box-pdf-rag/
- Dropbox change notifications: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-dropbox-pdf-rag/
- Confluence attachments: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-confluence-pdf-rag/
- Egnyte file-system events: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-egnyte-pdf-rag/
- Google Drive push notifications: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-google-drive-pdf-rag/
- Coda page-content export: https://one-percent-lab.fabiosuizu.chatgpt.site/integracoes/c126-coda-pdf-rag/

## Minimal input and output

1. The operator selects a file or page in an account they control.
2. The operator supplies an explicit, least-privilege export or download result.
3. The workflow converts the supplied bytes to Markdown, preserves page/section provenance, and returns a reviewable artifact.
4. The operator verifies the result before using it in search, RAG, or downstream automation.

No credentials, OAuth tokens, private fixtures, or third-party account access belong in this repository. A failed authorization, webhook, parser, or source download is a qualification result—not a reason to bypass the provider.

## Measurement contract

Measure the sequence: public route visit → CTA click → authorized fixture/demo → completed conversion → checkout redirect → confirmed payment → settlement → bank reconciliation. A page view, signup, lead, or checkout redirect is not revenue.

Source implementation is intentionally provider-neutral; each route links to the provider's official API documentation and exposes an owned, no-card qualification CTA.
