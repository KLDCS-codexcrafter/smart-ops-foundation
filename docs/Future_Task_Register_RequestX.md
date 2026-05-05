# Future Task Register — RequestX & Card #8 Augmentation
**Created:** Sprint 8-pre-3 · Block C · D-417
**Source:** Card #8 closure scoping + carry-over from 8-pre-1 mobile + 8-pre-2 polish

| ID | Title | Concern | Est. LOC | Notes |
|----|-------|---------|----------|-------|
| FT-RX-001 | ServiceRequest mobile capture | 8-pre-1 partial · only Material + ApprovalInbox in scope | ~280 | Mirrors MobileMaterialIndentCapture 3-step pattern · 'service' kind |
| FT-RX-002 | CapitalIndent mobile capture | 8-pre-1 partial · capital indents typically office-bound | ~280 | Mirrors pattern · 'capital' kind · 5 sub-types |
| FT-RX-003 | Indent → Inward Receipt back-reference | Cross-card linkage · IR has indent_id but RequestX doesn't show "fulfilled by IR-X" | ~80 | Read-only join · adds "Fulfilled by" column |
| FT-RX-004 | Approval push notifications | Phase 2 · current mobile pulls fresh data on render | ~120 | WebPush + SW · stub Phase 1 · real Phase 2 |
| FT-RX-005 | Print templates (PDF) for indents | Physical sign-off needs printed indent | ~150 | jsPDF or react-pdf · 3 templates |
| FT-RX-006 | Posted-voucher cancel via finecore-engine | D-410 cancelIndent is DRAFT-only · post-submit needs finecore.cancelVoucher | ~60 | Wraps finecore · audit-trail in approval_history |

**Total est. LOC:** ~970 across 6 entries · all Phase 2 or follow-up sprint candidates.

**Source:** Card #8 closure scoping · 8-pre-1 + 8-pre-2 deferrals.
