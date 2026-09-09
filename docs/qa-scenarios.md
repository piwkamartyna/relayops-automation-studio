# QA scenario matrix

| ID | Input | Expected result |
| --- | --- | --- |
| QA-01 | Valid enterprise lead, score 86 | Priority route, three actions completed |
| QA-02 | Valid small-business lead, score 44 | Nurture route, three actions completed |
| QA-03 | Enrichment timeout on attempt 1 | Retry succeeds, run marked recovered |
| QA-04 | Same idempotency key received twice | Second event skipped, no duplicate actions |
| QA-05 | Missing contact email | Validation error, no enrichment or actions |
| QA-06 | Consent is false | CRM-only update, outbound actions suppressed |
| QA-07 | Enrichment returns 429 | Retry respects backoff and rate-limit header |
| QA-08 | Enrichment fails permanently | Event enters dead-letter queue with context |
| QA-09 | CRM succeeds but Slack fails | CRM is not repeated during action replay |
| QA-10 | Required scoring input is missing | Event routed to human review |
| QA-11 | Unknown payload field appears | Field ignored and schema warning recorded |
| QA-12 | Rule version changes mid-run | Original version remains attached to decision |
