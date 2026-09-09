# Workflow contract

## Trigger

`lead.form_submitted` arrives through an authenticated webhook.

Required fields:

- `event_id`
- `idempotency_key`
- `occurred_at`
- `source`
- `contact.email`
- `contact.consent`
- `company.name`

## Decision rule

The demo score is calculated from synthetic company fit and intent signals.

```text
priority_score = company_fit + product_intent + source_quality
```

- Score `>= 70`: priority route
- Score `< 70`: nurture route
- Missing required decision inputs: human review

## Priority route

1. Upsert contact and company in the CRM.
2. Write score, source, lifecycle stage and rule version.
3. Post a context-rich alert to the sales channel.
4. Create an owner task with a 30-minute SLA.

## Nurture route

1. Upsert the contact and set lifecycle stage to nurture.
2. Enroll the contact in a three-step email sequence.
3. Log the decision reason and rule version.

## Suppression rules

No outbound message is sent when consent is false, the address is invalid or the contact is on a suppression list. The event still receives a traceable terminal status.
