# C125 contact-center transcript contract

This is a provider-neutral, opt-in contract for turning an authorized call event or recording URL into a reviewable Portuguese (Brazil) transcript.

## Flow

1. The operator configures the provider's own webhook or callback.
2. The payload is checked for signature, consent, tenant, object ID, and retention policy.
3. The operator supplies the authorized recording or a synthetic fixture.
4. Transcreve BR returns transcript text plus optional SRT/VTT; the operator reviews before sharing or writing back.

The contract does not request credentials, scrape private workspaces, or imply provider approval.

## Minimum event shape

~~~json
{
  "provider": "dialpad|talkdesk|cloudtalk|justcall|ringcentral|twilio|vonage",
  "event_type": "call.completed|recording.completed",
  "object_id": "operator-owned-id",
  "recording_url": "https://operator-controlled.example/recording",
  "consent": true,
  "language": "pt-BR"
}
~~~

recording_url must be an authorized, time-limited URL. Do not paste customer recordings, API keys, OAuth tokens, phone numbers, or personal data into an issue.

## C125 demand pages

- [Dialpad](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-dialpad-call-transcript/)
- [Talkdesk](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-talkdesk-call-recording/)
- [CloudTalk](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-cloudtalk-call-transcript/)
- [JustCall](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-justcall-call-completed/)
- [RingCentral](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-ringcentral-recording-handoff/)
- [Twilio](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-twilio-flex-call-transcript/)
- [Vonage](https://one-percent-lab.fabiosuizu.chatgpt.site/transcreve/integracoes/c125-vonage-call-recording/)

A click is an interest signal, not proof of installation, approval, or revenue.