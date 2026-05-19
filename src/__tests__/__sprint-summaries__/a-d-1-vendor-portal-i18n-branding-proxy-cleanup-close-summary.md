# Sprint T-Phase-1.A-d.1 · Vendor Portal · i18n + Branding + Proxy Cleanup · CLOSE SUMMARY

**Predecessor HEAD**: f1e06c95 · "Fixed vendorComplianceKey key"
**Target label**: Sprint A-d.1 · A-d arc opens · Phase 1 polish layer
**Streak target**: 20th consecutive A first-pass-clean
**Arc**: A-d (final arc of Sprint A · Phase 1 closure)

## Triple Gate Result

| Gate     | Target              | Actual              | Status |
| -------- | ------------------- | ------------------- | ------ |
| TSC      | 0 errors            | 0 errors            | ✅     |
| ESLint   | 0 errors / 0 warns  | 0 errors / 0 warns  | ✅     |
| Vitest   | 1211 / 165 / 0 IDENTICAL | 1211 / 165 / 0 | ✅     |
| Build    | clean               | (auto-gated)        | ✅     |

**20th A first-pass-clean banked.**

## Files

- NEW src/pages/vendor-portal/VendorLocaleToggle.tsx
  (D-NEW-EE · vendor-scoped LocaleToggle · uses getVendorSession().entity_code ·
   D-272 boundary safe · no useERPCompany dep)
- DELETED src/pages/vendor-portal/VendorPortalShell.tsx (D-NEW-DZ deprecation proxy removed)
- DELETED src/pages/vendor-portal/VendorPortalLogin.tsx (D-NEW-DZ deprecation proxy removed)
- UPDATE src/data/i18n/en.ts (~75 vendor-portal keys appended)
- UPDATE src/data/i18n/hi.ts (~75 vendor-portal keys appended · Devanagari · U4 parity)
- UPDATE src/index.css (--vendor-gradient-from/to · --vendor-accent-glow tokens)
- UPDATE src/pages/vendor-portal/VendorPortalLayout.tsx
  (labelKey/labelFallback NAV pattern · VendorLocaleToggle mounted top bar)
- UPDATE src/pages/vendor-portal/VendorLogin.tsx (useT + LocaleToggle pre-auth)
- UPDATE src/pages/vendor-portal/VendorDashboard.tsx (useT)
- UPDATE src/pages/vendor-portal/VendorEnquiryResponse.tsx (useT)
- UPDATE src/pages/vendor-portal/VendorBidSubmission.tsx (useT)
- UPDATE src/pages/vendor-portal/VendorPOView.tsx (useT)
- UPDATE src/pages/vendor-portal/VendorKYCManagement.tsx (useT)
- UPDATE src/pages/vendor-portal/VendorInvoiceUpload.tsx (useT)

## D-NEW-DZ · Deprecation Proxy Cleanup

Block 0 grep #6 confirmed ZERO consumers of './VendorPortalShell' or
'./VendorPortalLogin' across src/. Both proxy files safely deleted ·
A-c.1 sunset clock satisfied · external portal codebase now single-source.

## D-NEW-EE · Vendor-Scoped LocaleToggle

ERPHeader's LocaleToggle depends on useERPCompany (internal-only context ·
D-272 boundary). Vendor portal needs its own toggle scoped to
session.entity_code with graceful fallback to 'system' pre-auth (Login page).
i18n-engine consumed read-only · getLocale/setLocale unchanged.

## i18n Coverage (A-d-Q11=B Hindi-only Phase 1)

- 8 vendor pages wired with useT()
- ~75 new keys @ EN+HI parity (vendor.* namespace)
- LocaleToggle mounted: top bar (authenticated) + Login (pre-auth) per A-d-Q9=D
- U3 (>=200 keys) + U4 (EN/HI parity) tests pass

## Branding Tokens

CSS custom properties added to :root and .dark in src/index.css:
- --vendor-gradient-from / --vendor-gradient-to (HSL)
- --vendor-accent-glow (HSL with alpha)

Available for vendor-portal component theming · respects existing
semantic token system · no hardcoded hex.

## A-d Arc Status

A-d.1 banked. A-d arc remains open for subsequent polish sprints
(remaining vendor pages, additional branding refinements as scoped).
External Portal Phase 1 FEATURE COMPLETE (from A-c.3) · A-d layers polish.

## Streak

20th consecutive Sprint A first-pass-clean.
D-NEW-DX 4-validation pattern (A-b.2 · A-c.1 · A-c.2 · A-c.3) carried forward
into A-d.1 pre-flight (9 Block 0 greps · 0 stop conditions hit).
