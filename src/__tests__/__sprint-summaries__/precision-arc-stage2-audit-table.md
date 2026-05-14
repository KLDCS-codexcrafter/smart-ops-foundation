# Precision Arc · Stage 2 · Audit Table

Predecessor HEAD: 2f38e89  ·  Total sites scanned: 1101
Pattern counts: toFixed=359 · parseFloat=281 · Math.round=461

Class counts: A=9 · B=420 · C=287 · D=385

Rubric:
- **A** already-correct (calls round2/Decimal helpers in same expression)
- **B** display-only (render/format/UI percentage)
- **C** non-money non-critical (counts, indices, ms timings)
- **D** genuine bypass defect (money math without precision contract) — needs-founder-ruling


## Class D (385)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/hooks/useCurrencies.ts:199 | toFixed | `if (!c) return amount.toFixed(2);` | toFixed on money in engine — bypasses round2 |
| src/hooks/useCurrencies.ts:200 | toFixed | `const formatted = parseFloat(amount.toFixed(c.decimal_places))` | toFixed on money in engine — bypasses round2 |
| src/lib/bill-passing-engine.ts:139 | toFixed | `reason = `Rate variance ₹${rate_variance.toFixed(2)} (${ratePct.toFixed(2)}%)`;` | toFixed on money in engine — bypasses round2 |
| src/lib/bill-passing-engine.ts:142 | toFixed | `reason = `Tax mismatch ₹${taxDelta.toFixed(2)}`;` | toFixed on money in engine — bypasses round2 |
| src/lib/bill-passing-engine.ts:145 | toFixed | `reason = `Total variance ₹${total_variance.toFixed(2)} (${totalPct.toFixed(2)}%)`;` | toFixed on money in engine — bypasses round2 |
| src/lib/bill-passing-engine.ts:340 | toFixed | `notes: `Bill ${bill.bill_no} variance ${totals.variance_pct.toFixed(2)}% vs PO ${bill.po_no}`,` | toFixed on money in engine — bypasses round2 |
| src/lib/bill-passing-engine.ts:448 | toFixed | `notes: `Re-match: bill ${cur.bill_no} variance ${totals.variance_pct.toFixed(2)}%`,` | toFixed on money in engine — bypasses round2 |
| src/lib/bank-file-engine.ts:257 | toFixed | `amount:                 req.amount.toFixed(2),` | toFixed on money in engine — bypasses round2 |
| src/lib/freight-calc-engine.ts:152 | toFixed | ``Adjusted rate: ₹${adjustedRate.toFixed(2)}/kg`,` | toFixed on money in engine — bypasses round2 |
| src/lib/irn-engine.ts:197 | toFixed | `errors.push(`Line item total (${lineSum.toFixed(2)}) must match invoice total (${payload.ValDtls.TotInvVal.toFixed(2)}) within ₹1`);` | toFixed on money in engine — bypasses round2 |
| src/lib/payment-gateway-engine.ts:122 | toFixed | `am: amount.toFixed(2),` | toFixed on money in engine — bypasses round2 |
| src/lib/site-health-score-engine.ts:68 | toFixed | `cost: { score: adjustedCost, weight: 0.20, evidence: `cost/budget=${costRatio.toFixed(2)} · imprest=${imp.health_score_contribution}` },` | toFixed on money in engine — bypasses round2 |
| src/lib/fincore-engine.ts:101 | toFixed | `errors.push(`Voucher not balanced: Dr ₹${totalDr.toFixed(2)} ≠ Cr ₹${totalCr.toFixed(2)} (diff ₹${totalDr.minus(totalCr).abs().toFixed(2)})`` | toFixed on money in engine — bypasses round2 |
| src/lib/fincore-engine.ts:114 | toFixed | `errors.push(`Voucher not balanced: Dr ₹${totalDr.toFixed(2)} ≠ Cr ₹${totalCr.toFixed(2)} (diff ₹${totalDr.minus(totalCr).abs().toFixed(2)})`` | toFixed on money in engine — bypasses round2 |
| src/lib/rate-contract-engine.ts:196 | toFixed | `recommendation: `Invoice rate ₹${invoiceLine.invoice_rate} exceeds ceiling ₹${line.ceiling_rate} (${variancePct.toFixed(2)}% above agreed ₹$` | toFixed on money in engine — bypasses round2 |
| src/lib/rate-contract-engine.ts:208 | toFixed | `: `Within contract ${contract.contract_no} (${variancePct >= 0 ? '+' : ''}${variancePct.toFixed(2)}% vs agreed · within ceiling).`,` | toFixed on money in engine — bypasses round2 |
| src/lib/gst-portal-service.ts:364 | parseFloat | `const amtPaid = parseFloat(f[5] \|\| "0") \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/lib/gst-portal-service.ts:365 | parseFloat | `const taxDed = parseFloat(f[6] \|\| "0") \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/lib/gst-portal-service.ts:371 | parseFloat | `tds_deposited: parseFloat(f[7] \|\| "0") \|\| 0,` | parseFloat on money — needs-founder-ruling |
| src/lib/pdf-invoice-extractor.ts:152 | parseFloat | `const num = parseFloat(m[1].replace(/,/g, ''));` | parseFloat on money — needs-founder-ruling |
| src/lib/pdf-invoice-extractor.ts:159 | parseFloat | `.map(n => parseFloat(n.replace(/,/g, '')))` | parseFloat on money — needs-founder-ruling |
| src/lib/pdf-invoice-extractor.ts:172 | parseFloat | `const num = parseFloat(m[1]);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/transactions/MaterialIssueNote.tsx:843 | parseFloat | `onChange={e => setDraftLine(d => ({ ...d, rate: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/transactions/GRNEntry.tsx:1159 | parseFloat | `onChange={e => setDraftLine(l => ({ ...l, unit_rate: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/transactions/ConsumptionEntry.tsx:905 | parseFloat | `onChange={e => setDraftLine(d => ({ ...d, rate: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/foundation/OrgStructureHub.tsx:561 | parseFloat | `onChange={e => setDeptForm(f => ({ ...f, budget: e.target.value ? parseFloat(e.target.value) \|\| null : null }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/VendorMaster.tsx:628 | parseFloat | `onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/VendorMaster.tsx:802 | parseFloat | `onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/VendorMaster.tsx:1113 | parseFloat | `onChange={e => setForm(f => ({ ...f, lower_deduction_rate: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/LogisticMaster.tsx:661 | parseFloat | `onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/LogisticMaster.tsx:1029 | parseFloat | `onChange={e => setForm(f => ({ ...f, freightRateTolerance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/LogisticMaster.tsx:1117 | parseFloat | `onChange={e => setRateForm(f => ({ ...f, rate: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/LogisticMaster.tsx:1123 | parseFloat | `onChange={e => setRateForm(f => ({ ...f, minimumCharge: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/CustomerMaster.tsx:779 | parseFloat | `onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/CustomerMaster.tsx:982 | parseFloat | `onChange={e => setForm(f => ({ ...f, openingBalance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/CustomerMaster.tsx:990 | parseFloat | `onChange={e => setForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/CustomerMaster.tsx:1241 | parseFloat | `onChange={e => setForm(f => ({ ...f, agreedFreightRate: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/masters/CustomerMaster.tsx:1251 | parseFloat | `onChange={e => setForm(f => ({ ...f, freightRateTolerance: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:864 | parseFloat | `<TableCell><Input type="number" value={it.rate} onChange={e => updateLine(i, { rate: parseFloat(e.target.value) \|\| 0 })} onKeyDown={onEnte` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:867 | parseFloat | `<TableCell><Input type="number" value={it.tax_pct} onChange={e => updateLine(i, { tax_pct: parseFloat(e.target.value) \|\| 0 })} onKeyDown={` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/StorageMatrix.tsx:233 | parseFloat | `<div className='space-y-1.5'><Label>Total Capacity</Label><Input type='number' value={gf.total_capacity\|\|''} onChange={e=>setGf(f=>({...f,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/StorageMatrix.tsx:250 | parseFloat | `<Input type='number' value={af.monthly_rent\|\|''} onChange={e=>{const r=parseFloat(e.target.value)\|\|null;setAf(f=>({...f,monthly_rent:r})` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/StorageMatrix.tsx:253 | parseFloat | `<div className='space-y-1.5'><Label>Escalation %/Year</Label><Input type='number' placeholder='5' value={af.escalation_rate\|\|''} onChange=` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/StorageMatrix.tsx:267 | parseFloat | `<div className='space-y-1.5'><Label>TDS Rate (%)</Label><Input type='number' value={af.tds_rate\|\|''} onChange={e=>setAf(f=>({...f,tds_rate` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/StockMatrix.tsx:280 | parseFloat | `<Input type='number' value={form.cess_rate??''} onKeyDown={onEnterNext} onChange={e=>setForm(f=>({...f,cess_rate:parseFloat(e.target.value)\` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/EnquiryCapture.tsx:801 | parseFloat | `onChange={e => updateItem(i, { rate: parseFloat(e.target.value) \|\| null })}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/EnquiryCapture.tsx:852 | parseFloat | `onChange={e => updateItem(i, { amount: parseFloat(e.target.value) \|\| 0, rate: parseFloat(e.target.value) \|\| 0, quantity: 1 })}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/fincore/reports/gst/ITCRegister.tsx:202 | parseFloat | `onChange={e => setReversalAmount(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/fincore/reports/gst/GSTR9.tsx:66 | parseFloat | `const n = parseFloat(val);` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/OpeningLedgerBalanceModule.tsx:432 | parseFloat | `const v = parseFloat(e.target.value) \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/OpeningLedgerBalanceModule.tsx:444 | parseFloat | `const v = parseFloat(e.target.value) \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/OpeningLedgerBalanceModule.tsx:554 | parseFloat | `onBlur={(e) => updateBill(b.id, 'amount', parseFloat(e.target.value) \|\| 0)} />` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/OpeningLedgerBalanceModule.tsx:603 | parseFloat | `onBlur={(e) => updateBill(b.id, 'tds_amount', parseFloat(e.target.value) \|\| 0)} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:135 | parseFloat | `const newPrice = parseFloat(rawVal);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:185 | parseFloat | `const pct = parseFloat(fillPct);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:196 | parseFloat | `const disc = parseFloat(fillPct);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:266 | parseFloat | `const price = parseFloat(itemForm.price);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:272 | parseFloat | `min_qty: itemForm.min_qty ? parseFloat(itemForm.min_qty) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:273 | parseFloat | `discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:285 | parseFloat | `min_qty: itemForm.min_qty ? parseFloat(itemForm.min_qty) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:286 | parseFloat | `discount_percent: itemForm.discount_percent ? parseFloat(itemForm.discount_percent) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/fincore/reports/TDSAdvance.tsx:91 | parseFloat | `amount: parseFloat(challanForm.amount) \|\| 0,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:78 | parseFloat | `if (row.batches.length > 0 && row.batches.some(b => parseFloat(b.qty) > 0)) return true;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:80 | parseFloat | `return Object.values(row.qty).some(v => parseFloat(v) > 0);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:101 | parseFloat | `const q = parseFloat(b.qty \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:102 | parseFloat | `const r = parseFloat(b.rate \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:107 | parseFloat | `const r = parseFloat(s.rate \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:112 | parseFloat | `const q = parseFloat(row.qty[col.id] \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:113 | parseFloat | `const r = parseFloat(row.rate[col.id] \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:230 | parseFloat | `const qty = parseFloat(b.qty \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:231 | parseFloat | `const rate = parseFloat(b.rate \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:242 | parseFloat | `mrp: row.mrp ? parseFloat(row.mrp) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:243 | parseFloat | `std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:250 | parseFloat | `const rate = parseFloat(s.rate \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:260 | parseFloat | `mrp: row.mrp ? parseFloat(row.mrp) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:261 | parseFloat | `std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:268 | parseFloat | `const qty = parseFloat(row.qty[col.id] \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:269 | parseFloat | `const rate = parseFloat(row.rate[col.id] \|\| '0') \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:276 | parseFloat | `mrp: row.mrp ? parseFloat(row.mrp) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:277 | parseFloat | `std_purchase_rate: row.stdPO ? parseFloat(row.stdPO) : null,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:285 | parseFloat | `if (row.mrp) { allItems[idx].mrp = parseFloat(row.mrp); mrpUpdates++; }` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:286 | parseFloat | `if (row.stdPO) { allItems[idx].std_purchase_rate = parseFloat(row.stdPO); }` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:477 | parseFloat | `batchQtyByGodown[b.godown_id] = (batchQtyByGodown[b.godown_id] \|\| 0) + (parseFloat(b.qty) \|\| 0);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/OpeningStockEntry.tsx:608 | parseFloat | `const val = (parseFloat(b.qty) \|\| 0) * (parseFloat(b.rate) \|\| 0);` | parseFloat on money — needs-founder-ruling |
| src/hooks/useCurrencies.ts:200 | parseFloat | `const formatted = parseFloat(amount.toFixed(c.decimal_places))` | parseFloat on money in engine — needs Decimal entry |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:240 | parseFloat | `<TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.original_amount \|\| ''} onKeyDown={onEnte` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:241 | parseFloat | `<TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.recovered_amount \|\| ''} onKeyDown={onEnt` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:243 | parseFloat | `<TableCell><Input type="number" className="h-8 w-20 text-right font-mono" defaultValue={l.interest_rate \|\| ''} onKeyDown={onEnterNext} onB` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:244 | parseFloat | `<TableCell><Input {...amountInputProps} className="h-8 w-24 text-right font-mono" defaultValue={l.emi_amount \|\| ''} onKeyDown={onEnterNext` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:303 | parseFloat | `<TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.original_amount \|\| ''} onKeyDown={onEnte` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:304 | parseFloat | `<TableCell><Input {...amountInputProps} className="h-8 w-28 text-right font-mono" defaultValue={l.recovered_amount \|\| ''} onKeyDown={onEnt` | parseFloat on money — needs-founder-ruling |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:356 | parseFloat | `<TableCell><Input type="number" className="h-8 w-20 text-right font-mono" defaultValue={l.interest_rate \|\| ''} onKeyDown={onEnterNext} onB` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/logistic/LogisticInvoiceSubmit.tsx:236 | parseFloat | `onChange={e => updateLine(l.id, field, parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/logistic/LogisticDisputes.tsx:86 | parseFloat | `resolution_amount: counterAmount ? parseFloat(counterAmount) : undefined,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:145 | parseFloat | `const newVal = parseFloat(trimmed);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:200 | parseFloat | `const pct = parseFloat(qaPercent);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:232 | parseFloat | `const pct = parseFloat(bulkPercent);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:278 | parseFloat | `const n = parseFloat(mrpVal);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:294 | parseFloat | `const n = parseFloat(stdPurchase);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:309 | parseFloat | `const n = parseFloat(stdSelling);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemCraft.tsx:840 | parseFloat | `onChange={e => setForm(f => ({ ...f, net_weight: parseFloat(e.target.value) \|\| null }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemCraft.tsx:843 | parseFloat | `onChange={e => setForm(f => ({ ...f, gross_weight: parseFloat(e.target.value) \|\| null }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemCraft.tsx:983 | parseFloat | `onChange={e => setForm(f => ({ ...f, cess_rate: parseFloat(e.target.value) \|\| null }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx:449 | parseFloat | `onChange={e => updateLineEdit(idx, { weight: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx:457 | parseFloat | `onChange={e => updateLineEdit(idx, { total: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/fincore/reports/BankReconciliation.tsx:78 | parseFloat | `debit: parseFloat(parts[2] ?? '0') \|\| 0,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/fincore/reports/BankReconciliation.tsx:79 | parseFloat | `credit: parseFloat(parts[3] ?? '0') \|\| 0,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:468 | parseFloat | `onChange={e => setBenchAmount(parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:294 | parseFloat | `onChange={e => setEditing({ ...editing, cost_per_uom_paise: Math.round(parseFloat(e.target.value \|\| '0') * 100) })} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorDisputeQueue.tsx:89 | parseFloat | `const rs = parseFloat(partialAmount);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx:292 | parseFloat | `<Input type="number" value={cpInvoiceAmount \|\| ''} onChange={e => setCpInvoiceAmount(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnte` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx:296 | parseFloat | `<Input type="number" value={cpAssetCost \|\| ''} onChange={e => setCpAssetCost(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} /` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx:302 | parseFloat | `<Input type="number" value={cpGstAmount \|\| ''} onChange={e => setCpGstAmount(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} /` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/distributor/CreditApprovalQueue.tsx:73 | parseFloat | `const lakhs = parseFloat(partialAmount);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4558 | parseFloat | `onChange={(e) => setCashForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4683 | parseFloat | `onChange={(e) => setBankForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4738 | parseFloat | `onChange={(e) => setLiabilityForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4869 | parseFloat | `onChange={(e) => setLoanRecForm(f => ({ ...f, loanAmount: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4872 | parseFloat | `onChange={(e) => setLoanRecForm(f => ({ ...f, interestRate: parseFloat(e.target.value) \|\| 0 }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4928 | parseFloat | `onChange={(e) => setBorrowingForm(f => ({ ...f, loanAmount: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:4931 | parseFloat | `onChange={(e) => setBorrowingForm(f => ({ ...f, interestRate: parseFloat(e.target.value) \|\| 0 }))} /></div>` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5247 | parseFloat | `onChange={(e) => setMarkPaidForm(f => ({ ...f, paidAmount: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5352 | parseFloat | `onChange={(e) => setDutiesTaxForm(f => ({ ...f, rate: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5409 | parseFloat | `onChange={(e) => setDutiesTaxForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g,'')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5491 | parseFloat | `<Input {...amountInputProps} value={assetForm.grossBlock \|\| ''} onChange={e => setAssetForm(f => ({ ...f, grossBlock: parseFloat(e.target.` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5517 | parseFloat | `<Input type="number" step="0.01" value={assetForm.depreciationRate} onChange={e => setAssetForm(f => ({ ...f, depreciationRate: parseFloat(e` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5541 | parseFloat | `<Input type="number" step="0.01" value={assetForm.it_act_depr_rate} onChange={e => setAssetForm(f => ({ ...f, it_act_depr_rate: parseFloat(e` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5561 | parseFloat | `<Input {...amountInputProps} value={assetForm.openingBalance \|\| ''} onChange={e => setAssetForm(f => ({ ...f, openingBalance: parseFloat(e` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5683 | parseFloat | `onChange={(e) => setPayrollForm(f => ({ ...f, openingBalance: parseFloat(e.target.value.replace(/,/g,'')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5727 | parseFloat | `onChange={(e) => setCustodianForm(f => ({ ...f, cashBalanceAtHandover: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:5833 | parseFloat | `onChange={(e) => setChequeIssueForm(f => ({ ...f, amount: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/bill-passing/panels.tsx:193 | parseFloat | `const rate = parseFloat(li.rate);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/bill-passing/panels.tsx:194 | parseFloat | `const tax = parseFloat(li.tax);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCreditRequest.tsx:56 | parseFloat | `const n = parseFloat(requestedLakhs);` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/capital-assets/AssetDisposal.tsx:168 | parseFloat | `<Input type="number" value={salePrice \|\| ''} onChange={e => setSalePrice(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/payout/VendorPaymentEntry.tsx:410 | parseFloat | `const r = parseFloat(e.target.value) \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/payout/AutoPayRulesEditor.tsx:265 | parseFloat | `onChange={e => setThresholdAmount(parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/StatutoryReturns.tsx:994 | parseFloat | `onChange={e => cf('totalAmount', parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:349 | parseFloat | `declaredAmount: parseFloat(proofAmount) \|\| 0,` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:669 | parseFloat | `<Input {...amountInputProps} value={declForm.medicalInsuranceSelf \|\| ''} onChange={e => duf('medicalInsuranceSelf', parseFloat(e.target.va` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:673 | parseFloat | `<Input {...amountInputProps} value={declForm.medicalInsuranceParents \|\| ''} onChange={e => duf('medicalInsuranceParents', parseFloat(e.tar` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:684 | parseFloat | `<Input {...amountInputProps} value={declForm.educationLoanInterest \|\| ''} onChange={e => duf('educationLoanInterest', parseFloat(e.target.` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:688 | parseFloat | `<Input {...amountInputProps} value={declForm.donations80G \|\| ''} onChange={e => duf('donations80G', parseFloat(e.target.value) \|\| 0)} on` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:692 | parseFloat | `<Input {...amountInputProps} value={declForm.savingsInterest80TTA \|\| ''} onChange={e => duf('savingsInterest80TTA', parseFloat(e.target.va` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:715 | parseFloat | `<Input {...amountInputProps} value={(declForm.hra as HRADeclaration \| null)?.rentPerMonth \|\| ''} onChange={e => duf('hra', { ...(declForm` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:757 | parseFloat | `<Input {...amountInputProps} value={(declForm.homeLoan as HomeLoanDeclaration \| null)?.interestPaid \|\| ''} onChange={e => duf('homeLoan',` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:761 | parseFloat | `<Input {...amountInputProps} value={(declForm.homeLoan as HomeLoanDeclaration \| null)?.principalPaid \|\| ''} onChange={e => duf('homeLoan'` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:781 | parseFloat | `<Input {...amountInputProps} value={declForm.prevEmployerGross \|\| ''} onChange={e => duf('prevEmployerGross', parseFloat(e.target.value) \` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:785 | parseFloat | `<Input {...amountInputProps} value={declForm.prevEmployerTDS \|\| ''} onChange={e => duf('prevEmployerTDS', parseFloat(e.target.value) \|\| ` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:789 | parseFloat | `<Input {...amountInputProps} value={declForm.prevEmployerPF \|\| ''} onChange={e => duf('prevEmployerPF', parseFloat(e.target.value) \|\| 0)` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/accounting/vouchers/Payment.tsx:535 | parseFloat | `const r = parseFloat(e.target.value) \|\| 0;` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:330 | parseFloat | `<Input type="number" value={form.minCTC \|\| ''} onChange={e => updateField('minCTC', parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:335 | parseFloat | `<Input type="number" value={form.maxCTC \|\| ''} onChange={e => updateField('maxCTC', parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:384 | parseFloat | `c.payHeadId === comp.payHeadId ? { ...c, calculationValue: parseFloat(e.target.value) \|\| 0 } : c` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:409 | parseFloat | `<Input type="number" value={previewCTC \|\| ''} onChange={e => setPreviewCTC(parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1408 | parseFloat | `<div><Label className="text-[10px]">Principal (₹)</Label><Input type="number" value={ln.principalAmount \|\| ''} onChange={e => updateLoan(l` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1409 | parseFloat | `<div><Label className="text-[10px]">EMI (₹)</Label><Input type="number" value={ln.emiAmount \|\| ''} onChange={e => updateLoan(ln.id, { emiA` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1444 | parseFloat | `<Input type="number" value={form.elOpeningBalance \|\| ''} onChange={e => uf('elOpeningBalance', parseFloat(e.target.value) \|\| 0)} onKeyDo` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1462 | parseFloat | `<div><Label className="text-[10px]">Gross Salary (₹)</Label><Input type="number" value={pe.grossSalary \|\| ''} onChange={e => updatePrevEmp` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1463 | parseFloat | `<div><Label className="text-[10px]">TDS Deducted (₹)</Label><Input type="number" value={pe.tdsDeducted \|\| ''} onChange={e => updatePrevEmp` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1494 | parseFloat | `onChange={e => uf('hourly_rate_production', parseFloat(e.target.value) \|\| 0)}` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:888 | parseFloat | `onChange={e => luf('principalAmount', parseFloat(e.target.value.replace(/,/g,'')) \|\| 0)} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:944 | parseFloat | `onChange={e => setAdvForm(prev => ({ ...prev, amount: parseFloat(e.target.value.replace(/,/g,'')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:1006 | parseFloat | `onChange={e => setExpForm(prev => ({ ...prev, amount: parseFloat(e.target.value.replace(/,/g,'')) \|\| 0 }))} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:1045 | parseFloat | `onChange={e => setFlexiTotal(parseFloat(e.target.value.replace(/,/g,'')) \|\| 0)} />` | parseFloat on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/Onboarding.tsx:756 | parseFloat | `<Input {...amountInputProps} value={journeyForm.offerAmount \|\| ''} onChange={e => jf('offerAmount', parseFloat(e.target.value) \|\| 0)} on` | parseFloat on money — needs-founder-ruling |
| src/hooks/useAttendanceEntry.ts:154 | Math.round | `return Math.max(0, Math.round((totalMins / 60 - breakHours) * 100) / 100);` | Math.round on money in engine — bypasses round2 |
| src/hooks/useCallQuality.ts:142 | Math.round | `return Math.round(weighted / totalWeight);` | Math.round on money in engine — bypasses round2 |
| src/types/campaign.ts:137 | Math.round | `cost_per_enquiry:        o.enquiries_generated > 0 ? Math.round(spent / o.enquiries_generated) : 0,` | Math.round on money — needs-founder-ruling |
| src/types/campaign.ts:138 | Math.round | `cost_per_order:          o.orders_converted > 0 ? Math.round(spent / o.orders_converted) : 0,` | Math.round on money — needs-founder-ruling |
| src/pages/vendor-portal/RFQPublicForm.tsx:79 | Math.round | `return Math.round(afterDisc * (1 + l.tax_percent / 100) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/vendor-portal/RFQPublicForm.tsx:148 | Math.round | `total_value: Math.round(totalValue * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/vendor-portal/RFQPublicForm.tsx:149 | Math.round | `total_tax: Math.round((totalAfterTax - totalValue) * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/vendor-portal/RFQPublicForm.tsx:150 | Math.round | `total_after_tax: Math.round(totalAfterTax * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/tower/Notifications.tsx:123 | Math.round | `const avgOpenRate = Math.round(` | Math.round on money — needs-founder-ruling |
| src/features/party-master/lib/customer-kpi-engine.ts:136 | Math.round | `daysSalesOutstanding: Math.round(daysSalesOutstanding),` | Math.round on money in engine — bypasses round2 |
| src/features/party-master/lib/customer-kpi-engine.ts:171 | Math.round | `avgDSO: Math.round(leaves.reduce((s, l) => s + l.daysSalesOutstanding, 0) / leaves.length),` | Math.round on money in engine — bypasses round2 |
| src/types/contract-manpower.ts:166 | Math.round | `const empPF        = Math.round(pfWage * CONTRACT_EMP_PF_RATE);` | Math.round on money — needs-founder-ruling |
| src/types/contract-manpower.ts:167 | Math.round | `const erPF         = Math.round(pfWage * CONTRACT_ER_PF_RATE);` | Math.round on money — needs-founder-ruling |
| src/types/contract-manpower.ts:168 | Math.round | `const empESIC      = Math.round(esicWage * CONTRACT_EMP_ESI_RATE);` | Math.round on money — needs-founder-ruling |
| src/types/contract-manpower.ts:169 | Math.round | `const erESIC       = Math.round(esicWage * CONTRACT_ER_ESI_RATE);` | Math.round on money — needs-founder-ruling |
| src/hooks/usePayrollEngine.ts:92 | Math.round | `const balVal = Math.max(0, Math.round(targetGross - totalEarnings));` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:294 | Math.round | `const cess = Math.round(taxWithSurcharge * 0.04);` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:296 | Math.round | `const totalAnnualTax = Math.round(taxAfterRebate + surcharge + cess);` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:298 | Math.round | `const monthlyTDS = Math.round(remainingTax / remainingMonths);` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:302 | Math.round | `grossAnnualSalary: Math.round(annualGrossSalary),` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:304 | Math.round | `taxableIncome: Math.round(taxableIncome),` | Math.round on money in engine — bypasses round2 |
| src/hooks/usePayrollEngine.ts:305 | Math.round | `taxBeforeCess: Math.round(taxOnIncome - rebate87A + surcharge),` | Math.round on money in engine — bypasses round2 |
| src/features/party-master/hooks/useCreditScoring.ts:67 | Math.round | `const score = Math.max(0, Math.min(100, Math.round(baseScore - overduePenalty - latePenalty)));` | Math.round on money in engine — bypasses round2 |
| src/features/party-master/hooks/useCreditScoring.ts:81 | Math.round | `details: `${partyInvoices.length} invoices · ${Math.round(onTimePaymentRatio * 100)}% on-time · avg ${Math.round(avgDaysLate)}d late · ${ove` | Math.round on money in engine — bypasses round2 |
| src/features/loan-emi/lib/emi-lifecycle-engine.ts:87 | Math.round | `totalEMI: Math.round((r.principal + r.interest) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/features/loan-emi/lib/emi-lifecycle-engine.ts:88 | Math.round | `openingBalance: Math.round((r.runningBalance + r.principal) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/features/loan-emi/lib/advance-aging.ts:93 | Math.round | `s.totalAmount = Math.round(s.totalAmount * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/lib/advance-aging.ts:103 | Math.round | `totalOpenAmount: Math.round(totalOpenAmount * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/hooks/useEMISchedule.ts:82 | Math.round | `outstandingAmount: Math.round(outstandingAmount * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/features/loan-emi/hooks/useEMIAlerts.ts:41 | Math.round | `Math.round(alerts.filter(pred).reduce((s, a) => s + a.amount, 0) * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/components/fincore/InventoryLineGrid.tsx:40 | Math.round | `const cgst = isInterState ? 0 : Math.round(taxable * halfRate / 100 * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/components/fincore/InventoryLineGrid.tsx:41 | Math.round | `const sgst = isInterState ? 0 : Math.round(taxable * halfRate / 100 * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/components/fincore/InventoryLineGrid.tsx:42 | Math.round | `const igst = isInterState ? Math.round(taxable * line.gst_rate / 100 * 100) / 100 : 0;` | Math.round on money — needs-founder-ruling |
| src/components/fincore/InventoryLineGrid.tsx:45 | Math.round | `discount_amount: Math.round(discAmt * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/components/fincore/InventoryLineGrid.tsx:46 | Math.round | `taxable_value: Math.round(taxable * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/components/fincore/InventoryLineGrid.tsx:51 | Math.round | `total: Math.round((taxable + cgst + sgst + igst + line.cess_amount) * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorPayments.tsx:111 | Math.round | `amount_paise: Math.round(v.amount_rupees * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorInvoices.tsx:144 | Math.round | `const disputed = Math.round(shortQty * disputeLine.rate * 100); // paise` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorDashboard.tsx:53 | Math.round | `? Math.min(100, Math.round((distributor.outstanding_paise / distributor.credit_limit_paise) * 100))` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorDashboard.tsx:56 | Math.round | `? Math.min(100, Math.round((distributor.monthly_achieved_paise / distributor.monthly_target_paise) * 100))` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCatalog.tsx:106 | Math.round | `const fallback = Math.round((item.std_selling_rate ?? item.mrp ?? 0) * 100);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCatalog.tsx:170 | Math.round | `const fallback = Math.round((item.std_selling_rate ?? item.mrp ?? 0) * 100);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCart.tsx:148 | Math.round | `taxable_paise: Math.round(l.taxable_paise * ratio),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCart.tsx:149 | Math.round | `cgst_paise: Math.round(l.cgst_paise * ratio),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCart.tsx:150 | Math.round | `sgst_paise: Math.round(l.sgst_paise * ratio),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCart.tsx:151 | Math.round | `igst_paise: Math.round(l.igst_paise * ratio),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCart.tsx:152 | Math.round | `total_paise: Math.round(l.total_paise * ratio),` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/engines/penal-engine.ts:104 | Math.round | `return Math.max(0, Math.round((row.totalEMI - row.paidAmount) * 100) / 100);` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/engines/penal-engine.ts:121 | Math.round | `const penalAmount = Math.round(outstanding * rate) / 100;` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/engines/penal-engine.ts:166 | Math.round | `const penalAmount = Math.round(outstanding * rate) / 100;` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/engines/penal-engine.ts:253 | Math.round | `? { ...r, penalAccrued: Math.round((r.penalAccrued + penalAmount) * 100) / 100 }` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/engines/notional-interest-engine.ts:79 | Math.round | `return Math.round(((balance * (ANNUAL_RATE_PERCENT / 100)) / 12) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/features/ledger-master/lib/emi-schedule-builder.ts:53 | Math.round | `runningBalance: Math.round(balance * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/features/ledger-master/lib/emi-schedule-builder.ts:63 | Math.round | `if (monthlyRate === 0) return Math.round((principal / tenureMonths) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/features/loan-emi/components/NotionalInterestRunModal.tsx:61 | Math.round | `totalInterest: Math.round(total * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:638 | Math.round | `tolerance_amount_paise: Math.round((Number(amt) \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:640 | Math.round | `escalation_amount_paise: Math.round((Number(escAmt) \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/components/mobile/MobileSiteDPRCapture.tsx:71 | Math.round | `else toast.success(`Photo within fence (${Math.round(dist)}m)`);` | Math.round on money — needs-founder-ruling |
| src/lib/voucher-print-shared.ts:113 | Math.round | `const rounded = Math.round(n * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/bridge/SyncMonitor.tsx:537 | Math.round | `{selectedRequest.records > 0 ? `${Math.round((selectedRequest.processed / selectedRequest.records) * 100)}%` : "0%"}` | Math.round on money — needs-founder-ruling |
| src/lib/voucher-org-tag-engine.ts:149 | Math.round | `const coveragePct = totalVouchers === 0 ? 100 : Math.round((tagged / totalVouchers) * 100);` | Math.round on money in engine — bypasses round2 |
| src/pages/bridge/ReconciliationWorkbench.tsx:199 | Math.round | `const matchRate = Math.round((selectedReq.matched / selectedReq.totalRecords) * 100);` | Math.round on money — needs-founder-ruling |
| src/components/mobile/MobilePODCapture.tsx:60 | Math.round | `toast.success(`GPS captured · ${Math.round(r.accuracy_m ?? 0)}m`);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx:142 | Math.round | `cost_paise: Math.round(Number(routeCost) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx:171 | Math.round | `daily_cost_paise: Math.round(Number(standbyDaily) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx:182 | Math.round | `const unit = Math.round(Number(spareCost) * 100);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/service-tickets/CustomerOutDialog.tsx:46 | Math.round | `const charges_paise = Math.round(Number(chargesRupees) * 100);` | Math.round on money — needs-founder-ruling |
| src/features/command-center/components/ZoneProgressResolver.ts:106 | Math.round | `const progress = totalKeys === 0 ? 0 : Math.round((configuredCount / totalKeys) * 100);` | Math.round on money — needs-founder-ruling |
| src/lib/vendor-scoring-engine.ts:82 | Math.round | `const totalScore = Math.round(` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-return-engine.ts:102 | Math.round | `const lineTotal = Math.round(input.return_qty * input.unit_rate * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-quotation-engine.ts:75 | Math.round | `return Math.round((afterDisc * (1 + l.tax_percent / 100)) * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-quotation-engine.ts:89 | Math.round | `const totalTax = Math.round((totalAfterTax - totalValue) * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-quotation-engine.ts:100 | Math.round | `total_value: Math.round(totalValue * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-quotation-engine.ts:102 | Math.round | `total_after_tax: Math.round(totalAfterTax * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/distributor-rating-engine.ts:48 | Math.round | `return Math.round(baseLimitPaise * multiplier);` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/servicedesk/repair-routing/RepairRouteList.tsx:57 | Math.round | `markReturnedFromRepair(returnId, ACTOR, Math.round(Number(returnCost) * 100));` | Math.round on money — needs-founder-ruling |
| src/lib/distributor-order-engine.ts:35 | Math.round | `rate_paise: Math.round(row.price * 100),  // PriceListItem.price is rupees → paise` | Math.round on money in engine — bypasses round2 |
| src/lib/distributor-order-engine.ts:56 | Math.round | `const taxTotal = Math.round(taxable * (gstRate / 100));` | Math.round on money in engine — bypasses round2 |
| src/lib/distributor-order-engine.ts:66 | Math.round | `const halfTax = Math.round(taxTotal / 2);` | Math.round on money in engine — bypasses round2 |
| src/lib/distributor-order-engine.ts:124 | Math.round | `daily_run_rate: Math.round(daily * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:16 | Math.round | `return Math.round((isHalfRate ? depr * 0.5 : depr) * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:23 | Math.round | `return Math.round((isHalfRate ? depr * 0.5 : depr) * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:82 | Math.round | `closing_wdv: Math.round((unit.opening_wdv - deprAmount) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:120 | Math.round | `const deprFull = Math.round(wdvPlusGt180 * rate / 100 * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:121 | Math.round | `const deprHalf = Math.round(additionsLt180 * rate / 100 * 0.5 * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:130 | Math.round | `closing_wdv: Math.round((total - totalDepr) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/depreciation-engine.ts:169 | Math.round | `return s + Math.round(u.opening_wdv * rate / 100 * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx:67 | Math.round | `refurb_cost_paise: Math.round(Number(form.refurb_cost) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx:68 | Math.round | `resale_price_paise: Math.round(Number(form.resale_price) * 100),` | Math.round on money — needs-founder-ruling |
| src/lib/vendor-analytics-engine.ts:197 | Math.round | `return Math.min(100, Math.round((totalAdjusted / totalAdvance) * 100));` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-analytics-engine.ts:217 | Math.round | `return totalInvoices > 0 ? Math.round((vendorBreaches.length / totalInvoices) * 100) : 0;` | Math.round on money in engine — bypasses round2 |
| src/lib/vendor-analytics-engine.ts:236 | Math.round | `return Math.round((tdsDeducted / tdsApplicable.length) * 100);` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:294 | Math.round | `onChange={e => setEditing({ ...editing, cost_per_uom_paise: Math.round(parseFloat(e.target.value \|\| '0') * 100) })} />` | Math.round on money — needs-founder-ruling |
| src/lib/customer-recommendation-engine.ts:62 | Math.round | `score: Math.round((count / total) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/customer-clv-engine.ts:59 | Math.round | `const projected = Math.round(aov * frequency * retention * DEFAULT_GROSS_MARGIN);` | Math.round on money in engine — bypasses round2 |
| src/lib/customer-churn-engine.ts:46 | Math.round | `return Math.round(totalGap / (sorted.length - 1));` | Math.round on money in engine — bypasses round2 |
| src/lib/customer-churn-engine.ts:95 | Math.round | `churn_probability: Math.round(total * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/customer-hub/transactions/CustomerCatalog.tsx:66 | Math.round | `price_paise: Math.round(((r.std_selling_rate ?? 0) \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:182 | Math.round | `estimated_value: Math.round(l.qty * l.rate * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:271 | Math.round | `const rate = Math.round((l.estimated_rate ?? 0) * qs.rate_factor * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:275 | Math.round | `const afterTax = Math.round(gross * (1 + tax / 100) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:302 | Math.round | `total_value: Math.round(totalValue * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:303 | Math.round | `total_tax: Math.round((totalAfterTax - totalValue) * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/data/demo-procurement-data.ts:304 | Math.round | `total_after_tax: Math.round(totalAfterTax * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/data/demo-field-force-data.ts:423 | Math.round | `const newAmount = Math.round(last.amount * ratio);` | Math.round on money — needs-founder-ruling |
| src/data/demo-field-force-data.ts:426 | Math.round | `last.qty = Math.max(1, Math.round(newAmount / last.rate));` | Math.round on money — needs-founder-ruling |
| src/data/demo-field-force-data.ts:443 | Math.round | `total_amount: Math.round(total),` | Math.round on money — needs-founder-ruling |
| src/data/demo-salesx-data.ts:336 | Math.round | `const taxAmt = Math.round(total * 0.18);` | Math.round on money — needs-founder-ruling |
| src/data/demo-salesx-data.ts:436 | Math.round | `const commission = Math.round(base * ratePct / 100);` | Math.round on money — needs-founder-ruling |
| src/data/demo-salesx-data.ts:493 | Math.round | `collection_bonus_amount: isPaid ? Math.round(commission * 0.25) : 0,` | Math.round on money — needs-founder-ruling |
| src/data/demo-projects.ts:158 | Math.round | `invoice_pct: pct, invoice_amount: Math.round(contractValue * pct) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx:66 | Math.round | `hourly_rate_paise: Math.round(Number(form.rate) * 100),` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-salesx.ts:84 | Math.round | `const cgst = Math.round((taxable * gstRate) / 200);` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-salesx.ts:137 | Math.round | `const settled = isPaid ? total : isPartial ? Math.round(total * 0.5) : 0;` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-salesx.ts:216 | Math.round | `const cnAmt = Math.round(total * 0.05);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/customer-hub/CustomerHubWelcome.tsx:156 | Math.round | `: Math.round(valid.reduce((s, c) => s + c.projected_12m_value_paise, 0) / valid.length);` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-pay-hub.ts:64 | Math.round | `netPay: Math.round(grossEarnings * lopFactor) - totalDed,` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-pay-hub.ts:65 | Math.round | `totalEmployerCost: Math.round(grossEarnings * lopFactor) + Math.round(pfWage * 0.1317) + (esiWage > 0 ? Math.round(esiWage * 0.0325) : 0),` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-pay-hub.ts:92 | Math.round | `const tds = t.annualCTC >= 1000000 ? Math.round(t.annualCTC * 0.05 / 12) : (t.annualCTC >= 500000 ? Math.round(t.annualCTC * 0.025 / 12) : 0` | Math.round on money — needs-founder-ruling |
| src/data/demo-transactions-pay-hub.ts:112 | Math.round | `totalEmployerCost: grossEarnings + Math.round(pfWage * 0.1317) + (esiWage > 0 ? Math.round(esiWage * 0.0325) : 0),` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:654 | Math.round | `const basic = Math.round(l.qty_quoted * l.rate * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:655 | Math.round | `const taxValue = Math.round((basic * l.tax_percent) / 100 * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:656 | Math.round | `const afterTax = Math.round((basic + taxValue) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:673 | Math.round | `const totalBasic = Math.round(lines.reduce((s, l) => s + l.basic_value, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:674 | Math.round | `const totalTax = Math.round(lines.reduce((s, l) => s + l.tax_value, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:675 | Math.round | `const totalAfter = Math.round(lines.reduce((s, l) => s + l.amount_after_tax, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:772 | Math.round | `const invValue = Math.round(invQty * invRate * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:773 | Math.round | `const invTax = Math.round((invValue * pl.tax_pct) / 100 * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:774 | Math.round | `const invTotal = Math.round((invValue + invTax) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:801 | Math.round | `const totalInv = Math.round(lines.reduce((s, l) => s + l.invoice_total, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:802 | Math.round | `const totalPo  = Math.round(lines.reduce((s, l) => s + l.po_value, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:803 | Math.round | `const totalGrn = Math.round(lines.reduce((s, l) => s + l.grn_qty * l.po_rate, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:917 | Math.round | `ceiling_rate: Math.round(pl.rate * 1.05 * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:939 | Math.round | `total_value: Math.round(totalValue * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:1924 | Math.round | `total_variance_value: Math.round(totalVarValue * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/services/entity-setup-service.ts:1940 | Math.round | `const lineTotal = Math.round(qty * rate * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/projx/transactions/MilestoneTracker.tsx:96 | Math.round | `? Math.round((totalBilled / project.contract_value) * 100) : 0;` | Math.round on money — needs-founder-ruling |
| src/lib/fincore-engine.ts:570 | Math.round | `taxable_amount_paise: Math.round((l.taxable_value ?? 0) * 100),` | Math.round on money in engine — bypasses round2 |
| src/data/fixtures/manifest.ts:87 | Math.round | `readyPct: Math.round((ready / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/data/fixtures/manifest.ts:88 | Math.round | `partialPct: Math.round((partial / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/data/fixtures/manifest.ts:89 | Math.round | `missingPct: Math.round((missing / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/lib/store-hub-engine.ts:248 | Math.round | `b.days_of_cover = Math.round(bal.qty_balance / b.avg_daily_consumption);` | Math.round on money in engine — bypasses round2 |
| src/lib/procure-fincore-po-bridge.ts:76 | Math.round | `const taxable = Math.round(poLine.qty * poLine.rate * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/lib/procure-fincore-po-bridge.ts:160 | Math.round | `const grossAmount = Math.round(lines.reduce((s, l) => s + l.taxable_value, 0) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/lib/procure-fincore-po-bridge.ts:161 | Math.round | `const totalTax = Math.round(po.total_tax_value * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/lib/procure-fincore-po-bridge.ts:174 | Math.round | `net_amount: Math.round((grossAmount + totalTax) * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:152 | Math.round | `const paise = Math.round((abs - rupees) * 100);` | Math.round on money in engine — bypasses round2 |
| src/lib/insight-generators.ts:85 | Math.round | `const topPct = Math.round((top[1] / total) * 100);` | Math.round on money — needs-founder-ruling |
| src/lib/packing-slip-engine.ts:102 | Math.round | `total_gross_kg: Math.round(totalGrossKg * 1000) / 1000,` | Math.round on money in engine — bypasses round2 |
| src/lib/packing-slip-engine.ts:103 | Math.round | `total_volumetric_kg: Math.round(totalVolumetricKg * 1000) / 1000,` | Math.round on money in engine — bypasses round2 |
| src/lib/packing-bom-engine.ts:104 | Math.round | `return Math.round(total);` | Math.round on money in engine — bypasses round2 |
| src/lib/rate-contract-engine.ts:187 | Math.round | `const variancePctRounded = Math.round(variancePct * 100) / 100;` | Math.round on money in engine — bypasses round2 |
| src/lib/qa-pareto-engine.ts:61 | Math.round | `fail_rate_pct: g.pass + g.fail > 0 ? Math.round((g.fail / (g.pass + g.fail)) * 1000) / 10 : 0,` | Math.round on money in engine — bypasses round2 |
| src/lib/qa-pareto-engine.ts:69 | Math.round | `bin.cumulative_pct = totalFailures > 0 ? Math.round((cumulative / totalFailures) * 1000) / 10 : 0;` | Math.round on money in engine — bypasses round2 |
| src/lib/qa-pareto-engine.ts:78 | Math.round | `overall_fail_rate_pct: totalInspections > 0 ? Math.round((totalFailures / totalInspections) * 1000) / 10 : 0,` | Math.round on money in engine — bypasses round2 |
| src/lib/qa-pareto-engine.ts:114 | Math.round | `pass_rate_pct: d.pass + d.fail > 0 ? Math.round((d.pass / (d.pass + d.fail)) * 1000) / 10 : 0,` | Math.round on money in engine — bypasses round2 |
| src/lib/servicedesk-engine.ts:409 | Math.round | `const risk_score = Math.round(total);` | Math.round on money in engine — bypasses round2 |
| src/lib/servicedesk-engine.ts:423 | Math.round | `payment_history: Math.round(paymentScore),` | Math.round on money in engine — bypasses round2 |
| src/lib/servicedesk-engine.ts:1334 | Math.round | `const trust_score = Math.round((timeline_pct * 0.3 + cost_pct * 0.3 + route_pct * 0.2 + spares_pct * 0.2));` | Math.round on money in engine — bypasses round2 |
| src/lib/servicedesk-engine.ts:1906 | Math.round | `suggested_charge_paise: Math.round(500 * 100 * severityMultiplier[severity]),` | Math.round on money in engine — bypasses round2 |
| src/lib/servicedesk-engine.ts:1971 | Math.round | `return { ...r, margin_paise: margin, margin_pct: r.revenue_paise > 0 ? Math.round((margin / r.revenue_paise) * 100) : 0 };` | Math.round on money in engine — bypasses round2 |
| src/lib/procure360-report-engine.ts:86 | Math.round | `total_spend: Math.round(awards.reduce((s, q) => s + q.total_after_tax, 0) * 100) / 100,` | Math.round on money in engine — bypasses round2 |
| src/lib/procure360-report-engine.ts:87 | Math.round | `response_rate: vRfqs.length > 0 ? Math.round((responded.length / vRfqs.length) * 100) : 0,` | Math.round on money in engine — bypasses round2 |
| src/lib/receivx-engine.ts:246 | Math.round | `return Math.round((ar / totalInv) * windowDays);` | Math.round on money in engine — bypasses round2 |
| src/lib/receivx-engine.ts:260 | Math.round | `return { kept, broken, partial, pctKept: total > 0 ? Math.round((kept / total) * 100) : 0 };` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/salesx/transactions/Telecaller.tsx:887 | Math.round | `{d.calls_made > 0 ? Math.round((d.successful_dispositions / d.calls_made) * 100) : 0}% success` | Math.round on money — needs-founder-ruling |
| src/lib/requestx-report-engine.ts:208 | Math.round | `for (const p of phases) p.pct_of_total = total > 0 ? Math.round((p.days / total) * 100) : 0;` | Math.round on money in engine — bypasses round2 |
| src/lib/scheme-impact-engine.ts:72 | Math.round | `projected_impact_pct: totalValue > 0 ? Math.round((disc / totalValue) * 10000) / 100 : 0,` | Math.round on money in engine — bypasses round2 |
| src/lib/scheme-engine.ts:86 | Math.round | `const discount = Math.round(line.line_total_paise * slab.discount_percent / 100);` | Math.round on money in engine — bypasses round2 |
| src/lib/scheme-engine.ts:102 | Math.round | `applies_to: 'order', discount_paise: Math.round(sum * p.discount_percent / 100),` | Math.round on money in engine — bypasses round2 |
| src/lib/social-proof-engine.ts:78 | Math.round | `text: `Top-rated — ${Math.round(avg * 10) / 10}★ from ${itemRatings.length} customers`,` | Math.round on money in engine — bypasses round2 |
| src/pages/erp/accounting/vouchers/Receipt.tsx:132 | Math.round | `updated.tds_amount = Math.round(updated.gross_amount * updated.tds_rate / 100);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/vouchers/Receipt.tsx:140 | Math.round | `if (sec) { updated.tds_rate = sec.rateIndividual; updated.tds_amount = Math.round(updated.gross_amount * sec.rateIndividual / 100); updated.` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/vouchers/Payment.tsx:173 | Math.round | `setTdsAmount(Math.round(amount * selectedVendor.lower_deduction_rate / 100));` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/vouchers/Payment.tsx:537 | Math.round | `setTdsAmount(Math.round(amount * r / 100));` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:2287 | Math.round | `if (annualRate === 0) return Math.round((principal / months) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:2300 | Math.round | `const interest = Math.round(balance * (def.interestRate/100/12) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:2302 | Math.round | `const principal = isLast ? balance : Math.round((emi - interest) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/accounting/LedgerMaster.tsx:2303 | Math.round | `const closing = isLast ? 0 : Math.round((balance - principal) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/lib/oob/price-benchmark-stub.ts:31 | Math.round | `industry_avg: Math.round(avg * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/lib/oob/price-benchmark-stub.ts:32 | Math.round | `delta_percent: Math.round(delta * 100) / 100,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/masters/SchemeMaster.tsx:415 | Math.round | `onChange={e => update({ scope: { ...selected.scope, min_order_value_paise: Math.round((Number(e.target.value) \|\| 0) * 100) } })}` | Math.round on money — needs-founder-ruling |
| src/pages/erp/masters/SchemeMaster.tsx:532 | Math.round | `onChange={e => onChange({ discount_paise: Math.round((Number(e.target.value) \|\| 0) * 100) })}` | Math.round on money — needs-founder-ruling |
| src/pages/erp/masters/SchemeMaster.tsx:585 | Math.round | `onChange={e => onChange({ ...p, bundle_price_paise: Math.round((Number(e.target.value) \|\| 0) * 100) })}` | Math.round on money — needs-founder-ruling |
| src/pages/erp/masters/SchemeMaster.tsx:606 | Math.round | `onChange={e => onChange({ ...p, min_purchase_value_paise: Math.round((Number(e.target.value) \|\| 0) * 100) })}` | Math.round on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:896 | Math.round | `order_value_paise: Math.round((form.total_amount \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:901 | Math.round | `unit_price_paise: Math.round((it.rate \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:902 | Math.round | `line_total_paise: Math.round((it.sub_total \|\| 0) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/salesx/transactions/CallQualityHub.tsx:278 | Math.round | `return Math.round(completed.reduce((s, r) => s + r.total_score, 0) / completed.length);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/payout/VendorPaymentEntry.tsx:412 | Math.round | `setTdsAmount(Math.round(amount * r / 100));` | Math.round on money — needs-founder-ruling |
| src/pages/erp/salesx/SalesXAnalytics.tsx:115 | Math.round | `return Math.round((salesInvoices.length / e) * 1000) / 10;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:83 | Math.round | `return Math.round(shortfall * dailyRate);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:93 | Math.round | `return Math.round((monthlyGross / totalDaysInMonth) * daysWorked);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/ContractManpower.tsx:190 | Math.round | `return Math.round(orderForm.ratePerDay * orderForm.approvedHeadcount * days);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/ContractManpower.tsx:234 | Math.round | `saveInvoices([...invoices, { ...invoiceForm, varianceAmount: Math.round(variance),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:220 | Math.round | `const actScore = actTotal > 0 ? Math.round((actForm.productiveHours / actTotal) * 100) : 0;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:227 | Math.round | `const score = total > 0 ? Math.round((actForm.productiveHours / total) * 100) : 0;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/payout/CashFlowDashboard.tsx:78 | Math.round | `closing: Math.round(p.closing_balance),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/payout/CashFlowDashboard.tsx:79 | Math.round | `receivables: Math.round(p.receivables),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/payout/CashFlowDashboard.tsx:80 | Math.round | `committed: Math.round(p.committed_payments),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/payout/CashFlowDashboard.tsx:85 | Math.round | `receivables: Math.round(w.receivables),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/requestx/transactions/IndentApprovalInbox.tsx:75 | Math.round | `const approvalRate = sameRequester.length > 0 ? Math.round((approvedCount / sameRequester.length) * 100) : 0;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:102 | Math.round | `const interest = Math.round(balance * monthlyRate);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:1055 | Math.round | `{flexiTotal > 0 ? `${Math.round((flexiComponents[comp] / flexiTotal) * 100)}%` : '—'}` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:70 | Math.round | `results.push({ name: c.payHeadName, type: c.payHeadType, monthly: Math.round(val), annual: Math.round(val * 12) });` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:77 | Math.round | `results[balIdx].monthly = Math.max(0, Math.round(remaining));` | Math.round on money — needs-founder-ruling |
| src/pages/erp/receivx/ReceivXHub.tsx:43 | Math.round | `const dso = totalReceivables > 0 ? Math.round(totalReceivables / Math.max(1, totalReceivables / 45)) : 0;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/fincore/FinCoreHub.tsx:168 | Math.round | `w0:  Math.round((b0 / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/fincore/FinCoreHub.tsx:169 | Math.round | `w31: Math.round((b31 / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/fincore/FinCoreHub.tsx:170 | Math.round | `w60: Math.round((b60 / total) * 100),` | Math.round on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:189 | Math.round | `const nv = Math.round(item.std_selling_rate * (pct / 100) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/inventory/PriceListManager.tsx:200 | Math.round | `const nv = Math.round(item.std_selling_rate * (1 - disc / 100) * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/engineeringx/registers/EngineeringXReports.tsx:50 | Math.round | `bomRate: all.length ? Math.round((drawingsWithBom.size / all.length) * 100) : 0,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/engineeringx/registers/EngineeringXReports.tsx:51 | Math.round | `approvalRate: all.length ? Math.round((approved / all.length) * 100) : 0,` | Math.round on money — needs-founder-ruling |
| src/pages/erp/requestx/RequestXWelcome.tsx:75 | Math.round | `return Math.round(total / mi.length);` | Math.round on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:210 | Math.round | `const rounded = Math.round(nv * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/inventory/ItemRatesMRP.tsx:238 | Math.round | `const rounded = Math.round(nv * 100) / 100;` | Math.round on money — needs-founder-ruling |
| src/pages/erp/qualicheck/QualiCheckDashboard.tsx:43 | Math.round | `? Math.round(((totalInspections - totalFailures) / totalInspections) * 1000) / 10` | Math.round on money — needs-founder-ruling |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:272 | Math.round | `const attritionRate = Math.round((total / avgHeadcount) * 1000) / 10;` | Math.round on money — needs-founder-ruling |

## Class A (9)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/lib/production-variance-engine.ts:203 | toFixed | `factors.push(`${out.item_code}: ${plannedPct.toFixed(1)}% → ${actualMixPct.toFixed(1)}%`);` | safe-helper inline |
| src/lib/production-engine.ts:426 | toFixed | `notes: `Production Order ${po.doc_no} · planning variance ${updated_cost_structure.variance.master_vs_budget.total_pct.toFixed(1)}% exceeds ` | safe-helper inline |
| src/pages/erp/production/transactions/ProductionConfirmationEntry.tsx:253 | toFixed | `<Input readOnly className="font-mono" value={yieldPct.toFixed(2)} />` | safe-helper inline |
| src/pages/erp/projx/reports/TimeEntryRegister.tsx:97 | toFixed | `{ label: 'Billable Hours', value: dSum(billable, e => e.hours).toFixed(2) },` | safe-helper inline |
| src/pages/erp/projx/reports/TimeEntryRegister.tsx:98 | toFixed | `{ label: 'Total Hours', value: dSum(f, e => e.hours).toFixed(2) },` | safe-helper inline |
| src/features/loan-emi/engines/gst-charge-engine.ts:40 | Math.round | `const round2 = (n: number): number => Math.round(n * 100) / 100;` | safe-helper inline |
| src/services/entity-setup-service.ts:707 | Math.round | `const accepted = Math.round(pl.qty * acceptedPct);` | safe-helper inline |
| src/lib/tds-engine.ts:70 | Math.round | `const tdsAmount = Math.round(dPct(grossAmount, rate));` | safe-helper inline |
| src/pages/erp/salesx/transactions/WebinarMaster.tsx:932 | Math.round | `? Math.round(round2(form.budget.total_actual / form.outcome.attendees)).toLocaleString('en-IN')` | safe-helper inline |

## Class B (420)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/pages/tower/Billing.tsx:82 | toFixed | `if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)} K`;` | toFixed render/display |
| src/pages/mobile/telecaller/MobileTelecallerStatsPage.tsx:101 | toFixed | `<p className="text-xl font-mono font-bold text-amber-700">{stats.conversionRate.toFixed(1)}%</p>` | toFixed render/display |
| src/hooks/useLeadDistribution.ts:135 | toFixed | `reason: `Skill match · load ${picked.utilisation_pct.toFixed(0)}%` };` | toFixed render/display |
| src/components/uth/VoucherClassPicker.tsx:92 | toFixed | `Above ₹{(current.approval_threshold_value / 100000).toFixed(1)}L · approval required from {current.approval_role}` | toFixed render/display |
| src/components/uth/StockReservationSidePanel.tsx:20 | toFixed | `return Number.isFinite(n) ? n.toFixed(1) : '0.0';` | toFixed render/display |
| src/components/uth/StockReservationBadge.tsx:17 | toFixed | `return Number.isFinite(n) ? n.toFixed(1) : '0.0';` | toFixed render/display |
| src/components/layout/StorageQuotaIndicator.tsx:66 | toFixed | `<span>{usage.pct.toFixed(0)}%</span>` | toFixed render/display |
| src/components/layout/StorageQuotaIndicator.tsx:78 | toFixed | `<DialogTitle>{t('common.storage', 'Storage Usage')} · {usage.pct.toFixed(1)}% of {formatBytes(usage.quota_bytes)}</DialogTitle>` | toFixed render/display |
| src/pages/mobile/supervisor/MobileQualityReviewsPage.tsx:68 | toFixed | `<span className="font-mono font-semibold">{r.total_score.toFixed(1)} / 100</span>` | toFixed render/display |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:80 | toFixed | `{b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}` | toFixed render/display |
| src/pages/mobile/shared/MobileAttendancePage.tsx:175 | toFixed | `Work hours: <span className="font-mono font-semibold">{todayRecord.workHours.toFixed(1)} h</span>` | toFixed render/display |
| src/pages/mobile/shared/MobileAttendancePage.tsx:230 | toFixed | `<p className="text-[10px] text-muted-foreground mt-1 font-mono">{r.workHours.toFixed(1)}h</p>` | toFixed render/display |
| src/components/uth/IRNLockBanner.tsx:46 | toFixed | `? `${remaining.toFixed(1)}h remaining in 24-hour cancellation window`` | toFixed render/display |
| src/pages/mobile/salesman/MobileVisitCheckInPage.tsx:255 | toFixed | `<p className="font-mono">{customer.geo_lat.toFixed(4)}, {customer.geo_lng.toFixed(4)}</p>` | toFixed render/display |
| src/pages/mobile/salesman/MobileVisitCheckInPage.tsx:282 | toFixed | `<AlertTriangle className="h-3 w-3 mr-1" /> {distanceFromCustomer?.toFixed(0)}m away` | toFixed render/display |
| src/pages/mobile/salesman/MobileVisitCheckInPage.tsx:287 | toFixed | `{checkInGeo.latitude.toFixed(5)}, {checkInGeo.longitude.toFixed(5)} (±{checkInGeo.accuracy_meters?.toFixed(0) ?? '–'}m)` | toFixed render/display |
| src/features/party-master/components/KPIBadgeGroup.tsx:12 | toFixed | `if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;` | toFixed render/display |
| src/features/party-master/components/KPIBadgeGroup.tsx:13 | toFixed | `if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;` | toFixed render/display |
| src/features/party-master/components/KPIBadgeGroup.tsx:14 | toFixed | `if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;` | toFixed render/display |
| src/features/party-master/components/KPIBadgeGroup.tsx:15 | toFixed | `return `₹${n.toFixed(0)}`;` | toFixed render/display |
| src/features/party-master/components/CustomerIntelligenceDashboard.tsx:28 | toFixed | `if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;` | toFixed render/display |
| src/features/party-master/components/CustomerIntelligenceDashboard.tsx:29 | toFixed | `if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;` | toFixed render/display |
| src/features/party-master/components/CustomerIntelligenceDashboard.tsx:30 | toFixed | `if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;` | toFixed render/display |
| src/features/party-master/components/CustomerIntelligenceDashboard.tsx:31 | toFixed | `return `₹${n.toFixed(0)}`;` | toFixed render/display |
| src/pages/mobile/salesman/MobileTimeEntriesPage.tsx:231 | toFixed | `<p className="text-base font-mono font-semibold">{hoursThisWeek.toFixed(2)}h</p>` | toFixed render/display |
| src/pages/mobile/salesman/MobileSalesmanTargetsPage.tsx:105 | toFixed | `{pct.toFixed(0)}%` | toFixed render/display |
| src/pages/mobile/manager/MobileProjectHealthPage.tsx:269 | toFixed | `<p className="text-xs font-mono font-semibold">{pnl.margin_pct.toFixed(0)}%</p>` | toFixed render/display |
| src/pages/mobile/manager/MobilePipelineHealthPage.tsx:82 | toFixed | `<p className="text-sm font-mono mt-1">Enq → Quo: <span className="font-bold">{e2q.toFixed(0)}%</span></p>` | toFixed render/display |
| src/pages/mobile/manager/MobilePipelineHealthPage.tsx:83 | toFixed | `<p className="text-sm font-mono">Quo → SO: <span className="font-bold">{q2o.toFixed(0)}%</span></p>` | toFixed render/display |
| src/pages/erp/pay-hub/transactions/DocumentManagement.tsx:41 | toFixed | `if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;` | toFixed render/display |
| src/pages/erp/pay-hub/transactions/DocumentManagement.tsx:42 | toFixed | `return `${(bytes / 1_048_576).toFixed(1)} MB`;` | toFixed render/display |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:85 | toFixed | `toast.error(`Allocation total ${totalQty.toFixed(3)} does not equal line qty ${lineQty.toFixed(3)}`);` | toFixed money display path |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:116 | toFixed | `Line Qty: <span className="font-mono">{lineQty.toFixed(3)}</span>` | toFixed render/display |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:212 | toFixed | `<TableCell className="text-right font-mono text-sm">{row.rate.toFixed(2)}</TableCell>` | toFixed render/display |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:213 | toFixed | `<TableCell className="text-right font-mono text-sm">{row.taxable_value.toFixed(2)}</TableCell>` | toFixed render/display |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:230 | toFixed | `<>Allocated: <span className="font-mono">{totalQty.toFixed(3)}</span> / {lineQty.toFixed(3)}</>` | toFixed render/display |
| src/pages/mobile/manager/MobileManagerTargetsPage.tsx:135 | toFixed | `{r.pct.toFixed(0)}%` | toFixed render/display |
| src/pages/erp/store-hub/StoreHubPanels.tsx:268 | toFixed | `<TableCell className="font-mono text-xs text-right">{r.avg_daily_consumption.toFixed(2)}</TableCell>` | toFixed render/display |
| src/features/loan-emi/engines/processing-fee-engine.ts:227 | toFixed | `narration: `IGST ₹${gstSpec.igstAmount.toFixed(2)} on processing fee — ${ledger.name}`,` | toFixed money display path |
| src/pages/erp/sitex/transactions/SiteImprestPanel.tsx:103 | toFixed | `<Badge variant="outline" className={gaugeColor}>{utilPct.toFixed(1)}%</Badge>` | toFixed render/display |
| src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:242 | toFixed | `{ss.minCTC > 0 ? `₹${(ss.minCTC / 100000).toFixed(1)}L — ₹${(ss.maxCTC / 100000).toFixed(1)}L` : '—'}` | toFixed render/display |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:190 | toFixed | `{g.minCTC > 0 ? `₹${(g.minCTC / 100000).toFixed(1)}L — ₹${(g.maxCTC / 100000).toFixed(1)}L` : '—'}` | toFixed render/display |
| src/pages/erp/sitex/reports/SiteTwinDashboard.tsx:47 | toFixed | `{ title: 'Imprest', icon: PiggyBank, value: `${(imprest?.utilization_pct ?? 0).toFixed(0)}%`, target: '60-85%', rag: (imprest?.utilization_p` | toFixed render/display |
| src/pages/mobile/manager/MobileCampaignPerformancePage.tsx:69 | toFixed | `ROI {(c.performance_metrics?.roi_pct ?? 0).toFixed(0)}%` | toFixed render/display |
| src/features/loan-emi/engines/bounce-engine.ts:229 | toFixed | `narration: `IGST ₹${gstSpec.igstAmount.toFixed(2)} on bounce charge — ${ledger.name}`,` | toFixed money display path |
| src/features/loan-emi/engines/accrual-engine.ts:187 | toFixed | `? `Being Interest Billing for ${ledger.name} — ${periodKey} (TDS ₹${tdsSpec.tdsAmount.toFixed(2)} deducted u/s ${tdsSpec.section})`` | toFixed money display path |
| src/features/loan-emi/components/LoanChargesMaster.tsx:48 | toFixed | `const penalAnnual = (draft.penalInterestRate * 365).toFixed(1);` | toFixed render/display |
| src/pages/mobile/MobileMaterialIssuePage.tsx:42 | toFixed | `setGeoStamp(loc.ok && loc.latitude !== undefined ? `${loc.latitude.toFixed(4)},${loc.longitude?.toFixed(4)}` : 'unavailable');` | toFixed render/display |
| src/pages/erp/sitex/registers/DPRRegister.tsx:111 | toFixed | `<span className="text-sm">Geo-fence blocked · photo {dist?.toFixed(0)}m from site (radius {site?.location.geo_radius_meters}m)</span>` | toFixed render/display |
| src/features/loan-emi/components/AccrualRunModal.tsx:199 | toFixed | `<TableCell className="text-xs font-mono text-right">{p.penalRate.toFixed(3)}%</TableCell>` | toFixed render/display |
| src/components/mobile/MobileSiteDPRCapture.tsx:196 | toFixed | `<div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{photoGeo?.lat.toFixed(5)}, {photoGeo?.` | toFixed render/display |
| src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx:112 | toFixed | `<td className="p-3 font-mono">{(l.total_cost_paise / 100).toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx:300 | toFixed | `<span className="font-mono text-xs">₹{(s.total_cost_paise / 100).toFixed(2)}</span>` | toFixed render/display |
| src/lib/dispute-workflow-engine.ts:133 | toFixed | `return `Over-billed by ₹${m.variance_amount.toFixed(2)} (${m.variance_pct.toFixed(1)}%) — expected ₹${m.expected_amount.toFixed(2)}, declare` | toFixed render/display |
| src/lib/cart-abandonment-engine.ts:69 | toFixed | `message: `You have ₹${(cart.subtotal_paise / 100).toFixed(0)} in your cart. We saved it for you.`,` | toFixed render/display |
| src/lib/audit-engine.ts:443 | toFixed | `message: `GP% is ${gpPct.toFixed(1)}%. Cross-check with P&L for consistency.`,` | toFixed render/display |
| src/lib/insight-generators.ts:51 | toFixed | `narrative: `${best.campaign_name} generated an ROI of ${roi.toFixed(0)}% with ₹${bestSpent.toLocaleString('en-IN')} spent. Order conversion ` | toFixed render/display |
| src/lib/insight-generators.ts:67 | toFixed | `narrative: `${worst.campaign_name} returned ${worst.performance_metrics.roi_pct.toFixed(0)}% ROI on ₹${worstSpent.toLocaleString('en-IN')} s` | toFixed render/display |
| src/lib/insight-generators.ts:124 | toFixed | `title: `${lbl}: ${best.conv_rate.toFixed(0)}% conversion`,` | toFixed render/display |
| src/lib/insight-generators.ts:125 | toFixed | `narrative: `${best.total} leads sourced from ${lbl}, of which ${best.converted} converted to enquiries (${best.conv_rate.toFixed(1)}%). This` | toFixed render/display |
| src/lib/insight-generators.ts:141 | toFixed | `narrative: `${w.dup_rate.toFixed(0)}% of leads from this platform are duplicates of existing entries. Wasted SDR time and inflated marketing` | toFixed render/display |
| src/lib/insight-generators.ts:176 | toFixed | `title: `Conversion gap: ${gap.toFixed(0)}% spread`,` | toFixed render/display |
| src/lib/insight-generators.ts:177 | toFixed | `narrative: `${ranked[0].telecaller_name} converts ${(bestRate * 100).toFixed(0)}% of calls while ${ranked[ranked.length - 1].telecaller_name` | toFixed render/display |
| src/lib/insight-generators.ts:221 | toFixed | `narrative: `${underUsed.length} agent(s) running below 30% utilisation. Average team utilisation is ${avgUtil.toFixed(0)}%. There is room to` | toFixed render/display |
| src/lib/insight-generators.ts:240 | toFixed | `title: `Average call quality: ${avgScore.toFixed(0)}/100`,` | toFixed render/display |
| src/lib/insight-generators.ts:241 | toFixed | `narrative: `${completed.length} call(s) reviewed with an average weighted score of ${avgScore.toFixed(1)}. ${avgScore >= 80 ? 'Strong overal` | toFixed render/display |
| src/lib/insight-generators.ts:263 | toFixed | `narrative: `Across ${completed.length} reviews, "${weakest.name}" averaged ${weakest.avg.toFixed(0)}/100 — the lowest among all criteria. Th` | toFixed render/display |
| src/lib/irn-lock-engine.ts:69 | toFixed | `? `IRN ${irn} generated · ${remaining.toFixed(1)}h remaining for cancellation`` | toFixed render/display |
| src/lib/irn-lock-engine.ts:113 | toFixed | `? `${lock.cancel_window_remaining_hours.toFixed(1)}h remaining for cancellation`` | toFixed render/display |
| src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx:62 | toFixed | `<td className="py-2 font-mono">{(r.revenue_paise / 100).toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx:63 | toFixed | `<td className="py-2 font-mono"><Badge variant="default">{(r.margin_paise / 100).toFixed(0)}</Badge></td>` | toFixed render/display |
| src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx:83 | toFixed | `<td className="py-2 font-mono">{(r.revenue_paise / 100).toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx:84 | toFixed | `<td className="py-2 font-mono"><Badge variant="destructive">{(r.margin_paise / 100).toFixed(0)}</Badge></td>` | toFixed render/display |
| src/lib/production-variance-engine.ts:133 | toFixed | `factors.push(`${pcLine.output_item_code}: ${pcLine.actual_qty} vs ${pcLine.planned_qty} (${pcLine.yield_pct.toFixed(1)}%)`);` | toFixed render/display |
| src/lib/production-variance-engine.ts:158 | toFixed | ``${(l.original_bom_item_id ?? '').slice(-6)} → ${l.item_code}: ${(l.cost_variance_pct \|\| 0).toFixed(1)}% (${l.substitute_reason ?? '—'})`` | toFixed render/display |
| src/lib/production-plan-engine.ts:401 | toFixed | ``Line ${l.line_no} (${l.item_name}): ${batches.toFixed(1)} batches needed · capacity tight`,` | toFixed render/display |
| src/pages/erp/masters/ledger-panels/BorrowingLedgerPanel.tsx:426 | toFixed | `Penal Rate: <span className="font-mono ml-auto">{(draft.penalInterestRate ?? 0).toFixed(3)}%/d</span>` | toFixed render/display |
| src/pages/erp/masters/ledger-panels/BorrowingLedgerPanel.tsx:432 | toFixed | `Foreclosure: <span className="font-mono ml-auto">{(draft.foreclosureChargeRate ?? 0).toFixed(2)}%</span>` | toFixed render/display |
| src/lib/production-confirmation-engine.ts:134 | toFixed | `ref_label: `${pc.doc_no} · yield ${yield_pct.toFixed(1)}%`,` | toFixed render/display |
| src/lib/material-wastage-forecaster.ts:56 | toFixed | `? `Wastage ${(wastageRate * 100).toFixed(1)}% exceeds ${input.category} threshold ${(threshold * 100).toFixed(1)}%`` | toFixed render/display |
| src/lib/rfq-engine.ts:325 | toFixed | ``${pctElapsed.toFixed(0)}% of timeout window elapsed · ${vendorsQuoted} quote(s) received · early pre-close possible.`,` | toFixed render/display |
| src/lib/rfq-engine.ts:333 | toFixed | ``RFQ within timeout window (${pctElapsed.toFixed(0)}% elapsed) · ${vendorsQuoted} quote(s) received.`,` | toFixed render/display |
| src/lib/scheme-engine.ts:111 | toFixed | `note: `Flat ₹${(p.discount_paise / 100).toFixed(0)} off`,` | toFixed render/display |
| src/lib/scheme-engine.ts:129 | toFixed | `note: `Bundle — ₹${(discount / 100).toFixed(0)} off`,` | toFixed render/display |
| src/lib/scheme-engine.ts:177 | toFixed | `if (gap > 0) hints.push(`Add ₹${(gap / 100).toFixed(0)} more to unlock ${s.name}`);` | toFixed render/display |
| src/pages/erp/servicedesk/repair-routing/SparesIssuedFromField.tsx:48 | toFixed | `<td className="p-3 font-mono">{(s.total_cost_paise / 100).toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx:134 | toFixed | `<td className="p-3 font-mono">{(u.refurb_cost_paise / 100).toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx:135 | toFixed | `<td className="p-3 font-mono">{(u.resale_price_paise / 100).toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx:138 | toFixed | `{(u.margin_paise / 100).toFixed(0)}` | toFixed render/display |
| src/pages/erp/servicedesk/refurbished/RefurbSpareInventoryTier.tsx:56 | toFixed | `<td className="p-3 font-mono">{(s.total_cost_paise / 100).toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/servicedesk/quote-optimizer/ServiceQuoteOptimizer.tsx:70 | toFixed | `<div className="font-mono text-lg">₹ {(suggestion.suggested_charge_paise / 100).toFixed(0)}</div>` | toFixed render/display |
| src/lib/storage-quota-engine.ts:102 | toFixed | `reason: `Storage at ${usage.pct.toFixed(1)}% — all writes blocked. Export & archive old data to continue.`,` | toFixed render/display |
| src/lib/storage-quota-engine.ts:109 | toFixed | `reason: `Storage at ${usage.pct.toFixed(1)}% — new voucher creation blocked. Edits and views still allowed. Archive old data to resume creat` | toFixed render/display |
| src/lib/storage-quota-engine.ts:159 | toFixed | `if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;` | toFixed render/display |
| src/pages/erp/masters/CustomerMaster.tsx:2009 | toFixed | `₹{(r.revenueYTD / 100_000).toFixed(1)}L · {r.greenCount}G/{r.amberCount}A/{r.redCount}R` | toFixed render/display |
| src/pages/erp/maintainpro/transactions/SparesIssueEntry.tsx:52 | toFixed | `<div className="text-sm">Velocity spike · current {last.current_velocity.toFixed(1)}/mo vs median {last.historical_median_velocity.toFixed(1` | toFixed render/display |
| src/lib/sourcing-recommendation-engine.ts:111 | toFixed | `rationale.push(`Top 2 vendors within ${spread.toFixed(1)}% score spread · split for resilience`);` | toFixed render/display |
| src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx:142 | toFixed | `<td className="p-3 font-mono">{(p.hourly_rate_paise / 100).toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:220 | toFixed | `m.lr_no, m.dln_voucher_no ?? '', m.expected_amount.toFixed(2),` | toFixed money display path |
| src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:221 | toFixed | `m.declared_amount.toFixed(2), m.variance_amount.toFixed(2),` | toFixed money display path |
| src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:222 | toFixed | `m.variance_pct.toFixed(2), m.status, m.auto_decision,` | toFixed money display path |
| src/pages/erp/distributor-hub/reports/EngagementReport.tsx:61 | toFixed | `? (recentOrders.length / distributors.length).toFixed(1)` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:181 | toFixed | `i + 1, s.logistic_name, s.grade, s.composite_score.toFixed(1),` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:182 | toFixed | `s.delta_vs_prev !== null ? s.delta_vs_prev.toFixed(1) : '—',` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:184 | toFixed | `s.avg_payment_cycle_days.toFixed(1),` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:242 | toFixed | `<span className="text-xs font-mono">{kpi.top.composite_score.toFixed(1)}</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:258 | toFixed | `<span className="text-xs font-mono">{kpi.bottom.composite_score.toFixed(1)}</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:266 | toFixed | `<p className="text-2xl font-bold font-mono mt-1">{kpi.avg.toFixed(1)}</p>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:310 | toFixed | `{s.composite_score.toFixed(1)}` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:317 | toFixed | `<TrendingUp className="h-3 w-3" /> +{s.delta_vs_prev.toFixed(1)}` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:321 | toFixed | `<TrendingDown className="h-3 w-3" /> {s.delta_vs_prev.toFixed(1)}` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:332 | toFixed | `{s.accuracy_score.toFixed(0)}%` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:335 | toFixed | `{s.avg_payment_cycle_days.toFixed(1)}` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:375 | toFixed | `<span className="font-mono">{wDispute.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:383 | toFixed | `<span className="font-mono">{wAccuracy.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:391 | toFixed | `<span className="font-mono">{wCycle.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/TransporterScorecard.tsx:400 | toFixed | `Sum: {wSum.toFixed(0)}% {sumValid ? '✓' : '— must equal 100%'}` | toFixed render/display |
| src/pages/erp/salesx/transactions/SmartInsightsPanel.tsx:151 | toFixed | `{ins.metric_value.toFixed(ins.metric_value % 1 === 0 ? 0 : 1)}{ins.metric_label ?? ''}` | toFixed render/display |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:250 | toFixed | `b.name, b.flagged.toFixed(0), b.recovered.toFixed(0), (b.recovered - b.flagged).toFixed(0),` | toFixed render/display |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:316 | toFixed | `<p className="text-2xl font-bold font-mono mt-1">{kpi.recoveryRate.toFixed(1)}%</p>` | toFixed render/display |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:323 | toFixed | `{kpi.roiMultiple.toFixed(2)}x` | toFixed render/display |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:337 | toFixed | `<strong className="text-emerald-700">Payback: {paybackMonths.toFixed(1)} months.</strong>{' '}` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:181 | toFixed | `r.declared.toFixed(2), r.expected.toFixed(2),` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:182 | toFixed | `(r.declared - r.expected).toFixed(2), varPct.toFixed(2),` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:183 | toFixed | `r.disputes, r.savingsFlagged.toFixed(2),` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:248 | toFixed | `<span className="text-emerald-600 font-mono">{kpi.pctAuto.toFixed(1)}% auto-approved</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:249 | toFixed | `<span className="text-amber-600 font-mono">{kpi.pctFlag.toFixed(1)}% flagged</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:250 | toFixed | `<span className="text-red-600 font-mono">{kpi.pctDisp.toFixed(1)}% disputed</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx:295 | toFixed | `<TableCell className="text-right font-mono text-xs">{varPct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:161 | toFixed | `return `${r.code},${r.uom},${r.standard.toFixed(3)},${r.actual.toFixed(3)},${v.toFixed(3)},${vp.toFixed(2)}%,${(r.cost_paise / 100).toFixed(` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:206 | toFixed | `}`}>{totals.variancePct.toFixed(1)}%</p>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:255 | toFixed | `<TableCell className="text-right font-mono">{r.standard.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:256 | toFixed | `<TableCell className="text-right font-mono">{r.actual.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:257 | toFixed | `<TableCell className="text-right font-mono">{v.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:258 | toFixed | `<TableCell className="text-right font-mono">{vp.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:260 | toFixed | `<TableCell className="text-right font-mono">{(r.cost_paise / 100).toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:292 | toFixed | `<TableCell className="text-right font-mono">{t.standard.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:293 | toFixed | `<TableCell className="text-right font-mono">{t.actual.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:294 | toFixed | `<TableCell className="text-right font-mono text-amber-600">{(t.actual - t.standard).toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:295 | toFixed | `<TableCell className="text-right font-mono">{(t.excess_paise / 100).toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:121 | toFixed | ``${i + 1},${r.packer_name},${r.dlns},${r.avg_variance_pct.toFixed(2)},${(r.total_excess_paise / 100).toFixed(2)},${r.flag}`` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:180 | toFixed | `}`}>{r.avg_variance_pct.toFixed(2)}%</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:181 | toFixed | `<TableCell className="text-right font-mono">{(r.total_excess_paise / 100).toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:210 | toFixed | `<span className="font-mono">{insights.best.avg_variance_pct.toFixed(2)}%</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:218 | toFixed | `<span className="font-mono">{insights.topWasteMat.excess.toFixed(2)} units over standard</span>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:257 | toFixed | `<TableCell className="text-right font-mono">{d.standard_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:258 | toFixed | `<TableCell className="text-right font-mono">{d.actual_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:262 | toFixed | `}`}>{d.variance_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/SLAPerformanceReport.tsx:53 | toFixed | `return <td key={s} className={`p-2 font-mono text-xs ${cellBg(pct)}`}>{pct.toFixed(0)}% ({cell.met}/{cell.total})</td>;` | toFixed render/display |
| src/pages/erp/maintainpro/reports/MTBFMTTRReport.tsx:34 | toFixed | `<td className="p-2 font-mono">{r.uptime_pct_12m.toFixed(1)}%</td>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/MTBFMTTRReport.tsx:36 | toFixed | `<td className="p-2 font-mono">{r.mtbfDays === null ? '—' : r.mtbfDays.toFixed(1)}</td>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/MTBFMTTRReport.tsx:37 | toFixed | `<td className="p-2 font-mono">{r.mttrMin === null ? '—' : r.mttrMin.toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx:32 | toFixed | `<div className="rounded border p-3"><div className="text-xs text-muted-foreground">Total kWh (12m est.)</div><div className="text-2xl font-m` | toFixed render/display |
| src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx:35 | toFixed | `<div className="rounded border p-3"><div className="text-xs text-muted-foreground">CO₂e (est.)</div><div className="text-2xl font-mono">{(da` | toFixed render/display |
| src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx:48 | toFixed | `<td className="p-2 font-mono">{kwh.toFixed(0)}</td>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx:49 | toFixed | `<td className="p-2 font-mono">{data.total === 0 ? '—' : ((kwh / data.total) * 100).toFixed(1)}%</td>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/AgingTicketsReport.tsx:38 | toFixed | `<td className="p-2 font-mono text-destructive">+{r.hoursOver.toFixed(1)}</td>` | toFixed render/display |
| src/pages/erp/inventory/transactions/CycleCountEntry.tsx:566 | toFixed | `<TableCell className="text-right font-mono text-xs">{variance.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx:230 | toFixed | `<td className="text-right font-mono">{l.total_gross_kg.toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx:239 | toFixed | `<td className="text-right font-mono">{activeSlip.total_gross_kg.toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx:287 | toFixed | `<TableCell className="text-right font-mono">{r.standard_qty.toFixed(3)}</TableCell>` | toFixed render/display |
| src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx:66 | toFixed | `{v}: {s.returned > 0 ? (s.totalDays / s.returned).toFixed(1) : '—'}d` | toFixed render/display |
| src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx:331 | toFixed | `{(file.size / 1024).toFixed(1)} KB` | toFixed render/display |
| src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx:463 | toFixed | `{conf.toFixed(0)}%` | toFixed render/display |
| src/pages/erp/salesx/transactions/LeadDistributionHub.tsx:320 | toFixed | `<span className="text-xs font-mono">{c.utilisation_pct.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/fincore/reports/Form3CD.tsx:163 | toFixed | `gpPct: ((gp / turnover) * 100).toFixed(1),` | toFixed render/display |
| src/pages/erp/fincore/reports/Form3CD.tsx:164 | toFixed | `npPct: ((np / turnover) * 100).toFixed(1),` | toFixed render/display |
| src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx:319 | toFixed | `<TableCell className="text-right font-mono text-xs">{l.transporter_declared_amount.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx:320 | toFixed | `<TableCell className="text-right font-mono text-xs">{l.gst_amount.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx:321 | toFixed | `<TableCell className="text-right font-mono text-xs">{l.total.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/DisputeQueue.tsx:258 | toFixed | `<TableCell className="text-right font-mono text-xs">{d.variance_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/dispatch/transactions/DisputeQueue.tsx:319 | toFixed | `<div><p className="text-muted-foreground">Variance</p><p className="font-mono">{activeDispute.variance_pct.toFixed(1)}%</p></div>` | toFixed render/display |
| src/pages/erp/fincore/registers/StockTransferRegister.tsx:33 | toFixed | `{ key: 'qty',     label: 'Qty',          render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines), a` | toFixed render/display |
| src/pages/erp/fincore/registers/StockTransferRegister.tsx:50 | toFixed | `{ label: 'Total Qty',  value: qty.toFixed(2) },` | toFixed money display path |
| src/pages/erp/dispatch/transactions/DeliveryMemoEntry.tsx:176 | toFixed | `() => +items.reduce((s, it) => s + it.amount, 0).toFixed(2),` | toFixed money display path |
| src/pages/erp/dispatch/masters/PackingBOMMaster.tsx:238 | toFixed | `₹ {(b.total_packing_cost_paise / 100).toFixed(2)} / unit` | toFixed money display path |
| src/pages/erp/dispatch/masters/PackingBOMMaster.tsx:340 | toFixed | `Running cost: ₹ {(runningCost / 100).toFixed(2)} / unit` | toFixed money display path |
| src/pages/erp/dispatch/masters/PackingBOMMaster.tsx:427 | toFixed | `₹ {(s.total_packing_cost_paise / 100).toFixed(2)}` | toFixed money display path |
| src/pages/erp/fincore/registers/StockJournalRegister.tsx:40 | toFixed | `{ key: 'netqty',  label: 'Net Qty',           render: v => netQty(v.inventory_lines).toFixed(2), exportKey: v => netQty(v.inventory_lines), ` | toFixed render/display |
| src/pages/erp/salesx/transactions/ExhibitionMaster.tsx:934 | toFixed | `? `${((summary.pipeline / form.budget.total_planned) * 100).toFixed(1)}%`` | toFixed render/display |
| src/pages/erp/accounting/LedgerMaster.tsx:708 | toFixed | `const [rupees, paiseStr] = amount.toFixed(2).split('.');` | toFixed money display path |
| src/pages/erp/accounting/LedgerMaster.tsx:2387 | toFixed | `if (abs >= 1_00_00_000) return `₹${(abs / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;` | toFixed render/display |
| src/pages/erp/accounting/LedgerMaster.tsx:2388 | toFixed | `if (abs >= 1_00_000) return `₹${(abs / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;` | toFixed render/display |
| src/pages/erp/accounting/LedgerMaster.tsx:2389 | toFixed | `if (abs >= 1_000) return `₹${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;` | toFixed render/display |
| src/pages/erp/inventory/PrintQueue.tsx:140 | toFixed | `const rate = ((reprints.length / total) * 100).toFixed(1);` | toFixed render/display |
| src/pages/erp/inventory/reports/print/CycleCountPrint.tsx:69 | toFixed | `<span className="font-semibold">Variance Summary:</span> {count.variance_lines} of {count.total_lines} lines varied · \|Qty\| {count.total_v` | toFixed render/display |
| src/pages/erp/salesx/reports/PipelineSummary.tsx:120 | toFixed | `<p className="text-2xl font-bold font-mono mt-1">{winRate.toFixed(1)}%</p>` | toFixed render/display |
| src/pages/erp/salesx/reports/PipelineSummary.tsx:138 | toFixed | `<span className="font-mono">{c} · {pct.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/salesx/reports/PipelineSummary.tsx:175 | toFixed | `<TableCell className="text-xs text-right font-mono">{wr.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/inventory/HeatMaster.tsx:177 | toFixed | `toast.warning(`MTC file is ${(file.size / 1024 / 1024).toFixed(1)}MB — large files may slow down the page`);` | toFixed render/display |
| src/pages/erp/fincore/registers/StockAdjustmentRegister.tsx:40 | toFixed | `{ key: 'netqty',  label: 'Net Qty Adjust', render: v => netQtyAdjust(v.inventory_lines).toFixed(2), exportKey: v => netQtyAdjust(v.inventory` | toFixed render/display |
| src/pages/erp/fincore/registers/StockAdjustmentRegister.tsx:59 | toFixed | `{ label: 'Net Qty',    value: totalNet.toFixed(2) },` | toFixed money display path |
| src/pages/erp/salesx/reports/CommissionRegister.tsx:772 | toFixed | `Variance: ₹{inrFmt.format(variance)} ({variancePct.toFixed(2)}%)` | toFixed render/display |
| src/pages/erp/salesx/reports/CallLogHistoryReport.tsx:139 | toFixed | `<CardContent><p className="text-2xl font-mono font-bold text-amber-600">{stats.conversionRate.toFixed(1)}%</p></CardContent>` | toFixed render/display |
| src/pages/customer/Statement.tsx:29 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/customer/Statement.tsx:35 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/customer/Profile.tsx:33 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/erp/inventory/ItemRatesMRP.tsx:587 | toFixed | `{h.new_rate > h.old_rate ? '↑' : '↓'} {Math.abs(((h.new_rate - h.old_rate) / h.old_rate) * 100).toFixed(1)}%` | toFixed render/display |
| src/pages/erp/fincore/registers/ApprovalsPendingPage.tsx:153 | toFixed | `<CardContent><p className="text-2xl font-bold font-mono">{kpis.avgWait.toFixed(1)}</p></CardContent></Card>` | toFixed render/display |
| src/pages/erp/inventory/reports/ConsumptionRegister.tsx:125 | toFixed | `<TableCell className="text-right text-xs font-mono">{l.variance_percent.toFixed(2)}%</TableCell>` | toFixed render/display |
| src/pages/erp/accounting/EPFESILWFMaster.tsx:71 | toFixed | `<Card className="p-4"><p className="text-sm text-muted-foreground">Employer Total</p><p className="text-2xl font-bold">{epfErTotal.toFixed(2` | toFixed render/display |
| src/pages/erp/accounting/CurrencyMaster.tsx:341 | toFixed | `const num = sampleAmount.toFixed(form.decimal_places);` | toFixed money display path |
| src/pages/erp/customer-hub/reports/ChurnRiskReport.tsx:194 | toFixed | `{(r.churn_probability * 100).toFixed(0)}%` | toFixed render/display |
| src/pages/customer/Payments.tsx:33 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | toFixed money display path |
| src/pages/customer/Payments.tsx:34 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/erp/distributor/DistributorCRM.tsx:269 | toFixed | `<span className="font-mono text-muted-foreground">{st.n} · {st.pct.toFixed(0)}%</span>` | toFixed render/display |
| src/pages/erp/fincore/registers/DeliveryNoteRegister.tsx:40 | toFixed | `{ key: 'qty',     label: 'Total Qty',      render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines),` | toFixed render/display |
| src/pages/erp/fincore/registers/DeliveryNoteRegister.tsx:60 | toFixed | `{ label: 'Total Qty', value: qty.toFixed(2) },` | toFixed money display path |
| src/pages/customer/Orders.tsx:41 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/erp/inventory/reports/detail/CycleCountDetailPanel.tsx:58 | toFixed | `<div><div className="text-xs text-muted-foreground">Net Shrink %</div><div className="font-mono">{count.net_shrinkage_pct.toFixed(2)}%</div>` | toFixed render/display |
| src/pages/erp/inventory/reports/detail/CycleCountDetailPanel.tsx:61 | toFixed | `<span className="font-semibold">Variance Summary:</span> {count.variance_lines} of {count.total_lines} lines · Net ₹{fmtINR(count.total_vari` | toFixed render/display |
| src/pages/erp/fincore/registers/ReceiptNoteRegister.tsx:40 | toFixed | `{ key: 'qty',      label: 'Total Qty',     render: v => totalQty(v.inventory_lines).toFixed(2), exportKey: v => totalQty(v.inventory_lines),` | toFixed render/display |
| src/pages/erp/fincore/registers/ReceiptNoteRegister.tsx:60 | toFixed | `{ label: 'Total Qty',  value: qty.toFixed(2) },` | toFixed money display path |
| src/pages/erp/salesx/reports/CampaignPerformanceReport.tsx:364 | toFixed | `{roi.toFixed(1)}%` | toFixed render/display |
| src/pages/erp/salesx/masters/CampaignMaster.tsx:339 | toFixed | `{roi.toFixed(1)}%` | toFixed render/display |
| src/pages/erp/inventory/reports/BinUtilizationReport.tsx:148 | toFixed | `<TableCell className="text-right font-mono text-xs">{r.total_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/inventory/reports/BinUtilizationReport.tsx:149 | toFixed | `<TableCell className="text-right font-mono text-xs">{r.utilization.toFixed(0)}%</TableCell>` | toFixed render/display |
| src/pages/erp/inventory/reports/CycleCountRegister.tsx:83 | toFixed | `{ key: 'shrinkage', label: 'Shrink %', align: 'right', render: r => `${r.net_shrinkage_pct.toFixed(2)}%`, exportKey: 'net_shrinkage_pct' },` | toFixed render/display |
| src/pages/erp/customer-hub/reports/CLVRankingsReport.tsx:221 | toFixed | `<td className="py-2 px-3 text-right font-mono">{(r.retention_probability * 100).toFixed(0)}%</td>` | toFixed render/display |
| src/pages/customer/Invoices.tsx:27 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | toFixed money display path |
| src/pages/customer/Invoices.tsx:28 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/erp/bill-passing/BillPassingRegisterPanel.tsx:130 | toFixed | `{b.variance_pct.toFixed(2)}%` | toFixed render/display |
| src/pages/customer/CustomerDashboard.tsx:54 | toFixed | `if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:357 | toFixed | `<div><span className="text-muted-foreground">Variance:</span> <span className="font-mono">{bill.variance_pct.toFixed(2)}%</span></div>` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:478 | toFixed | `<TableCell className="text-right font-mono">{b.variance_pct.toFixed(2)}%</TableCell>` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:629 | toFixed | `<Badge variant={severity}>{b.variance_pct.toFixed(2)}%</Badge>` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:659 | toFixed | `<div><span className="text-muted-foreground">Variance:</span> <span className="font-mono">{formatINR(reviewBill.total_variance)} ({reviewBil` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:696 | toFixed | `<div><strong>Variance:</strong> {compliance.variance_pct >= 0 ? '+' : ''}{compliance.variance_pct.toFixed(2)}%</div>` | toFixed render/display |
| src/pages/erp/bill-passing/panels.tsx:833 | toFixed | `<div><span className="text-muted-foreground">Variance:</span> <span className="font-mono">{fmtINR(printPayload.total_variance)} ({printPaylo` | toFixed render/display |
| src/pages/erp/qualicheck/operational-panels.tsx:224 | toFixed | `<TableCell className="font-mono text-xs">{v.acceptance_rate_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/qualicheck/operational-panels.tsx:225 | toFixed | `<TableCell className="font-mono text-xs">{v.rejection_rate_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/qualicheck/operational-panels.tsx:226 | toFixed | `<TableCell className="font-mono text-xs">{v.critical_defect_rate_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/production/transactions/ProductionOrderEntry.tsx:366 | toFixed | `if (!allocOk) { toast.error(`Cost allocation must total 100% (currently ${totalAllocPct.toFixed(2)}%)`); return; }` | toFixed money display path |
| src/pages/erp/production/transactions/ProductionOrderEntry.tsx:648 | toFixed | `{totalAllocPct.toFixed(2)}%` | toFixed money display path |
| src/pages/erp/production/transactions/ProductionOrderEntry.tsx:864 | toFixed | `<div className="text-lg font-mono font-bold">₹{masterCost.total.toFixed(2)}</div>` | toFixed render/display |
| src/pages/erp/production/transactions/ProductionOrderEntry.tsx:868 | toFixed | `<div className="text-lg font-mono">₹{masterCost.per_unit.toFixed(2)}</div>` | toFixed render/display |
| src/pages/erp/payout/CashFlowDashboard.tsx:161 | toFixed | `<YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />` | toFixed render/display |
| src/pages/erp/payout/CashFlowDashboard.tsx:187 | toFixed | `<YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />` | toFixed render/display |
| src/pages/erp/production/transactions/MaterialIssueEntry.tsx:259 | toFixed | `<Label className="text-xs">Issue Qty (max {remaining.toFixed(2)})</Label>` | toFixed render/display |
| src/pages/erp/production/transactions/JobWorkReceiptEntry.tsx:250 | toFixed | `<Label className="text-xs">Receive Qty (max {remaining.toFixed(2)})</Label>` | toFixed render/display |
| src/pages/erp/procure-hub/reports/GoodsInwardDayBookPanel.tsx:111 | toFixed | `<td className="p-2 text-right font-mono">{r.qty.toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/projx/reports/detail/ProjectDetailPanel.tsx:83 | toFixed | `<div><div className="text-xs text-muted-foreground">Margin %</div><div className="font-mono">{project.margin_pct.toFixed(1)}%</div></div>` | toFixed render/display |
| src/pages/erp/procure-hub/reports/VarianceAuditPanel.tsx:58 | toFixed | `<div className="text-2xl font-mono font-bold mt-1 text-warning">{avgVariancePct.toFixed(2)}%</div>` | toFixed render/display |
| src/pages/erp/procure-hub/reports/VarianceAuditPanel.tsx:87 | toFixed | `<td className="p-2 text-right font-mono">{b.variance_pct.toFixed(2)}%</td>` | toFixed render/display |
| src/pages/erp/procure-hub/panels.tsx:997 | toFixed | ``Pre-Close: ${rec.reason_text} · invited ${rec.vendors_invited} · quoted ${rec.vendors_quoted} · ${rec.pct_elapsed.toFixed(1)}% elapsed`,` | toFixed render/display |
| src/pages/erp/procure-hub/panels.tsx:1082 | toFixed | `notes: `Vendor rate ${variance.toFixed(1)}% above best`,` | toFixed render/display |
| src/pages/erp/procure-hub/panels.tsx:1085 | toFixed | `toast.info(`Cost leakage logged · ${variance.toFixed(1)}% above best`);` | toFixed render/display |
| src/pages/erp/procure-hub/panels.tsx:1416 | toFixed | `totalSpend > 0 ? `${((r.spend / totalSpend) * 100).toFixed(1)}%` : '0%',` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:105 | toFixed | `<KpiCard label="Total Wastage Qty" value={totalQty.toFixed(2)} />` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:106 | toFixed | `<KpiCard label="Total Wastage Value" value={`₹${totalValue.toFixed(2)}`} />` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:156 | toFixed | `<TableCell className="text-right font-mono">{row.total_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:157 | toFixed | `<TableCell className="text-right font-mono">₹{row.total_value.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:159 | toFixed | `<TableCell className="text-right font-mono">{row.pct_of_total.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/WastageDashboard.tsx:162 | toFixed | `{row.cumulative_pct.toFixed(1)}%` | toFixed render/display |
| src/pages/erp/procure-hub/reports/ThreeWayMatchStatusPanel.tsx:126 | toFixed | `<td className="p-2 text-right font-mono">{b.variance_pct.toFixed(2)}%</td>` | toFixed render/display |
| src/pages/erp/procure-hub/reports/TdsDeductionReportPanel.tsx:96 | toFixed | `<td className="p-2 text-right font-mono">{(b.tds_breakdown?.rate ?? 0).toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/production/reports/ProductionVarianceDashboard.tsx:116 | toFixed | `<div className="text-2xl font-bold font-mono">{avgPct.toFixed(2)}%</div></CardContent></Card>` | toFixed render/display |
| src/pages/erp/production/reports/ProductionVarianceDashboard.tsx:185 | toFixed | `<div className={cellClass(c)}>{fmtINR(c.amount)} · {c.pct.toFixed(2)}%</div>` | toFixed render/display |
| src/pages/erp/production/reports/CapacityPlanningDashboard.tsx:179 | toFixed | `<div className="text-2xl font-bold font-mono">{enrichedRows.reduce((s, r) => s + r.available_hours, 0).toFixed(0)} h</div>` | toFixed render/display |
| src/pages/erp/production/reports/CapacityPlanningDashboard.tsx:183 | toFixed | `<div className="text-2xl font-bold font-mono">{enrichedRows.reduce((s, r) => s + r.committed_hours, 0).toFixed(0)} h</div>` | toFixed render/display |
| src/pages/erp/production/reports/CapacityPlanningDashboard.tsx:258 | toFixed | `<TableCell className="text-right font-mono">{r.available_hours.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/CapacityPlanningDashboard.tsx:259 | toFixed | `<TableCell className="text-right font-mono">{r.committed_hours.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/CapacityPlanningDashboard.tsx:260 | toFixed | `<TableCell className="text-right font-mono">{r.utilization_pct.toFixed(1)}%</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/PlanActualRolling.tsx:218 | toFixed | `{g.planned > 0 ? ((g.produced / g.planned) * 100).toFixed(1) : '—'}%` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:53 | toFixed | `<Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Produced</div><div className="text-2xl font-mono">{s` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:54 | toFixed | `<Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Cost</div><div className="text-2xl font-mono">₹ {sum` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:55 | toFixed | `<Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Avg Yield %</div><div className="text-2xl font-mono">{summ` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:115 | toFixed | `<TableCell className="font-mono">{e.total_planned_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:116 | toFixed | `<TableCell className="font-mono">{e.total_produced_qty.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:117 | toFixed | `<TableCell className="font-mono">{e.yield_pct.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:118 | toFixed | `<TableCell className="font-mono">{e.total_scheduled_hours.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:119 | toFixed | `<TableCell className="font-mono">{e.total_actual_hours.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/DailyWorkRegisterReport.tsx:120 | toFixed | `<TableCell className="font-mono">₹ {e.total_cost.toFixed(2)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:134 | toFixed | `<div className="text-2xl font-bold font-mono">{avgOEE.toFixed(1)}%</div>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:214 | toFixed | `<TableCell className="text-right font-mono">{(r.result.availability_pct ?? 0).toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:215 | toFixed | `<TableCell className="text-right font-mono">{(r.result.performance_pct ?? 0).toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:216 | toFixed | `<TableCell className="text-right font-mono">{(r.result.quality_pct ?? 0).toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:219 | toFixed | `<TableCell className="text-right font-mono">{(r.result.availability_pct ?? 0).toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:220 | toFixed | `<TableCell className="text-right font-mono">{(r.result.quality_pct ?? 0).toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/OEEDashboard.tsx:229 | toFixed | `<TableCell className="text-right font-mono font-bold">{r.result.oee_pct.toFixed(1)}</TableCell>` | toFixed render/display |
| src/pages/erp/production/reports/ProductionOrderRegister.tsx:136 | toFixed | `<td className="p-2 text-right font-mono">₹{po.cost_structure.master.total.toFixed(2)}</td>` | toFixed render/display |
| src/pages/erp/production/reports/ProductionPlanRegister.tsx:38 | toFixed | `if (pct >= 80) return <Badge className="bg-success/15 text-success border-success/30">{pct.toFixed(0)}%</Badge>;` | toFixed render/display |
| src/pages/erp/production/reports/ProductionPlanRegister.tsx:39 | toFixed | `if (pct >= 50) return <Badge className="bg-warning/15 text-warning border-warning/30">{pct.toFixed(0)}%</Badge>;` | toFixed render/display |
| src/pages/erp/production/reports/ProductionPlanRegister.tsx:40 | toFixed | `return <Badge className="bg-destructive/15 text-destructive border-destructive/30">{pct.toFixed(0)}%</Badge>;` | toFixed render/display |
| src/pages/erp/projx/reports/CashFlowProjectionReport.tsx:90 | toFixed | `if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;` | toFixed render/display |
| src/pages/erp/projx/reports/CashFlowProjectionReport.tsx:91 | toFixed | `if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;` | toFixed render/display |
| src/pages/erp/projx/reports/CashFlowProjectionReport.tsx:512 | toFixed | `tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}` | toFixed render/display |
| src/pages/erp/production/reports/JobWorkVarianceAnalysis.tsx:45 | toFixed | `return <Badge variant={variant}>{pct.toFixed(2)}%</Badge>;` | toFixed render/display |
| src/pages/erp/procure-hub/reports/PreClosePendingPanel.tsx:87 | toFixed | `<td className="p-2 text-right font-mono">{r.pct_elapsed.toFixed(1)}%</td>` | toFixed render/display |
| src/types/webinar.ts:144 | Math.round | `? Math.round((o.attendees / o.registrations) * 1000) / 10 : 0;` | display-only rounding (% or render) |
| src/types/campaign.ts:139 | Math.round | `roi_pct:                 spent > 0 ? Math.round(((o.revenue_attributed - spent) / spent) * 1000) / 10 : 0,` | display-only rounding (% or render) |
| src/components/uth/BankInstrumentPicker.tsx:40 | Math.round | ``₹ ${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/types/gamification.ts:50 | Math.round | `const pct = Math.round(((points - currentBase) / (nextBase - currentBase)) * 100);` | display-only rounding (% or render) |
| src/hooks/useOrders.ts:101 | Math.round | `const fulfilledQty = Math.min(l.qty, Math.round(l.qty * ratio));` | display-only rounding (% or render) |
| src/hooks/useLeadDistribution.ts:223 | Math.round | `? Math.round(capacities.reduce((s, c) => s + c.utilisation_pct, 0) / capacities.length)` | display-only rounding (% or render) |
| src/features/party-master/lib/cross-sell-finder.ts:83 | Math.round | `detail: `No purchase in ${days} days; lifetime ₹${Math.round(kpi.lifetimeRevenue).toLocaleString('en-IN')}`,` | display-only rounding (% or render) |
| src/pages/mobile/telecaller/MobileTelecallerStatsPage.tsx:65 | Math.round | `avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,` | display-only rounding (% or render) |
| src/pages/mobile/customer/MobileCustomerCatalogPage.tsx:49 | Math.round | `const unit = Math.round((item.std_selling_rate ?? 0) * 100);` | display-only rounding (% or render) |
| src/pages/mobile/customer/MobileCustomerCatalogPage.tsx:114 | Math.round | `{fmtINR(Math.round((item.std_selling_rate ?? 0) * 100))}` | display-only rounding (% or render) |
| src/components/company/ProgressStepper.tsx:31 | Math.round | `setDisplayPct(Math.round(start + (end - start) * e));` | display-only rounding (% or render) |
| src/pages/erp/docvault/reports/VersionVelocityReport.tsx:41 | Math.round | `supersessionRate: total === 0 ? 0 : Math.round((superseded / total) * 1000) / 10,` | display-only rounding (% or render) |
| src/pages/erp/docvault/reports/ApprovalLatencyReport.tsx:32 | Math.round | `buckets.push({ dept: d.originating_department_id, type: d.document_type, latencyDays: Math.round(days * 10) / 10, stuck: false, title: d.tit` | display-only rounding (% or render) |
| src/pages/erp/docvault/reports/ApprovalLatencyReport.tsx:35 | Math.round | `buckets.push({ dept: d.originating_department_id, type: d.document_type, latencyDays: Math.round(days * 10) / 10, stuck: days > 14, title: d` | display-only rounding (% or render) |
| src/pages/erp/docvault/reports/ApprovalLatencyReport.tsx:42 | Math.round | `const avg = rows.length === 0 ? 0 : Math.round((rows.reduce((s, r) => s + r.latencyDays, 0) / rows.length) * 10) / 10;` | display-only rounding (% or render) |
| src/pages/mobile/salesman/MobileTimeEntriesPage.tsx:131 | Math.round | `setHourlyRate(String(Math.round(allocation.daily_cost_rate / 8)));` | display-only rounding (% or render) |
| src/components/fincore/GSTComputationPanel.tsx:18 | Math.round | `const roundOff = Math.round(total) - total;` | display-only rounding (% or render) |
| src/components/fincore/GSTComputationPanel.tsx:19 | Math.round | `const net = Math.round(total);` | display-only rounding (% or render) |
| src/components/fincore/GSTComputationPanel.tsx:21 | Math.round | `const fmt = (n: number) => '₹' + Math.round(n * 100 / 100).toLocaleString('en-IN');` | display-only rounding (% or render) |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:81 | Math.round | `{b.accuracy_meters !== null && ` · ±${Math.round(b.accuracy_meters)}m`}` | display-only rounding (% or render) |
| src/pages/erp/distributor/DistributorInvoices.tsx:241 | Math.round | `<DistributorLayout title="My Invoices" subtitle={`${invoices.length} posted • Outstanding: ${formatINR(Math.round(totalDue * 100))}`}>` | display-only rounding (% or render) |
| src/pages/erp/distributor/DistributorInvoices.tsx:328 | Math.round | `{formatINR(Math.round((v.net_amount ?? 0) * 100))}` | display-only rounding (% or render) |
| src/pages/erp/sitex/reports/SiteTwinDashboard.tsx:42 | Math.round | `{ title: 'Safety', icon: AlertTriangle, value: `${Math.round(score.dimensions.safety.score)}/100`, target: '≥80', rag: score.dimensions.safe` | display-only rounding (% or render) |
| src/pages/erp/sitex/reports/SiteTwinDashboard.tsx:43 | Math.round | `{ title: 'Schedule', icon: Activity, value: `${Math.round(score.dimensions.schedule.score)}%`, target: '≥95%', rag: score.dimensions.schedul` | display-only rounding (% or render) |
| src/pages/erp/sitex/reports/SiteTwinDashboard.tsx:45 | Math.round | `{ title: 'Quality', icon: FlaskConical, value: `${Math.round(score.dimensions.quality.score)}%`, target: '≥85%', rag: score.dimensions.quali` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileRevenueTrendPage.tsx:26 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileProjectHealthPage.tsx:33 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileProjectHealthPage.tsx:223 | Math.round | `const progress = total > 0 ? Math.round((completed / total) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobilePipelineHealthPage.tsx:28 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx:50 | Math.round | `return Math.round(pcts.reduce((t, p) => t + p, 0) / pcts.length * 100) / 100;` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx:66 | Math.round | `.map(([id, v]) => ({ id, ...v, avgPct: v.orders > 0 ? Math.round((v.discount / v.orders) / 100) / 100 : 0 }))` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx:145 | Math.round | `<td className="p-2 text-right font-mono">{formatINR(Math.round(r.discount / r.orders))}</td>` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileManagerTeamStatsPage.tsx:31 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/components/requestx/AIAutoSuggestStub.tsx:49 | Math.round | `<span className="font-mono text-muted-foreground">{Math.round(s.confidence * 100)}%</span>` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/EngagementReport.tsx:44 | Math.round | `const nps = total > 0 ? Math.round((happy / total) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileManagerTargetsPage.tsx:37 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/DisputeStatsReport.tsx:46 | Math.round | `: Math.round(resolvedWithDates.reduce((sum, d) =>` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/CreditUtilReport.tsx:32 | Math.round | `const util = lim > 0 ? Math.round((out / lim) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/erp/distributor-hub/reports/CreditUtilReport.tsx:43 | Math.round | `const pct = overall.totalLim > 0 ? Math.round((overall.totalOut / overall.totalLim) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/mobile/manager/MobileCampaignPerformancePage.tsx:27 | Math.round | `const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/features/command-center/modules/SecurityModule.tsx:402 | Math.round | `<span>{r.count} users ({Math.round((r.count / total) * 100)}%)</span>` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCreditRequestPage.tsx:59 | Math.round | `const requestedPaise = Math.round((Number(requestedLakhs) \|\| 0) * 100000 * 100);` | display-only rounding (% or render) |
| src/components/maintainpro/MaintenancePulseWidget.tsx:19 | Math.round | `const pct = tot === 0 ? 100 : Math.round(((tot - down.length) / tot) * 100);` | display-only rounding (% or render) |
| src/pages/bridge/ReconciliationWorkbench.tsx:251 | Math.round | `<span className={cn("text-xs", s.cls)}>({Math.round((s.count / selectedReq.totalRecords) * 100)}%)</span>` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCatalogPage.tsx:52 | Math.round | `const ratePaise = Math.round((item.std_selling_rate ?? 0) * 100);` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCatalogPage.tsx:113 | Math.round | `{fmtINR(Math.round((item.std_selling_rate ?? 0) * 100))}` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCartPage.tsx:70 | Math.round | `taxable_paise: Math.round(l.taxable_paise * ratio),` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCartPage.tsx:71 | Math.round | `cgst_paise: Math.round(l.cgst_paise * ratio),` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCartPage.tsx:72 | Math.round | `sgst_paise: Math.round(l.sgst_paise * ratio),` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCartPage.tsx:73 | Math.round | `igst_paise: Math.round(l.igst_paise * ratio),` | display-only rounding (% or render) |
| src/pages/mobile/distributor/MobileDistributorCartPage.tsx:74 | Math.round | `total_paise: Math.round(l.total_paise * ratio),` | display-only rounding (% or render) |
| src/pages/bridge/CompanyRegistry.tsx:187 | Math.round | `const avgHealth = Math.round(COMPANIES.reduce((s, c) => s + c.healthScore, 0) / COMPANIES.length);` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/SLAPerformance.tsx:49 | Math.round | `response_pct: total > 0 ? Math.round((response_met / total) * 100) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/SLAPerformance.tsx:50 | Math.round | `resolution_pct: total > 0 ? Math.round((resolution_met / total) * 100) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/SLAPerformance.tsx:67 | Math.round | `response_pct: total > 0 ? Math.round((r_met / total) * 100) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/SLAPerformance.tsx:68 | Math.round | `resolution_pct: total > 0 ? Math.round((re_met / total) * 100) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx:68 | Math.round | `trust_score: b.ticket_count ? Math.round(b.trust_score / b.ticket_count) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx:69 | Math.round | `route_changed_pct: b.ticket_count ? Math.round(b.route_changed_pct / b.ticket_count) : 0,` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/CSATHappyCode.tsx:23 | Math.round | `return Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10;` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/reports/CSATHappyCode.tsx:31 | Math.round | `const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);` | display-only rounding (% or render) |
| src/lib/vendor-scoring-engine.ts:78 | Math.round | `weighted_score: Math.round((raw[name] * DEFAULT_WEIGHTS[name]) / 100 * 100) / 100,` | display-only rounding (% or render) |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:235 | Math.round | `monthly_subscription_paise: Math.round(benchAmount * 100),` | display-only rounding (% or render) |
| src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx:152 | Math.round | `variance_pct: b.std === 0 ? 0 : Math.round(((b.act - b.std) / b.std) * 1000) / 10,` | display-only rounding (% or render) |
| src/lib/distributor-rating-engine.ts:24 | Math.round | `const base = t2d.length === 0 ? 650 : Math.round(400 + (t2dScore / 5) * 500);` | display-only rounding (% or render) |
| src/lib/distributor-rating-engine.ts:32 | Math.round | `tenant_to_distributor_avg: Math.round(t2dScore * 10) / 10,` | display-only rounding (% or render) |
| src/lib/distributor-rating-engine.ts:33 | Math.round | `distributor_to_tenant_avg: Math.round(d2tScore * 10) / 10,` | display-only rounding (% or render) |
| src/lib/distributor-order-engine.ts:54 | Math.round | `const discount = Math.round(gross * (discountPercent / 100));` | display-only rounding (% or render) |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:86 | Math.round | `avg_variance_pct: Math.round(avg * 100) / 100,` | display-only rounding (% or render) |
| src/pages/erp/dispatch/reports/PackerPerformanceReport.tsx:87 | Math.round | `total_excess_paise: Math.round(v.excess),` | display-only rounding (% or render) |
| src/pages/erp/customer-hub/transactions/VoiceComplaintCapture.tsx:188 | Math.round | `refLabel: `${cat.category} (${Math.round(cat.confidence * 100)}%)`,` | display-only rounding (% or render) |
| src/pages/erp/customer-hub/transactions/VoiceComplaintCapture.tsx:280 | Math.round | `{Math.round(detected.confidence * 100)}% confidence` | display-only rounding (% or render) |
| src/pages/erp/customer-hub/transactions/CustomerRewards.tsx:125 | Math.round | `const tierProgress = Math.min(100, Math.round((lifetime / nextThreshold) * 100));` | display-only rounding (% or render) |
| src/pages/erp/customer-hub/transactions/CustomerCart.tsx:148 | Math.round | `const progressPct = Math.min(100, Math.round((projected / nextThreshold) * 100));` | display-only rounding (% or render) |
| src/lib/field-force-engine.ts:108 | Math.round | `completion_pct: planned > 0 ? Math.round((actual / planned) * 100) : 0,` | display-only rounding (% or render) |
| src/lib/location-tracker-engine.ts:73 | Math.round | `return { pct: Math.round(b.level * 100), charging: b.charging };` | display-only rounding (% or render) |
| src/pages/erp/servicedesk/customer-hub/CustomerSLAEnquiry.tsx:24 | Math.round | `const fasterPct = benefits ? Math.round((1 - benefits.sla_multiplier) * 100) : 0;` | display-only rounding (% or render) |
| src/lib/packing-bom-engine.ts:154 | Math.round | `variance_pct: Math.round(variance_pct * 100) / 100,` | display-only rounding (% or render) |
| src/pages/erp/projx/reports/ResourceUtilizationReport.tsx:55 | Math.round | `r.person_code, r.person_name, r.totalPct, Math.round(r.totalCost),` | display-only rounding (% or render) |
| src/pages/erp/projx/reports/ProjectPnLReport.tsx:158 | Math.round | `<td className="p-2 text-right font-mono">{totals.billed > 0 ? Math.round((totals.margin / totals.billed) * 100) : 0}%</td>` | display-only rounding (% or render) |
| src/lib/servicedesk-engine.ts:424 | Math.round | `expiry_proximity: Math.round(expiryScore),` | display-only rounding (% or render) |
| src/lib/servicedesk-engine.ts:1369 | Math.round | `const margin_pct = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;` | display-only rounding (% or render) |
| src/lib/rfq-engine.ts:359 | Math.round | `pct_elapsed: Math.round(pctElapsed * 10) / 10,` | display-only rounding (% or render) |
| src/lib/requestx-report-engine.ts:143 | Math.round | `return Math.max(0, Math.min(100, Math.round(score)));` | display-only rounding (% or render) |
| src/lib/requestx-report-engine.ts:165 | Math.round | `const final_pct = required > 0 ? Math.round((qc_accepted / required) * 100) : 0;` | display-only rounding (% or render) |
| src/lib/scheme-impact-engine.ts:85 | Math.round | `Math.round(eligibleRows.reduce((t, r) => t + r.projected_impact_pct, 0) / eligibleRows.length * 100) / 100,` | display-only rounding (% or render) |
| src/pages/erp/accounting/LedgerMaster.tsx:4959 | Math.round | `Total Interest: ₹{Math.round(borrowingTotalInterest).toLocaleString('en-IN')}` | display-only rounding (% or render) |
| src/pages/erp/accounting/LedgerMaster.tsx:4962 | Math.round | `Total Payment: ₹{Math.round(borrowingTotalPayment).toLocaleString('en-IN')}` | display-only rounding (% or render) |
| src/pages/erp/foundation/geography/GeographyHub.tsx:94 | Math.round | `setProgress(Math.round((i / stepList.length) * 100));` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/reports/VendorReliabilityPanel.tsx:21 | Math.round | `return Math.round((sorted[Math.min(idx, sorted.length - 1)] ?? 0) * 100) / 100;` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/reports/VendorReliabilityPanel.tsx:34 | Math.round | `: Math.round((vendors.reduce((s, v) => s + v.total_score, 0) / total) * 100) / 100;` | display-only rounding (% or render) |
| src/pages/erp/maintainpro/reports/PMComplianceReport.tsx:18 | Math.round | `const pct = total === 0 ? 0 : Math.round((onTime / total) * 100);` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/reports/PreClosePendingPanel.tsx:33 | Math.round | `: Math.round((recs.reduce((s, r) => s + r.pct_elapsed, 0) / total) * 10) / 10;` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/PerformanceAndTalent.tsx:363 | Math.round | `<Star key={i} className={`h-3 w-3 ${i < Math.round(score) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/PerformanceAndTalent.tsx:383 | Math.round | `const compPctLive = compForm.oldCTC > 0 ? Math.round(((compForm.newCTC - compForm.oldCTC) / compForm.oldCTC) * 1000) / 10 : 0;` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/reports/PeqFollowupPanel.tsx:61 | Math.round | `: Math.round(items.reduce((s, e) => s + ageDays(e.created_at), 0) / items.length),` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/panels.tsx:1081 | Math.round | `variance_pct: Math.round(variance * 100) / 100,` | display-only rounding (% or render) |
| src/pages/erp/salesx/reports/FollowUpRegisterReport.tsx:77 | Math.round | `? Math.round(rows.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.daysOverdue, 0) / overdue)` | display-only rounding (% or render) |
| src/pages/erp/fincore/reports/AuditDashboard.tsx:95 | Math.round | `const scorePct = audit.max > 0 ? Math.round((audit.total / audit.max) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/DocumentManagement.tsx:701 | Math.round | `style={{ width: `${Math.round((docForm.fileSizeBytes / MAX_FILE_BYTES) * 100)}%` }}` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/Onboarding.tsx:264 | Math.round | `? Math.round(journeys.reduce((s, j) => s + getProgress(j), 0) / journeys.length)` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/Onboarding.tsx:440 | Math.round | `const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/erp/procure-hub/reports/PeqFollowupRegisterPanel.tsx:41 | Math.round | `: Math.round(items.reduce((s, e) => s + ageDays(e.created_at), 0) / items.length),` | display-only rounding (% or render) |
| src/pages/erp/salesx/reports/CampaignPerformanceReport.tsx:96 | Math.round | `const avgRoi = roiN ? Math.round((roiSum / roiN) * 10) / 10 : 0;` | display-only rounding (% or render) |
| src/pages/erp/salesx/reports/CampaignPerformanceReport.tsx:109 | Math.round | `type, roi: Math.round((v.sum / v.n) * 10) / 10,` | display-only rounding (% or render) |
| src/pages/erp/salesx/reports/CallLogHistoryReport.tsx:116 | Math.round | `avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:355 | Math.round | `avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),` | display-only rounding (% or render) |
| src/pages/erp/fincore/registers/CancellationAuditRegister.tsx:21 | Math.round | ``₹ ${Math.round(n).toLocaleString('en-IN')}`;` | display-only rounding (% or render) |
| src/pages/erp/requestx/transactions/MaterialIndentEntry.tsx:76 | Math.round | `const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;` | display-only rounding (% or render) |
| src/pages/erp/requestx/reports/DepartmentWiseSummary.tsx:64 | Math.round | `{total > 0 ? Math.round((g.total_value / total) * 100) : 0}%` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/CreditRiskReport.tsx:85 | Math.round | `const avgPeriod = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/CreditRiskReport.tsx:96 | Math.round | `utilisation: Math.round(utilisation * 100),` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:842 | Math.round | `<TableCell className="text-right text-xs">{toIndianFormat(Math.round(gratuity / 12))}</TableCell>` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:868 | Math.round | `<p className="text-lg font-bold">{trEmployee.annualCTC > 0 ? Math.round((trPayslip.grossEarnings * 12 / trEmployee.annualCTC) * 100) : 0}%</` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:872 | Math.round | `<p className="text-lg font-bold">{trEmployee.annualCTC > 0 ? Math.round(((trPayslip.totalEmployerCost - trPayslip.grossEarnings) * 12 / trEm` | display-only rounding (% or render) |
| src/pages/erp/inventory/ItemCraft.tsx:145 | Math.round | `const pct = Math.round((filled / TABS.length) * 100);` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/CollectionEfficiency.tsx:81 | Math.round | `const avgPeriod = g.tasks.length > 0 ? Math.round(g.tasks.reduce((s, t) => s + t.age_days, 0) / g.tasks.length) : 0;` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/CollectionEfficiency.tsx:84 | Math.round | `const over60 = allTotal > 0 ? Math.round((over60Total / allTotal) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/CollectionEfficiency.tsx:88 | Math.round | `const trend = lmInvoiced > 0 ? Math.round(((collected - lmInvoiced) / lmInvoiced) * 100) : 0;` | display-only rounding (% or render) |
| src/pages/erp/inventory/InventoryHubWelcome.tsx:259 | Math.round | `<CardTitle className={`text-2xl font-mono ${storageUsage.tier === 'green' ? 'text-emerald-600' : storageUsage.tier === 'amber' ? 'text-amber` | display-only rounding (% or render) |
| src/pages/erp/receivx/reports/AgingByPerson.tsx:99 | Math.round | `const avgAge = allTasks.length > 0 ? Math.round(allTasks.reduce((s, t) => s + t.age_days, 0) / allTasks.length) : 0;` | display-only rounding (% or render) |
| src/pages/erp/inventory/reports/BinUtilizationReport.tsx:82 | Math.round | `const avg = total ? Math.round(m.reduce((s, r) => s + r.utilization, 0) / total) : 0;` | display-only rounding (% or render) |
| src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx:66 | Math.round | `You found "${sMeta.drawing_no ?? similar.id}" (${similar.title}) is ${Math.round(score * 100)}% similar.` | display-only rounding (% or render) |
| src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx:126 | Math.round | `<Badge variant="secondary">{Math.round(score * 100)}%</Badge>` | display-only rounding (% or render) |
| src/pages/erp/inventory/OpeningStockEntry.tsx:386 | Math.round | `<CardTitle className="text-xl">₹{Math.round(totalValue).toLocaleString('en-IN')}</CardTitle></CardHeader></Card>` | display-only rounding (% or render) |
| src/pages/erp/inventory/OpeningStockEntry.tsx:708 | Math.round | `Pending Value: ₹{Math.round(totalValue).toLocaleString('en-IN')}` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1239 | Math.round | `{activeEmployee.annualCTC > 0 && ` (${Math.round(((form.annualCTC - activeEmployee.annualCTC) / activeEmployee.annualCTC) * 100)}%)`}` | display-only rounding (% or render) |
| src/pages/erp/qualicheck/reports/EffectivenessVerificationDuePanel.tsx:47 | Math.round | `return Math.round(ms / (24 * 60 * 60 * 1000));` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:321 | Math.round | `? Math.round(completedReviews.reduce((s, r) => s + r.performanceScore, 0) / completedReviews.length * 10) / 10` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:518 | Math.round | `<div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((d.count / headcount.activeCount) * 100)}%` }} />` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:572 | Math.round | `<div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round((d.cost / (payrollCost.latestErCost \|\| 1)) * 100)}%` }} />` | display-only rounding (% or render) |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:642 | Math.round | `<div className={cn('h-full rounded-full', s.color)} style={{ width: hiring.pipeline > 0 ? `${Math.round((s.count/hiring.pipeline)*100)}%` : ` | display-only rounding (% or render) |

## Class C (287)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/pages/tower/Billing.tsx:80 | toFixed | `if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)} Cr`;` | non-money toFixed |
| src/pages/tower/Billing.tsx:81 | toFixed | `if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)} L`;` | non-money toFixed |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:77 | toFixed | `\| StockTransferRegister.tsx:33 \| `totalQty(...).toFixed(2)` \| Q \| qty in register column \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:78 | toFixed | `\| StockTransferRegister.tsx:50 \| `qty.toFixed(2)` \| Q \| qty footer \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:79 | toFixed | `\| StockJournalRegister.tsx:40 \| `netQty(...).toFixed(2)` \| Q \| qty \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:80 | toFixed | `\| DeliveryNoteRegister.tsx:40 \| `totalQty(...).toFixed(2)` \| Q \| qty \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:81 | toFixed | `\| DeliveryNoteRegister.tsx:60 \| `qty.toFixed(2)` \| Q \| qty footer \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:82 | toFixed | `\| StockAdjustmentRegister.tsx:40 \| `netQtyAdjust(...).toFixed(2)` \| Q \| qty \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:83 | toFixed | `\| StockAdjustmentRegister.tsx:59 \| `totalNet.toFixed(2)` \| Q \| qty footer \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:84 | toFixed | `\| ReceiptNoteRegister.tsx:40 \| `totalQty(...).toFixed(2)` \| Q \| qty \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:85 | toFixed | `\| ReceiptNoteRegister.tsx:60 \| `qty.toFixed(2)` \| Q \| qty footer \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:86 | toFixed | `\| ApprovalsPendingPage.tsx:153 \| `kpis.avgWait.toFixed(1)` \| Q \| hours/days KPI \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:89 | toFixed | `\| Form3CD.tsx:163 \| `((gp/turnover)*100).toFixed(1)` (gpPct) \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:90 | toFixed | `\| Form3CD.tsx:164 \| `((np/turnover)*100).toFixed(1)` (npPct) \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:118 | toFixed | `\| AttendanceEntry.tsx:518 \| `wh.toFixed(2)` \| Q \| work-hours display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:121 | toFixed | `\| DocumentManagement.tsx:41 \| `(bytes/1024).toFixed(1)` KB \| D \| file size \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:122 | toFixed | `\| DocumentManagement.tsx:42 \| `(bytes/1_048_576).toFixed(1)` MB \| D \| file size \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:136 | toFixed | `\| PayGradeMaster.tsx:190 \| `(g.minCTC/100000).toFixed(1)L` \| D \| grade range chip \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:153 | toFixed | `\| SalaryStructureMaster.tsx:242 \| `(ss.minCTC/100000).toFixed(1)L` \| D \| range chip \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:164 | toFixed | `\| CashFlowDashboard.tsx:161 \| `(v/100000).toFixed(0)L` axis \| D \| chart axis label \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:165 | toFixed | `\| CashFlowDashboard.tsx:187 \| `(v/100000).toFixed(0)L` axis \| D \| chart axis label \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:175 | toFixed | `\| panels.tsx:357 \| `variance_pct.toFixed(2)%` \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:176 | toFixed | `\| panels.tsx:478 \| `variance_pct.toFixed(2)%` \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:177 | toFixed | `\| panels.tsx:629 \| `variance_pct.toFixed(2)%` \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:178 | toFixed | `\| panels.tsx:659 \| `variance_pct.toFixed(2)%` \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:179 | toFixed | `\| panels.tsx:696 \| `variance_pct.toFixed(2)%` \| Q \| percent display \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:180 | toFixed | `\| panels.tsx:833 \| `variance_pct.toFixed(2)%` (truncated) \| Q \| percent display \|` | test fixture |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:234 | toFixed | `{qtyDelta > 0 ? `${qtyDelta.toFixed(3)} more to allocate` : `${Math.abs(qtyDelta).toFixed(3)} over-allocated`}` | non-money toFixed |
| src/test/dev-only/SmokeTestRunner.tsx:759 | toFixed | `return { actual: `sum6=${sum6.toFixed(2)}`, expected: '77000..79000',` | test fixture |
| src/pages/erp/pay-hub/transactions/AttendanceEntry.tsx:518 | toFixed | `{wh > 0 ? wh.toFixed(2) : '—'}` | non-money toFixed |
| src/components/mobile/MobileSparesIssueCapture.tsx:148 | toFixed | `{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}` | non-money toFixed |
| src/components/mobile/MobileBreakdownCapture.tsx:136 | toFixed | `{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}` | non-money toFixed |
| src/components/mobile/MobilePMTickoffCapture.tsx:132 | toFixed | `{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}` | non-money toFixed |
| src/components/mobile/MobileAssetPhotoCapture.tsx:106 | toFixed | `{gps.lat.toFixed(4)}, {gps.lon.toFixed(4)}` | non-money toFixed |
| src/lib/bill-passing-engine.ts:136 | toFixed | `reason = `Qty variance ${qty_variance.toFixed(2)} (${qtyPct.toFixed(2)}%)`;` | non-money toFixed |
| src/lib/freight-calc-engine.ts:151 | toFixed | ``Chargeable weight: ${chargeable.toFixed(2)}kg (actual ${actual}, vol ${volumetric}, min ${minChargeable})`,` | non-money toFixed |
| src/lib/keyboard.ts:61 | toFixed | `const [int, dec] = Math.abs(n).toFixed(2).split('.');` | non-money toFixed |
| src/lib/fincore-engine.ts:142 | toFixed | ``Line "${line.item_name}": allocation qty ${sum.toFixed(3)} ≠ line qty ${lineQty.toFixed(3)}`,` | non-money toFixed |
| src/lib/storage-quota-engine.ts:160 | toFixed | `return `${(bytes / 1024 / 1024).toFixed(2)} MB`;` | non-money toFixed |
| src/pages/erp/distributor/DistributorVisitCapture.tsx:206 | toFixed | `{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}` | non-money toFixed |
| src/pages/customer/Statement.tsx:28 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | non-money toFixed |
| src/pages/customer/Statement.tsx:34 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | non-money toFixed |
| src/pages/customer/Profile.tsx:32 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | non-money toFixed |
| src/pages/erp/accounting/CurrencyMaster.tsx:112 | toFixed | `const basePerForeign = parseFloat((1 / foreignPerBase).toFixed(4));` | non-money toFixed |
| src/pages/customer/Orders.tsx:40 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | non-money toFixed |
| src/pages/customer/CustomerDashboard.tsx:53 | toFixed | `if (r >= 100000) return `₹${(r / 100000).toFixed(2)}L`;` | non-money toFixed |
| src/pages/erp/production/transactions/ProductionOrderEntry.tsx:716 | toFixed | `{effQty.toFixed(2)} {c.uom}` | non-money toFixed |
| src/pages/erp/production/transactions/MaterialIssueEntry.tsx:242 | toFixed | `{l.required_qty.toFixed(2)} / {l.issued_qty.toFixed(2)} {l.uom}` | non-money toFixed |
| src/pages/erp/production/transactions/JobWorkReceiptEntry.tsx:247 | toFixed | `{l.expected_output_qty.toFixed(2)} / {l.received_qty.toFixed(2)}` | non-money toFixed |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:87 | parseFloat | `\| BankReconciliation.tsx:78 \| `parseFloat(parts[2])` (debit) \| **M** \| bank-statement CSV → reconciliation match — MUST be paise-int \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:88 | parseFloat | `\| BankReconciliation.tsx:79 \| `parseFloat(parts[3])` (credit) \| **M** \| same as above \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:91 | parseFloat | `\| Form3CD.tsx:198 \| `parseFloat(raw)` (clause read) \| **M** \| reads stored audit-report money; rounds at parse — Form 3CD MCA filing \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:92 | parseFloat | `\| Form3CD.tsx:341 \| `setClause14(parseFloat(...) \|\| 0)` \| **M?** \| Clause 14 amount — depreciation/disallowance entered then filed \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:93 | parseFloat | `\| GSTR9.tsx:66 \| `parseFloat(val)` GSTR9 cell \| **M?** \| GSTR-9 numeric cell — MUST be exact for return filing \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:94 | parseFloat | `\| ITCRegister.tsx:202 \| `setReversalAmount(parseFloat(...))` \| **M?** \| ITC reversal amount — flows to ledger \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:95 | parseFloat | `\| TDSAdvance.tsx:91 \| `amount: parseFloat(challanForm.amount)` \| **M** \| TDS challan amount → posted to ledger \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:100 | parseFloat | `\| StatutoryReturns.tsx:994 \| `parseFloat(...)` totalAmount \| **M?** \| statutory return total \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:101 | parseFloat | `\| PayslipGeneration.tsx:349 \| `declaredAmount: parseFloat(proofAmount)` \| **M?** \| tax-saving proof — flows to TDS calc \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:162 | parseFloat | `\| VendorPaymentEntry.tsx:410 \| `r = parseFloat(...)` rate \| **M** \| payment-entry rate flows to ledger \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:172 | parseFloat | `\| panels.tsx:192 \| `qty = parseFloat(li.qty)` \| **M** \| 3-way match qty (joins to rate × tax) \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:173 | parseFloat | `\| panels.tsx:193 \| `rate = parseFloat(li.rate)` \| **M** \| 3-way match rate (money) \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:174 | parseFloat | `\| panels.tsx:194 \| `tax = parseFloat(li.tax)` \| **M** \| 3-way match tax (money) \|` | test fixture |
| src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:187 | parseFloat | `- **M? (needs founder ruling — input handlers writing to money fields whose downstream consumers were not audited line-by-line in this surgi` | test fixture |
| src/components/mobile/MobileSiteMaterialIssueCapture.tsx:114 | parseFloat | `<Input type="number" value={quantity \|\| ''} onChange={(e) => setQuantity(parseFloat(e.target.value) \|\| 0)} />` | parseFloat on non-money input |
| src/lib/bulk-paste-engine.ts:137 | parseFloat | `const n = parseFloat(val.replace(/,/g, ''));` | parseFloat on non-money input |
| src/lib/keyboard.ts:76 | parseFloat | `parseFloat(s.replace(/,/g, '')) \|\| 0;` | parseFloat on non-money input |
| src/lib/form-keyboard-engine.ts:139 | parseFloat | `return parseFloat(numMatch[0]);` | parseFloat on non-money input |
| src/components/fincore/dialogs/ItemParametersDialog.tsx:41 | parseFloat | `const n = parseFloat(v);` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/MaterialIssueNote.tsx:834 | parseFloat | `onChange={e => setDraftLine(d => ({ ...d, qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:206 | parseFloat | `const n = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/GRNEntry.tsx:1144 | parseFloat | `onChange={e => setDraftLine(l => ({ ...l, ordered_qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/GRNEntry.tsx:1149 | parseFloat | `const q = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/GRNEntry.tsx:1155 | parseFloat | `onChange={e => setDraftLine(l => ({ ...l, accepted_qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/CycleCountEntry.tsx:563 | parseFloat | `onChange={(e) => setLineQty(l.id, parseFloat(e.target.value) \|\| 0)} />` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/ConsumptionEntry.tsx:735 | parseFloat | `onChange={e => setHeader(h => ({ ...h, output_qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/ConsumptionEntry.tsx:887 | parseFloat | `onChange={e => setDraftLine(d => ({ ...d, standard_qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/transactions/ConsumptionEntry.tsx:892 | parseFloat | `onChange={e => setDraftLine(d => ({ ...d, actual_qty: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/components/fincore/StockTransferLineGrid.tsx:131 | parseFloat | `onChange={e => onUpdate({ qty: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/components/fincore/StockAdjustmentLineGrid.tsx:158 | parseFloat | `onChange={e => onUpdate({ qty: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/inventory/HeatMaster.tsx:95 | parseFloat | `const n = parseFloat(s);` | parseFloat on non-money input |
| src/pages/erp/inventory/BOMMaster.tsx:625 | parseFloat | `onChange={e => setForm(p => ({ ...p, output_qty: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on non-money input |
| src/pages/erp/inventory/BOMMaster.tsx:741 | parseFloat | `onChange={e => updateComponent(idx, { qty: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/inventory/BOMMaster.tsx:753 | parseFloat | `onChange={e => updateComponent(idx, { wastage_percent: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/inventory/BOMMaster.tsx:866 | parseFloat | `onChange={e => updateByproduct(idx, { qty_per_batch: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/masters/CustomerMaster.tsx:996 | parseFloat | `onChange={e => setForm(f => ({ ...f, warningLimit: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on non-money input |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:842 | parseFloat | `<TableCell><Input type="number" value={it.qty} onChange={e => updateLine(i, { qty: parseFloat(e.target.value) \|\| 0 })} onKeyDown={onEnterN` | parseFloat on non-money input |
| src/pages/erp/salesx/transactions/QuotationEntry.tsx:865 | parseFloat | `<TableCell><Input type="number" value={it.discount_pct} onChange={e => updateLine(i, { discount_pct: parseFloat(e.target.value) \|\| 0 })} o` | parseFloat on non-money input |
| src/pages/erp/inventory/StorageMatrix.tsx:251 | parseFloat | `<div className='space-y-1.5'><Label>Security Deposit (₹)</Label><Input type='number' value={af.security_deposit\|\|''} onChange={e=>setAf(f=` | parseFloat on non-money input |
| src/pages/erp/inventory/StockMatrix.tsx:253 | parseFloat | `<div className='space-y-1.5'><Label>Reorder Level</Label><Input type='number' value={form.reorder_level\|\|''} onChange={e=>setForm(f=>({...` | parseFloat on non-money input |
| src/pages/erp/inventory/StockMatrix.tsx:274 | parseFloat | `const v=parseFloat(e.target.value)\|\|null;` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:378 | parseFloat | `const min = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:388 | parseFloat | `onChange={e => setForm(f => ({ ...f, max_stock: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:393 | parseFloat | `onChange={e => setForm(f => ({ ...f, reorder_level: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:400 | parseFloat | `onChange={e => setForm(f => ({ ...f, lead_time_days: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:407 | parseFloat | `onChange={e => setForm(f => ({ ...f, safety_stock: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderMatrix.tsx:414 | parseFloat | `onChange={e => setForm(f => ({ ...f, eoq: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:236 | parseFloat | `const min = parseFloat(row.min_stock) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:237 | parseFloat | `if (min === 0 && !parseFloat(row.safety_stock as string) && !parseFloat(row.max_stock as string)) return; // skip empty` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:251 | parseFloat | `safety_stock: parseFloat(row.safety_stock) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:253 | parseFloat | `max_stock: parseFloat(row.max_stock) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:254 | parseFloat | `reorder_qty: parseFloat(row.reorder_qty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:272 | parseFloat | `safety_stock: parseFloat(row.safety_stock) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:274 | parseFloat | `max_stock: parseFloat(row.max_stock) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:275 | parseFloat | `reorder_qty: parseFloat(row.reorder_qty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/inventory/ReorderAlerts.tsx:922 | parseFloat | `onChange={e => setRuleForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/salesx/transactions/EnquiryCapture.tsx:786 | parseFloat | `onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/salesx/transactions/CRMPipeline.tsx:309 | parseFloat | `onChange={e => update({ deal_value: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/salesx/transactions/CRMPipeline.tsx:318 | parseFloat | `onChange={e => update({ probability: Math.max(0, Math.min(100, parseFloat(e.target.value) \|\| 0)) })}` | parseFloat on non-money input |
| src/pages/erp/inventory/Parametric.tsx:633 | parseFloat | `onChange={e => updateParam(idx, 'validation_min', parseFloat(e.target.value))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/Parametric.tsx:639 | parseFloat | `onChange={e => updateParam(idx, 'validation_max', parseFloat(e.target.value))} />` | parseFloat on non-money input |
| src/pages/erp/fincore/reports/Form3CD.tsx:198 | parseFloat | `return raw ? parseFloat(raw) : 0;` | parseFloat on non-money input |
| src/pages/erp/fincore/reports/Form3CD.tsx:341 | parseFloat | `onChange={e => setClause14(parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:352 | parseFloat | `const v = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx:292 | parseFloat | `x.key === r.key ? { ...x, actual_qty: parseFloat(e.target.value \|\| '0') } : x))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/LabelTemplates.tsx:251 | parseFloat | `onChange={e => setForm(f => ({ ...f, custom_width_mm: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/LabelTemplates.tsx:256 | parseFloat | `onChange={e => setForm(f => ({ ...f, custom_height_mm: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemTemplates.tsx:363 | parseFloat | `const r = parseFloat(v);` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemTemplates.tsx:396 | parseFloat | `onChange={e => setForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:807 | parseFloat | `onChange={e => setForm(f => ({ ...f, secondary_conversion_factor: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:830 | parseFloat | `onChange={e => setForm(f => ({ ...f, tertiary_conversion_factor: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:854 | parseFloat | `onChange={e => setForm(f => ({ ...f, [d]: parseFloat(e.target.value) \|\| null }))} /></div>` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:904 | parseFloat | `onChange={e => setPackings(a => a.map((x, j) => j === i ? { ...x, units_per_pack: parseFloat(e.target.value) \|\| null } : x))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:910 | parseFloat | `onChange={e => setPackings(a => a.map((x, j) => j === i ? { ...x, [d]: parseFloat(e.target.value) \|\| null } : x))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:960 | parseFloat | `const r = parseFloat(v);` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1019 | parseFloat | `onChange={e => setForm(f => ({ ...f, mrp: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1081 | parseFloat | `<Input type="number" min="0" value={getStr(form, f)} onChange={e => setForm(ff => ({ ...ff, [f]: parseFloat(e.target.value) \|\| null }))} /` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1146 | parseFloat | `onChange={e => { const q = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1151 | parseFloat | `onChange={e => { const r = parseFloat(e.target.value) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1330 | parseFloat | `onChange={e => setVendors(a => a.map((x, j) => j === i ? { ...x, [f]: t === 'number' ? parseFloat(e.target.value) \|\| null : e.target.value` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1475 | parseFloat | `onChange={e => setForm(f => ({ ...f, carbon_footprint: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/inventory/ItemCraft.tsx:1480 | parseFloat | `onChange={e => setForm(f => ({ ...f, recyclability_percent: parseFloat(e.target.value) \|\| null }))} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:308 | parseFloat | `onChange={e => setEditing({ ...editing, current_stock: parseFloat(e.target.value \|\| '0') })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:313 | parseFloat | `onChange={e => setEditing({ ...editing, reorder_level: parseFloat(e.target.value \|\| '0') })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:318 | parseFloat | `onChange={e => setEditing({ ...editing, reorder_qty: parseFloat(e.target.value \|\| '0') })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:323 | parseFloat | `onChange={e => setEditing({ ...editing, length_cm: e.target.value ? parseFloat(e.target.value) : null })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:328 | parseFloat | `onChange={e => setEditing({ ...editing, width_cm: e.target.value ? parseFloat(e.target.value) : null })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx:333 | parseFloat | `onChange={e => setEditing({ ...editing, height_cm: e.target.value ? parseFloat(e.target.value) : null })} />` | parseFloat on non-money input |
| src/pages/erp/dispatch/masters/PackingBOMMaster.tsx:379 | parseFloat | `onChange={e => updateLine(l.id, { qty_per_unit: parseFloat(e.target.value \|\| '0') })} />` | parseFloat on non-money input |
| src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx:412 | parseFloat | `<Input type="number" value={idSalvage \|\| ''} onChange={e => setIdSalvage(parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4361 | parseFloat | `const val = parseFloat(e.target.value.replace(/,/g, '')) \|\| 0;` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4798 | parseFloat | `onChange={(e) => setCapitalForm(f => ({ ...f, authorisedCapital: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} /></div>` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4801 | parseFloat | `onChange={(e) => setCapitalForm(f => ({ ...f, issuedCapital: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} /></div>` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4804 | parseFloat | `onChange={(e) => setCapitalForm(f => ({ ...f, paidUpCapital: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} /></div>` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4807 | parseFloat | `onChange={(e) => setCapitalForm(f => ({ ...f, faceValuePerShare: parseFloat(e.target.value.replace(/,/g, '')) \|\| 10 }))} /></div>` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:4819 | parseFloat | `onChange={(e) => setCapitalForm(f => ({ ...f, profitSharingRatio: parseFloat(e.target.value) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:5545 | parseFloat | `<Input type="number" step="0.01" value={assetForm.salvage_value_percent} onChange={e => setAssetForm(f => ({ ...f, salvage_value_percent: pa` | parseFloat on non-money input |
| src/pages/erp/accounting/LedgerMaster.tsx:5767 | parseFloat | `onChange={(e) => setSignatoryForm(f => ({ ...f, signingLimit: parseFloat(e.target.value.replace(/,/g, '')) \|\| 0 }))} />` | parseFloat on non-money input |
| src/pages/erp/accounting/CurrencyMaster.tsx:112 | parseFloat | `const basePerForeign = parseFloat((1 / foreignPerBase).toFixed(4));` | parseFloat on non-money input |
| src/pages/erp/bill-passing/panels.tsx:192 | parseFloat | `const qty = parseFloat(li.qty);` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:654 | parseFloat | `onChange={e => duf(key, parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:119 | parseFloat | `if (!plannedQty \|\| parseFloat(plannedQty) <= 0) {` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:137 | parseFloat | `planned_qty: parseFloat(plannedQty),` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:167 | parseFloat | `produced_qty: parseFloat(producedQty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:168 | parseFloat | `rejected_qty: parseFloat(rejectedQty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:169 | parseFloat | `rework_qty: parseFloat(reworkQty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/production/transactions/JobCardEntry.tsx:170 | parseFloat | `wastage_qty: parseFloat(wastageQty) \|\| 0,` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/AttendanceEntry.tsx:895 | parseFloat | `onChange={e => setGfForm(p => ({ ...p, latitude: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/AttendanceEntry.tsx:902 | parseFloat | `onChange={e => setGfForm(p => ({ ...p, longitude: parseFloat(e.target.value) \|\| 0 }))}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:1009 | parseFloat | `onChange={e => auf('productiveHours', parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:1014 | parseFloat | `onChange={e => auf('neutralHours', parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/AdminAndMonitoring.tsx:1019 | parseFloat | `onChange={e => auf('unproductiveHours', parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1204 | parseFloat | `onChange={e => uf('vpfPercentage', parseFloat(e.target.value) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1227 | parseFloat | `onChange={e => uf('annualCTC', parseFloat(e.target.value.replace(/,/g, '')) \|\| 0)} onKeyDown={onEnterNext} />` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1311 | parseFloat | `<TableCell><Input type="number" value={fm.pfNomineePct} onChange={e => updateFM(fm.id, { pfNomineePct: parseFloat(e.target.value) \|\| 0 })}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1312 | parseFloat | `<TableCell><Input type="number" value={fm.gratuityNomineePct} onChange={e => updateFM(fm.id, { gratuityNomineePct: parseFloat(e.target.value` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1432 | parseFloat | `<div><Label className="text-[10px]">Premium (₹)</Label><Input type="number" value={lp.premiumAnnual \|\| ''} onChange={e => updateLIC(lp.id,` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1433 | parseFloat | `<div><Label className="text-[10px]">Sum Assured (₹)</Label><Input type="number" value={lp.sumAssured \|\| ''} onChange={e => updateLIC(lp.id` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1448 | parseFloat | `<Input type="number" value={form.medicalRembCap \|\| ''} onChange={e => uf('medicalRembCap', parseFloat(e.target.value) \|\| 0)} onKeyDown={` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayHeadMaster.tsx:362 | parseFloat | `onChange={e => updateField('calculationValue', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayHeadMaster.tsx:368 | parseFloat | `onChange={e => updateField('maxValueMonthly', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayHeadMaster.tsx:377 | parseFloat | `onChange={e => updateField('conditionalMaxWage', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:251 | parseFloat | `<Input type="number" value={form.minCTC \|\| ''} onChange={e => updateField('minCTC', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:256 | parseFloat | `<Input type="number" value={form.maxCTC \|\| ''} onChange={e => updateField('maxCTC', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:268 | parseFloat | `<Input type="number" value={form.minGross \|\| ''} onChange={e => updateField('minGross', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:273 | parseFloat | `<Input type="number" value={form.maxGross \|\| ''} onChange={e => updateField('maxGross', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:281 | parseFloat | `<Input type="number" value={form.minBasic \|\| ''} onChange={e => updateField('minBasic', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:286 | parseFloat | `<Input type="number" value={form.maxBasic \|\| ''} onChange={e => updateField('maxBasic', parseFloat(e.target.value) \|\| 0)}` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:315 | parseFloat | `<Input type="number" value={form.promotionCriteriaYears \|\| ''} onChange={e => updateField('promotionCriteriaYears', parseFloat(e.target.va` | parseFloat on non-money input |
| src/pages/erp/pay-hub/masters/PayGradeMaster.tsx:320 | parseFloat | `<Input type="number" step="0.1" value={form.promotionCriteriaRating \|\| ''} onChange={e => updateField('promotionCriteriaRating', parseFloa` | parseFloat on non-money input |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:1053 | parseFloat | `onChange={e => setFlexiComponents(prev => ({ ...prev, [comp]: parseFloat(e.target.value.replace(/,/g,'')) \|\| 0 }))} />` | parseFloat on non-money input |
| src/types/webinar.ts:146 | Math.round | `? Math.round((o.enquiries_created / o.attendees) * 1000) / 10 : 0;` | non-money non-critical round |
| src/types/webinar.ts:148 | Math.round | `? Math.round((o.orders_converted / o.enquiries_created) * 1000) / 10 : 0;` | non-money non-critical round |
| src/types/campaign.ts:132 | Math.round | `const safe = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100 * 10) / 10;` | non-money non-critical round |
| src/features/party-master/lib/cross-sell-finder.ts:70 | Math.round | `detail: `${kpi.productsPurchasedCount} products vs sector avg ${Math.round(avgProductCount)}`,` | non-money non-critical round |
| src/types/contract-manpower.ts:163 | Math.round | `const grossWages   = Math.round(dailyWage * daysPresent);` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:76 | Math.round | `val = Math.round(val);` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:225 | Math.round | `return Math.round(lop * 2) / 2;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:238 | Math.round | `const reduced = Math.round(l.monthly * (1 - deductFactor));` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:306 | Math.round | `surcharge: Math.round(surcharge),` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:308 | Math.round | `rebate87A: Math.round(rebate87A),` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:385 | Math.round | `const empPF = employee.pfApplicable ? Math.round(pfWage * 0.12) : 0;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:386 | Math.round | `const erEPF = employee.pfApplicable ? Math.round(pfWage * 0.0367) : 0;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:387 | Math.round | `const erEPS = employee.pfApplicable ? Math.min(Math.round(pfWage * 0.0833), 1250) : 0;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:388 | Math.round | `const erEDLI = employee.pfApplicable ? Math.min(Math.round(pfWage * 0.005), 75) : 0;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:392 | Math.round | `const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;` | non-money non-critical round |
| src/hooks/usePayrollEngine.ts:393 | Math.round | `const erESI = esiWage > 0 ? Math.round(esiWage * 0.0325) : 0;` | non-money non-critical round |
| src/components/fincore/dialogs/ItemAllocationDialog.tsx:92 | Math.round | `const expected = Math.round(r.qty);` | non-money non-critical round |
| src/features/loan-emi/lib/duplicate-detector.ts:51 | Math.round | `return Math.round((a - b) / 86_400_000);` | non-money non-critical round |
| src/features/loan-emi/lib/alert-engine.ts:37 | Math.round | `return Math.round((due - today) / 86_400_000);` | non-money non-critical round |
| src/features/loan-emi/lib/advance-aging.ts:58 | Math.round | `return Math.max(0, Math.round((b - a) / 86_400_000));` | non-money non-critical round |
| src/components/company/ProgressStepper.tsx:24 | Math.round | `? Math.round((completedSteps.length / validatable.length) * 100) : 0;` | non-money non-critical round |
| src/features/ledger-master/lib/emi-schedule-builder.ts:51 | Math.round | `principal: Math.round(principalPortion * 100) / 100,` | non-money non-critical round |
| src/features/ledger-master/lib/emi-schedule-builder.ts:52 | Math.round | `interest: Math.round(interest * 100) / 100,` | non-money non-critical round |
| src/features/ledger-master/lib/emi-schedule-builder.ts:66 | Math.round | `return Math.round(emi * 100) / 100;` | non-money non-critical round |
| src/features/loan-emi/components/EMICalendar.tsx:69 | Math.round | `daysUntil: Math.round((dueMs - todayMs) / 86_400_000),` | non-money non-critical round |
| src/components/mobile/MobileSiteDPRCapture.tsx:70 | Math.round | `if (!passed) toast.error(`Photo ${Math.round(dist)}m from site (fence ${site.location.geo_radius_meters}m) · submit BLOCKED`);` | non-money non-critical round |
| src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx:53 | Math.round | `returnStandbyLoan(returnId, ACTOR, damage, Math.round(Number(damageCharge) * 100));` | non-money non-critical round |
| src/test/dev-only/SmokeTestRunner.tsx:1142 | Math.round | `return { actual: `layout=${layout}, w=${Math.round(w)}, h=${Math.round(h)}`,` | test fixture |
| src/test/dev-only/SmokeTestRunner.tsx:1162 | Math.round | `return { actual: `layout=${layout}, w=${Math.round(w)}, h=${Math.round(h)}`,` | test fixture |
| src/test/dev-only/SmokeTestRunner.tsx:2828 | Math.round | `const score = total > 0 ? Math.round((passed / total) * 100) : 0;` | test fixture |
| src/features/command-center/modules/OverviewModule.tsx:83 | Math.round | `return Math.round((configured / securityKeys.length) * 100);` | non-money non-critical round |
| src/lib/camera-bridge.ts:103 | Math.round | `return Math.round((base64.length * 3) / 4);` | non-money non-critical round |
| src/components/mobile/MobilePODCapture.tsx:173 | Math.round | `✓ {Math.round(pod.gps_accuracy_m ?? 0)}m accuracy` | non-money non-critical round |
| src/components/mobile/MobilePODCapture.tsx:174 | Math.round | `{pod.distance_from_ship_to_m != null && ` · ${Math.round(pod.distance_from_ship_to_m)}m from ship-to`}` | non-money non-critical round |
| src/test/c1f-tier2-tier3-oobs-sarathi.test.ts:93 | Math.round | `expect(q.suggested_charge_paise).toBe(Math.round(500 * 100 * 4));` | test fixture |
| src/lib/vendor-scoring-engine.ts:53 | Math.round | `const responsiveness = rfqCount > 0 ? Math.round((respondedCount / rfqCount) * 100) : 50;` | non-money non-critical round |
| src/lib/vendor-scoring-engine.ts:55 | Math.round | `? Math.round(` | non-money non-critical round |
| src/pages/erp/dispatch/DispatchHubWelcome.tsx:207 | Math.round | `{p.distance_from_ship_to_m != null ? `${Math.round(p.distance_from_ship_to_m)}m` : '—'}` | non-money non-critical round |
| src/pages/erp/dispatch/DispatchHubWelcome.tsx:210 | Math.round | `{p.gps_accuracy_m != null ? `${Math.round(p.gps_accuracy_m)}m` : '—'}` | non-money non-critical round |
| src/pages/erp/customer-hub/transactions/VoiceComplaintCapture.tsx:78 | Math.round | `confidence: Math.round(conf * 100) / 100,` | non-money non-critical round |
| src/lib/vendor-analytics-engine.ts:169 | Math.round | `const days = Math.round(` | non-money non-critical round |
| src/lib/customer-clv-engine.ts:48 | Math.round | `const aov = trailingOrders > 0 ? Math.round(trailing / trailingOrders) : 0;` | non-money non-critical round |
| src/lib/customer-clv-engine.ts:74 | Math.round | `purchase_frequency_per_year: Math.round(frequency * 10) / 10,` | non-money non-critical round |
| src/lib/customer-clv-engine.ts:75 | Math.round | `retention_probability: Math.round(retention * 100) / 100,` | non-money non-critical round |
| src/lib/customer-churn-engine.ts:99 | Math.round | `complaint_factor: Math.round(complaintFactor * 100) / 100,` | non-money non-critical round |
| src/pages/erp/servicedesk/oem-claims/OEMClaimDetail.tsx:70 | Math.round | `const amt = Math.round(Number(approvedAmt) * 100);` | non-money non-critical round |
| src/pages/erp/servicedesk/oem-claims/OEMClaimDetail.tsx:80 | Math.round | `const amt = Math.round(Number(paidAmt \|\| approvedAmt) * 100);` | non-money non-critical round |
| src/pages/erp/dispatch/components/PODDetailDialog.tsx:86 | Math.round | `Distance from ship-to: {Math.round(pod.distance_from_ship_to_m)}m` | non-money non-critical round |
| src/test/maintainpro-reports.test.ts:95 | Math.round | `expect(Math.round((3 / 4) * 100)).toBe(75);` | test fixture |
| src/data/demo-procurement-data.ts:286 | Math.round | `delivery_days: Math.round(7 * qs.days_factor),` | non-money non-critical round |
| src/data/demo-field-force-data.ts:295 | Math.round | `const distance = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));` | non-money non-critical round |
| src/data/demo-salesx-data.ts:441 | Math.round | `const received = isPaid ? base : isPartial ? Math.round(base * 0.5) : 0;` | non-money non-critical round |
| src/data/demo-salesx-data.ts:442 | Math.round | `const earned = isPaid ? commission : isPartial ? Math.round(commission * 0.5) : 0;` | non-money non-critical round |
| src/lib/geolocation-bridge.ts:67 | Math.round | `reason: `Accuracy ${Math.round(lastReading.accuracy_m ?? 0)}m exceeds threshold`,` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:24 | Math.round | `const basic = Math.round(t.annualCTC * 0.4 / 12);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:25 | Math.round | `const hra = Math.round(basic * 0.5);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:33 | Math.round | `const wBasic = Math.round(t.annualCTC * 0.7 / 12);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:34 | Math.round | `const da = Math.round(wBasic * 0.15);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:43 | Math.round | `const empPF = Math.round(pfWage * 0.12);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:45 | Math.round | `const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:62 | Math.round | `grossEarnings: Math.round(grossEarnings * lopFactor),` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:76 | Math.round | `const spcl = Math.round(monthlyCTC - basic - hra - conv - med);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:88 | Math.round | `const empPF = Math.round(pfWage * 0.12);` | non-money non-critical round |
| src/data/demo-transactions-pay-hub.ts:90 | Math.round | `const empESI = esiWage > 0 ? Math.round(esiWage * 0.0075) : 0;` | non-money non-critical round |
| src/services/entity-setup-service.ts:708 | Math.round | `const rejected = Math.round(pl.qty - accepted);` | non-money non-critical round |
| src/services/entity-setup-service.ts:1898 | Math.round | `variance_value: Math.round(varValue * 100) / 100,` | non-money non-critical round |
| src/lib/form-keyboard-engine.ts:230 | Math.round | `return Math.round(result * 100) / 100;` | non-money non-critical round |
| src/lib/store-hub-engine.ts:245 | Math.round | `b.forecast_30d = Math.round(b.avg_daily_consumption * 30);` | non-money non-critical round |
| src/lib/field-force-engine.ts:70 | Math.round | `return Math.round((covered / customerIdsInTerritory.length) * 100);` | non-money non-critical round |
| src/lib/location-tracker-engine.ts:144 | Math.round | `const haltMinutes = Math.round(` | non-money non-critical round |
| src/lib/indent-health-score-engine.ts:41 | Math.round | `age_penalty: Math.round(age_penalty),` | non-money non-critical round |
| src/lib/packing-bom-engine.ts:153 | Math.round | `variance_qty: Math.round(variance_qty * 1000) / 1000,` | non-money non-critical round |
| src/lib/oob/vendor-quality-scorecard-engine.ts:29 | Math.round | `d === 0 ? 0 : Math.round((n / d) * 1000) / 10;` | non-money non-critical round |
| src/lib/oob/vendor-quality-scorecard-engine.ts:86 | Math.round | `? Math.round((labTatSum / labTatCount) * 10) / 10` | non-money non-critical round |
| src/lib/stock-out-engine.ts:59 | Math.round | `days_of_cover: Math.round(daysOfCover * 10) / 10,` | non-money non-critical round |
| src/lib/oob/qa-pending-inspection-alerts.ts:62 | Math.round | `const warn = Math.max(1, Math.round(base.warning * scale));` | non-money non-critical round |
| src/lib/oob/qa-pending-inspection-alerts.ts:63 | Math.round | `const crit = Math.max(warn + 1, Math.round(base.critical * scale));` | non-money non-critical round |
| src/lib/oob/qa-pending-inspection-alerts.ts:64 | Math.round | `const esc  = Math.max(crit + 1, Math.round(base.escalated * scale));` | non-money non-critical round |
| src/pages/erp/salesx/transactions/WebinarMaster.tsx:197 | Math.round | `: Math.round(` | non-money non-critical round |
| src/pages/erp/salesx/transactions/VisitTracking.tsx:399 | Math.round | `{Math.round(activeVisit.distance_from_customer_meters)}m` | non-money non-critical round |
| src/pages/erp/salesx/transactions/VisitTracking.tsx:546 | Math.round | `? `${Math.round(v.distance_from_customer_meters)}m`` | non-money non-critical round |
| src/lib/requestx-report-engine.ts:197 | Math.round | `const days = Math.max(0, Math.round((at - cursor) / 86400000));` | non-money non-critical round |
| src/lib/requestx-report-engine.ts:203 | Math.round | `const tailDays = Math.max(0, Math.round((Date.now() - cursor) / 86400000));` | non-money non-critical round |
| src/lib/site-health-score-engine.ts:57 | Math.round | `const overall = Math.round(` | non-money non-critical round |
| src/lib/sample-kit-engine.ts:119 | Math.round | `return Math.round((converted / closed.length) * 100);` | non-money non-critical round |
| src/pages/erp/accounting/LedgerMaster.tsx:2289 | Math.round | `return Math.round(principal * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1) * 100) / 100;` | non-money non-critical round |
| src/pages/erp/logistic/LogisticDisputes.tsx:63 | Math.round | `: Math.round((list.filter(d => d.response_text).length / list.length) * 100);` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/PerformanceAndTalent.tsx:212 | Math.round | `? Math.round(((compForm.newCTC - compForm.oldCTC) / compForm.oldCTC) * 1000) / 10` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:47 | Math.round | `return convert(Math.round(num)) + ' Rupees Only';` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:130 | Math.round | `pf: emp.annualCTC ? Math.round(Math.min((emp.annualCTC * 0.4 / 12) * 0.12 * 12, 21600)) : 0,` | non-money non-critical round |
| src/pages/erp/payout/VendorAnalytics.tsx:119 | Math.round | `return Math.round(sum / valid.length);` | non-money non-critical round |
| src/pages/erp/payout/VendorAnalytics.tsx:129 | Math.round | `return Math.round(sum / vendorMetrics.length);` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/Onboarding.tsx:207 | Math.round | `return Math.round((done / j.tasks.length) * 100);` | non-money non-critical round |
| src/pages/erp/salesx/SalesXAnalytics.tsx:143 | Math.round | `? Math.round((periodActual / t.target_value) * 1000) / 10` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:61 | Math.round | `return Math.min(Math.round(gratuity), cap);` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:73 | Math.round | `return Math.round(encashableDays * (monthlyBasic / 26));` | non-money non-critical round |
| src/pages/erp/payout/CashFlowDashboard.tsx:86 | Math.round | `committed: Math.round(w.committed),` | non-money non-critical round |
| src/pages/erp/payout/CashFlowDashboard.tsx:87 | Math.round | `net: Math.round(w.net),` | non-money non-critical round |
| src/pages/erp/fincore/registers/CancellationAuditRegister.tsx:48 | Math.round | `return Math.max(0, Math.round((tb - ta) / (1000 * 60 * 60 * 24)));` | non-money non-critical round |
| src/pages/erp/fincore/registers/CancellationAuditRegister.tsx:88 | Math.round | `: Math.round(` | non-money non-critical round |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:838 | Math.round | `const gratuity = Math.round((annualBasic * 4.81) / 100);` | non-money non-critical round |
| src/pages/erp/inventory/ItemCraft.tsx:274 | Math.round | `: f.warranty_unit === 'Days' ? Math.round(Number(f.warranty_period) / 30)` | non-money non-critical round |
| src/pages/erp/fincore/FinCoreHub.tsx:190 | Math.round | `const margin = mtdRevenue > 0 ? Math.round((grossProfit / mtdRevenue) * 1000) / 10 : 0;` | non-money non-critical round |
| src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:166 | Math.round | `? Math.round(((form.annualCTC - activeEmployee.annualCTC) / activeEmployee.annualCTC) * 100 * 100) / 100` | non-money non-critical round |
| src/pages/erp/gateflow/panels.tsx:105 | Math.round | `? Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length / 60000)` | non-money non-critical round |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:180 | Math.round | `? Math.round(tenures.reduce((s, t) => s + t, 0) / tenures.length)` | non-money non-critical round |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:225 | Math.round | `? Math.round(((latest.gross - prev.gross) / prev.gross) * 1000) / 10` | non-money non-critical round |

---

## T1 Re-Sweep (corrective continuation · predecessor f6b5eb2)

T1 closes two material defects in the original Stage 2 sweep:

1. **Coverage gap** — original sweep missed Math.floor (169) and Math.ceil (40) = 209 sites.
2. **Under-classification** — Class C contained statutory payroll money math that the rubric's own *engine/hook auto-D* rule should have promoted to D.

### Revised pattern coverage

| Pattern       | Sites |
|---------------|------:|
| toFixed       |  334 |
| parseFloat    |  267 |
| Math.round    |  461 |
| Math.floor    |  169 |
| Math.ceil     |   40 |
| **Total**     | **1271** |

Note: original table reported toFixed=359 / parseFloat=281 (rg run including extra paths); fresh re-count yields 334/267. The lower count is the correct one for the project source tree. Table rows already swept stand — no row was deleted.

Combined audit total = 1101 (original sweep, kept verbatim) + 209 (T1 floor/ceil additions) = **1310 rows**.

### Revised class roll-up

| Class | Original | + floor/ceil | + C→D promotions | **Final** |
|------:|---------:|-------------:|-----------------:|----------:|
| A     |        9 |            0 |                0 |         9 |
| B     |      420 |           49 |                0 |       469 |
| C     |      287 |          125 |              −47 |       365 |
| D     |      385 |           35 |              +47 |       467 |
| **Σ** | **1101** |      **209** |                0 |  **1310** |

### C→D promotions (T1 reclassification — 47 rows)

Promoted because: (a) sits in /lib/*-engine.ts or /hooks/use*.ts AND money-shaped, OR (b) money keyword present in code/path. Includes the six known groups (usePayrollEngine.ts:385-393 PF/EPS/EDLI/ESI block, contract-manpower.ts:163 grossWages, ExitAndFnF.tsx:61/73, EmployeeExperience.tsx:838, PayslipGeneration.tsx:130, CashFlowDashboard.tsx:86-87) plus 41 additional sites surfaced by sweeping the whole Class C section against the rule.

| Promoted file:line | Pattern | Reason |
|---|---|---|
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:153  |  toFixed  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:164  |  toFixed  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:165  |  toFixed  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:93  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:95  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:101  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/__tests__/__sprint-summaries__/hardening-a-close-summary.md:162  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/command-center/modules/EmployeeOpeningLoansModule.tsx:352  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:654  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1312  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1432  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/masters/PayHeadMaster.tsx:377  |  parseFloat  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/types/contract-manpower.ts:163  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:76  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:225  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:238  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:306  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:308  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:385  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:386  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:387  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:388  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:392  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/hooks/usePayrollEngine.ts:393  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/loan-emi/lib/duplicate-detector.ts:51  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/loan-emi/lib/alert-engine.ts:37  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/loan-emi/lib/advance-aging.ts:58  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/ledger-master/lib/emi-schedule-builder.ts:51  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/ledger-master/lib/emi-schedule-builder.ts:52  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/ledger-master/lib/emi-schedule-builder.ts:66  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/features/loan-emi/components/EMICalendar.tsx:69  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx:53  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/test/dev-only/SmokeTestRunner.tsx:2828  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/test/c1f-tier2-tier3-oobs-sarathi.test.ts:93  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/data/demo-transactions-pay-hub.ts:43  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/data/demo-transactions-pay-hub.ts:45  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/data/demo-transactions-pay-hub.ts:62  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/data/demo-transactions-pay-hub.ts:88  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/data/demo-transactions-pay-hub.ts:90  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/accounting/LedgerMaster.tsx:2289  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:47  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:130  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:61  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:73  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/payout/CashFlowDashboard.tsx:86  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/payout/CashFlowDashboard.tsx:87  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |
|  src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:838  |  Math.round  | money math in engine/hook or money-keyword — needs-founder-ruling |


### T1 Re-Sweep — Class D additions (Math.floor/Math.ceil)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/lib/payment-gateway-engine.ts:13 | Math.floor | `return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:130 | Math.floor | `const t = Math.floor(n / 10);` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:136 | Math.floor | `const h = Math.floor(n / 100);` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:151 | Math.floor | `const rupees = Math.floor(abs);` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:158 | Math.floor | `const crore = Math.floor(n / 10000000); n %= 10000000;` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:159 | Math.floor | `const lakh = Math.floor(n / 100000); n %= 100000;` | money math without precision contract — needs-founder-ruling |
| src/lib/invoice-print-engine.ts:160 | Math.floor | `const thousand = Math.floor(n / 1000); n %= 1000;` | money math without precision contract — needs-founder-ruling |
| src/lib/hierarchy-engine.ts:116 | Math.floor | `? Math.floor(parentTargetPaise * (weights[i] / sumW))` | money math without precision contract — needs-founder-ruling |
| src/lib/hierarchy-engine.ts:117 | Math.floor | `: Math.floor(parentTargetPaise / children.length);` | money math without precision contract — needs-founder-ruling |
| src/lib/loyalty-engine.ts:127 | Math.floor | `return Math.floor(rupees * EARN_RATE_PER_RUPEE[tier]);` | money math without precision contract — needs-founder-ruling |
| src/lib/loyalty-engine.ts:132 | Math.floor | `return Math.floor((points / REDEMPTION_RATE) * 100);` | money math without precision contract — needs-founder-ruling |
| src/hooks/useOutstanding.ts:34 | Math.floor | `const days = Math.floor((refDate.getTime() - new Date(e.voucher_date).getTime()) / 86400000);` | money math without precision contract — needs-founder-ruling |
| src/lib/scheme-engine.ts:69 | Math.floor | `const reps = Math.floor(totalTriggerQty / p.trigger_qty);` | money math without precision contract — needs-founder-ruling |
| src/components/fincore/TaxPeriodGateBanner.tsx:30 | Math.floor | `return Math.floor((t.getTime() - today.getTime()) / 86_400_000);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/servicedesk/standby-loans/StandbyLoanList.tsx:29 | Math.floor | `return Math.max(0, Math.floor(ms / (86400 * 1000)));` | money math without precision contract — needs-founder-ruling |
| src/features/loan-emi/engines/penal-engine.ts:93 | Math.floor | `return Math.max(0, Math.floor((b - a) / 86_400_000));` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/ExitAndFnF.tsx:59 | Math.floor | `const gratuity = (monthlyBasic * 15 * Math.floor(years)) / 26;` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/distributor/CreditApprovalQueue.tsx:75 | Math.floor | `const paise = Math.floor(lakhs * 100000 * 100);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/customer-hub/transactions/CustomerCart.tsx:133 | Math.floor | `const maxRedeemDiscount = Math.floor((subtotal - schemeDiscount) * MAX_REDEEM_PCT);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/distributor/DistributorCreditRequest.tsx:57 | Math.floor | `return isNaN(n) ? 0 : Math.floor(n * 100000 * 100); // lakhs -> rupees -> paise` | money math without precision contract — needs-founder-ruling |
| src/components/registers/UniversalRegisterGrid.tsx:113 | Math.ceil | `const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));` | money math without precision contract — needs-founder-ruling |
| src/hooks/usePayrollEngine.ts:166 | Math.ceil | `? Math.ceil(adv.amount / 2)` | money math without precision contract — needs-founder-ruling |
| src/components/fincore/registers/RegisterGrid.tsx:232 | Math.ceil | `const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/foundation/geography/CityMaster.tsx:92 | Math.ceil | `const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:52 | Math.ceil | `const emi = Math.ceil(principal / tenureMonths);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:72 | Math.ceil | `const emi = Math.ceil(totalPayable / tenureMonths);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:79 | Math.ceil | `const prinPart = Math.ceil(actualEmi - monthlyInterest);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:82 | Math.ceil | `emiAmount: Math.ceil(actualEmi), principal: prinPart,` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:83 | Math.ceil | `interest: Math.ceil(monthlyInterest),` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:95 | Math.ceil | `? Math.ceil(principal / tenureMonths)` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:96 | Math.ceil | `: Math.ceil(principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:120 | Math.ceil | `if (interestType === 'nil') return Math.ceil(principal / tenureMonths);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:123 | Math.ceil | `return Math.ceil((principal + totalInterest) / tenureMonths);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:126 | Math.ceil | `if (r === 0) return Math.ceil(principal / tenureMonths);` | money math without precision contract — needs-founder-ruling |
| src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:127 | Math.ceil | `return Math.ceil(principal * r * Math.pow(1+r,tenureMonths) / (Math.pow(1+r,tenureMonths)-1));` | money math without precision contract — needs-founder-ruling |

### T1 Re-Sweep — Class B additions (Math.floor/Math.ceil)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/pages/mobile/telecaller/MobileTelecallerStatsPage.tsx:40 | Math.floor | `const m = Math.floor(secs / 60);` | display path |
| src/components/uth/PinnedTemplatesWidget.tsx:40 | Math.floor | `const m = Math.floor(diff / 60000);` | display path |
| src/components/uth/PinnedTemplatesWidget.tsx:43 | Math.floor | `const h = Math.floor(m / 60);` | display path |
| src/components/uth/PinnedTemplatesWidget.tsx:45 | Math.floor | `const d = Math.floor(h / 24);` | display path |
| src/components/uth/PinnedTemplatesWidget.tsx:47 | Math.floor | `const mo = Math.floor(d / 30);` | display path |
| src/pages/mobile/telecaller/MobileTelecallerCallLogPage.tsx:58 | Math.floor | `const m = Math.floor(secs / 60);` | display path |
| src/pages/mobile/telecaller/MobileActiveCallPage.tsx:113 | Math.floor | `const duration = Math.floor((Date.now() - callStartTime) / 1000);` | display path |
| src/pages/mobile/supervisor/MobileTeamLiveViewPage.tsx:98 | Math.floor | `<span>{Math.floor(s.on_call_seconds_today / 60)}m talk</span>` | display path |
| src/pages/mobile/supervisor/MobileTeamLiveViewPage.tsx:99 | Math.floor | `<span>{Math.floor(s.break_seconds_today / 60)}m break</span>` | display path |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:27 | Math.floor | `const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);` | display path |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:29 | Math.floor | `if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;` | display path |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:30 | Math.floor | `if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;` | display path |
| src/pages/mobile/supervisor/MobileCoverageMapPage.tsx:31 | Math.floor | `return `${Math.floor(diffSec / 86400)}d ago`;` | display path |
| src/pages/mobile/salesman/MobileSalesmanBeatPage.tsx:50 | Math.floor | `const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);` | display path |
| src/pages/erp/logistic/LogisticDashboard.tsx:26 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | display path |
| src/pages/erp/inventory/reports/SlowMovingDeadStockReport.tsx:78 | Math.floor | `? Math.floor((now - lastT) / (24 * 60 * 60 * 1000))` | display path |
| src/pages/erp/inventory/reports/AgedGITReport.tsx:30 | Math.floor | `return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));` | display path |
| src/pages/erp/production/reports/WIPReport.tsx:19 | Math.floor | `return Math.floor((Date.now() - new Date(released.changed_at).getTime()) / 86400000);` | display path |
| src/pages/erp/production/reports/StockWithJobWorker.tsx:50 | Math.floor | `const ageDays = Math.floor((today - new Date(j.jwo_date).getTime()) / 86400000);` | display path |
| src/pages/erp/fincore/registers/ApprovalsPendingPage.tsx:39 | Math.floor | `return Math.max(0, Math.floor((Date.now() - t) / 86400000));` | display path |
| src/pages/erp/production/reports/JobWorkAgeingAnalysis.tsx:34 | Math.floor | `const ageDays = Math.floor((today - new Date(j.jwo_date).getTime()) / 86400000);` | display path |
| src/pages/erp/salesx/reports/FollowUpRegisterReport.tsx:43 | Math.floor | `const daysOverdue = Math.floor(` | display path |
| src/pages/erp/salesx/reports/CrossDeptHandoffTracker.tsx:145 | Math.floor | `const daysSince = Math.max(0, Math.floor(` | display path |
| src/pages/erp/salesx/reports/CallLogHistoryReport.tsx:56 | Math.floor | `const m = Math.floor(secs / 60);` | display path |
| src/pages/erp/fincore/reports/EWayBillRegister.tsx:55 | Math.floor | `const h = Math.floor(ms / 3600000);` | display path |
| src/pages/erp/fincore/reports/EWayBillRegister.tsx:56 | Math.floor | `const d = Math.floor(h / 24);` | display path |
| src/pages/erp/receivx/reports/CreditRiskReport.tsx:83 | Math.floor | `const ages = myOutstanding.map(o => Math.floor((todayD - new Date(o.due_date).getTime()) / (1000 * 60 * 60 * 24)));` | display path |
| src/pages/erp/procure-hub/reports/PiPendingPanel.tsx:34 | Math.floor | `const days = Math.floor((now - new Date(d.pi_draft_date \|\| d.created_at).getTime()) / MS_PER_DAY);` | display path |
| src/pages/erp/maintainpro/reports/OpenWOStatusReport.tsx:13 | Math.floor | `const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);` | display path |
| src/pages/erp/procure-hub/reports/PeqFollowupRegisterPanel.tsx:23 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | display path |
| src/pages/erp/procure-hub/reports/VendorReliabilityPanel.tsx:20 | Math.floor | `const idx = Math.floor(sorted.length * 0.75);` | display path |
| src/pages/erp/procure-hub/reports/PeqFollowupPanel.tsx:41 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | display path |
| src/pages/erp/procure-hub/reports/GroupWiseOutstandingPanel.tsx:57 | Math.floor | `const days = Math.floor((now - new Date(b.created_at).getTime()) / MS_PER_DAY);` | display path |
| src/pages/erp/procure-hub/reports/TdsDeductionReportPanel.tsx:24 | Math.floor | `const q = Math.floor(((d.getMonth() + 9) % 12) / 3) + 1;` | display path |
| src/pages/erp/procure-hub/reports/SupplierWiseOutstandingPanel.tsx:46 | Math.floor | `const days = Math.floor((now - new Date(b.created_at).getTime()) / MS_PER_DAY);` | display path |
| src/pages/erp/maintainpro/reports/FireSafetyExpiryReport.tsx:17 | Math.floor | `const days = Math.floor((exp - now) / 86400000);` | display path |
| src/pages/erp/maintainpro/reports/CalibrationStatusReport.tsx:17 | Math.floor | `const days = Math.floor((due - now) / 86400000);` | display path |
| src/pages/erp/accounting/LedgerMaster.tsx:698 | Math.floor | `if (n < 100) return tens[Math.floor(n/10)] + ' ' + ones[n%10] + ' ';` | display path |
| src/pages/erp/accounting/LedgerMaster.tsx:699 | Math.floor | `if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred ' + toWords(n%100);` | display path |
| src/pages/erp/accounting/LedgerMaster.tsx:700 | Math.floor | `if (n < 100000) return toWords(Math.floor(n/1000)) + 'Thousand ' + toWords(n%1000);` | display path |
| src/pages/erp/pay-hub/PayHubDashboard.tsx:339 | Math.floor | `yearsIn: Math.floor(yearsInRole),` | display path |
| src/pages/erp/maintainpro/reports/AMCOutToVendorStatus.tsx:22 | Math.floor | `s.totalDays += Math.floor((new Date(a.actual_return_date).getTime() - new Date(a.sent_date).getTime()) / 86400000);` | display path |
| src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx:63 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | display path |
| src/pages/mobile/manager/MobileProjectHealthPage.tsx:40 | Math.ceil | `return Math.ceil(ms / (1000 * 60 * 60 * 24));` | display path |
| src/components/foundation/FoundationListPage.tsx:69 | Math.ceil | `const pages = Math.max(1, Math.ceil(total / perPage));` | display path |
| src/pages/erp/qualicheck/reports/WpqExpiryDashboard.tsx:63 | Math.ceil | `const days = Math.ceil(` | display path |
| src/pages/erp/production/reports/ManpowerProductionReport.tsx:104 | Math.ceil | `const top10 = Math.max(1, Math.ceil(list.length * 0.1));` | display path |
| src/pages/erp/fincore/reports/AuditDashboard.tsx:76 | Math.ceil | `return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));` | display path |
| src/pages/erp/procure-hub/reports/PreClosePendingPanel.tsx:29 | Math.ceil | `(r) => r.vendors_quoted >= Math.ceil(r.vendors_invited / 2) && r.pct_elapsed < 100,` | display path |

### T1 Re-Sweep — Class C additions (Math.floor/Math.ceil)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
| src/data/demo-field-force-data.ts:39 | Math.floor | `return Math.floor(rand() * (max - min + 1)) + min;` | non-money non-critical |
| src/data/demo-field-force-data.ts:41 | Math.floor | `function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }` | non-money non-critical |
| src/lib/audit-trail-engine.ts:96 | Math.floor | `const truncated = existing.slice(-Math.floor(existing.length / 2));` | non-money non-critical |
| src/pages/tower/Support.tsx:249 | Math.floor | `const newId = `TKT-00${42 + Math.floor(Math.random() * 9)}`;` | non-money non-critical |
| src/lib/distributor-auth-engine.ts:29 | Math.floor | `iat: Math.floor(Date.now() / 1000),` | non-money non-critical |
| src/lib/distributor-auth-engine.ts:30 | Math.floor | `exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8h` | non-money non-critical |
| src/lib/ewb-engine.ts:118 | Math.floor | `return String(Math.floor(Math.random() * 1e12)).padStart(12, '0');` | non-money non-critical |
| src/lib/dunning-engine.ts:79 | Math.floor | `const days = Math.max(0, Math.floor((todayMs - new Date(e.due_date).getTime()) / 86400000));` | non-money non-critical |
| src/components/uth/DraftRecoveryDialog.tsx:29 | Math.floor | `if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;` | non-money non-critical |
| src/components/uth/DraftRecoveryDialog.tsx:30 | Math.floor | `if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr`;` | non-money non-critical |
| src/components/uth/DraftRecoveryDialog.tsx:31 | Math.floor | `return `${Math.floor(seconds / 86400)} days`;` | non-money non-critical |
| src/lib/customer-clv-engine.ts:17 | Math.floor | `return Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);` | non-money non-critical |
| src/lib/cart-abandonment-engine.ts:25 | Math.floor | `return Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);` | non-money non-critical |
| src/lib/fiscal-year-engine.ts:19 | Math.floor | `const y = startYear + Math.floor((startMonth - 1 + i) / 12);` | non-money non-critical |
| src/lib/consumption-intelligence-engine.ts:136 | Math.floor | `const idleDays = Math.floor((Date.now() - last) / DAY_MS);` | non-money non-critical |
| src/lib/customer-churn-engine.ts:35 | Math.floor | `return Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);` | non-money non-critical |
| src/lib/field-force-engine.ts:85 | Math.floor | `return Math.floor(ms / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/lib/logistic-auth-engine.ts:47 | Math.floor | `iat: Math.floor(Date.now() / 1000),` | non-money non-critical |
| src/lib/logistic-auth-engine.ts:48 | Math.floor | `exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,` | non-money non-critical |
| src/lib/location-tracker-engine.ts:173 | Math.floor | `const minsOffline = Math.floor((Date.now() - lastOnlineFalseAt) / 60_000);` | non-money non-critical |
| src/lib/packing-slip-engine.ts:33 | Math.floor | `const fullCartons = packsPerCarton > 0 ? Math.floor(qty / packsPerCarton) : 0;` | non-money non-critical |
| src/lib/irn-engine.ts:206 | Math.floor | `out += chars[Math.floor(Math.random() * 16)];` | non-money non-critical |
| src/lib/irn-engine.ts:259 | Math.floor | `const ackNo = String(Math.floor(Math.random() * 1e14)).padStart(14, '0');` | non-money non-critical |
| src/lib/irn-engine.ts:278 | Math.floor | `for (let i = 0; i < 384; i += 1) qrSig += sigChars[Math.floor(Math.random() * sigChars.length)];` | non-money non-critical |
| src/hooks/useCycleCounts.ts:66 | Math.floor | `? Math.floor((asOfMs - Date.parse(lastCounted)) / 86400000)` | non-money non-critical |
| src/lib/commission-engine.ts:173 | Math.floor | `const daysSince = Math.floor((recMs - invMs) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/lib/oob/vehicle-expiry-alerts.ts:52 | Math.floor | `days_remaining: Math.floor((ts - today) / 86400000),` | non-money non-critical |
| src/lib/oob/stock-hold-report-engine.ts:48 | Math.floor | `return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));` | non-money non-critical |
| src/lib/oob/qa-pending-inspection-alerts.ts:81 | Math.floor | `const ageH = Math.floor((now - ts) / 3600000);` | non-money non-critical |
| src/lib/git-engine.ts:263 | Math.floor | `return Math.max(0, Math.floor((end - start) / 86400000));` | non-money non-critical |
| src/hooks/useAgentStatus.ts:86 | Math.floor | `const prevSecs = Math.floor((Date.now() - new Date(row.state_changed_at).getTime()) / 1000);` | non-money non-critical |
| src/lib/maintainpro-engine.ts:171 | Math.floor | `const daysUntilDue = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/lib/maintainpro-engine.ts:235 | Math.floor | `const daysUntilExpiry = Math.floor(` | non-money non-critical |
| src/lib/oob/contract-expiry-alerts.ts:24 | Math.floor | `days_remaining: Math.floor((new Date(c.valid_to).getTime() - today) / 86400000),` | non-money non-critical |
| src/lib/vendor-portal-auth-engine.ts:53 | Math.floor | `iat: Math.floor(Date.now() / 1000),` | non-money non-critical |
| src/lib/vendor-portal-auth-engine.ts:54 | Math.floor | `exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600,` | non-money non-critical |
| src/lib/oob/driver-expiry-alerts.ts:41 | Math.floor | `days_remaining: Math.floor((ts - today) / 86400000),` | non-money non-critical |
| src/lib/sitex-signoff-engine.ts:35 | Math.floor | `id: `SIGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,` | non-money non-critical |
| src/lib/production-variance-engine.ts:236 | Math.floor | `const daysDelta = Math.floor((actualEnd.getTime() - plannedEnd.getTime()) / 86400000);` | non-money non-critical |
| src/lib/sitex-ra-bill-engine.ts:57 | Math.floor | `id: `RA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,` | non-money non-critical |
| src/lib/sitex-ra-bill-engine.ts:83 | Math.floor | `id: `RAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,` | non-money non-critical |
| src/lib/sitex-ra-bill-engine.ts:109 | Math.floor | `apps.push({ id: `APP-${Date.now()}-${Math.floor(Math.random() * 1000)}`, ...entry });` | non-money non-critical |
| src/lib/oob/gate-dwell-alerts.ts:36 | Math.floor | `const minutes = Math.floor((now - ts) / 60000);` | non-money non-critical |
| src/lib/sitex-imprest-engine.ts:45 | Math.floor | `id: `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,` | non-money non-critical |
| src/lib/sitex-imprest-engine.ts:141 | Math.floor | `const txnId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;` | non-money non-critical |
| src/lib/sitex-imprest-engine.ts:197 | Math.floor | `? Math.floor((Date.now() - new Date(imp.last_replenishment_date).getTime()) / 86400000)` | non-money non-critical |
| src/lib/sitex-engine.ts:104 | Math.floor | `const daysInProgress = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:485 | Math.floor | `const otp = String(Math.floor(100000 + Math.random() * 900000));` | non-money non-critical |
| src/lib/procurement-pr-receiver.ts:65 | Math.floor | `const days = Math.max(0, Math.floor((today - new Date(i.date).getTime()) / 86400000));` | non-money non-critical |
| src/lib/procure360-report-engine.ts:26 | Math.floor | `? Math.floor((today - new Date(r.sent_at).getTime()) / 86400000)` | non-money non-critical |
| src/lib/procure360-report-engine.ts:188 | Math.floor | `else if (period === 'qoq') key = `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;` | non-money non-critical |
| src/lib/procure-followup-engine.ts:88 | Math.floor | `days_overdue: Math.floor(` | non-money non-critical |
| src/lib/pod-engine.ts:57 | Math.floor | `return String(Math.floor(100_000 + Math.random() * 900_000));` | non-money non-critical |
| src/lib/po-management-engine.ts:301 | Math.floor | `return ms > 0 ? Math.floor(ms / 86400000) : 0;` | non-money non-critical |
| src/lib/scheme-seed.ts:10 | Math.floor | `const endOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0).toISOString();` | non-money non-critical |
| src/components/ui/sidebar.tsx:536 | Math.floor | `return `${Math.floor(Math.random() * 40) + 50}%`;` | non-money non-critical |
| src/hooks/useLeaveManagement.ts:110 | Math.floor | `const monthsElapsed = Math.max(0, Math.floor(` | non-money non-critical |
| src/hooks/useLeaveManagement.ts:114 | Math.floor | `? Math.floor((daysPerYear / monthsInFY) * Math.min(monthsElapsed, monthsInFY) * 2) / 2` | non-money non-critical |
| src/features/party-master/lib/cross-sell-finder.ts:76 | Math.floor | `const days = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);` | non-money non-critical |
| src/hooks/useLeadDistribution.ts:199 | Math.floor | `const targetLoad = Math.floor(c.daily_capacity * 0.85);` | non-money non-critical |
| src/lib/requestx-report-engine.ts:82 | Math.floor | `return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));` | non-money non-critical |
| src/components/layout/ReplicaSyncChip.tsx:20 | Math.floor | `if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;` | non-money non-critical |
| src/components/layout/ReplicaSyncChip.tsx:21 | Math.floor | `if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;` | non-money non-critical |
| src/components/layout/ReplicaSyncChip.tsx:22 | Math.floor | `return `${Math.floor(delta / 86_400_000)}d ago`;` | non-money non-critical |
| src/lib/receivx-engine.ts:24 | Math.floor | `return Math.floor((db - da) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/pages/erp/logistic/LogisticLRQueue.tsx:29 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/components/layout/RecentActivityDrawer.tsx:26 | Math.floor | `if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;` | non-money non-critical |
| src/components/layout/RecentActivityDrawer.tsx:27 | Math.floor | `if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;` | non-money non-critical |
| src/components/layout/RecentActivityDrawer.tsx:28 | Math.floor | `return `${Math.floor(delta / 86_400_000)}d ago`;` | non-money non-critical |
| src/pages/erp/logistic/LogisticDisputes.tsx:26 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/hooks/useEmployees.ts:113 | Math.floor | `const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));` | non-money non-critical |
| src/hooks/useEmployees.ts:114 | Math.floor | `const months = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));` | non-money non-critical |
| src/hooks/useDraftAutoSave.ts:76 | Math.floor | `return meta ? Math.max(0, Math.floor((Date.now() - new Date(meta.savedAt).getTime()) / 1000)) : 0;` | non-money non-critical |
| src/hooks/useDraftAutoSave.ts:112 | Math.floor | `setDraftAge(Math.max(0, Math.floor((Date.now() - new Date(meta.savedAt).getTime()) / 1000)));` | non-money non-critical |
| src/pages/erp/gateflow/vehicle-panels.tsx:109 | Math.floor | `const days = Math.floor((exp - now) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/pages/erp/gateflow/alerts-panels.tsx:40 | Math.floor | `const label = min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:199 | Math.floor | `const daysAgo = Math.floor(` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:216 | Math.floor | `const daysAgo = Math.floor(` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:511 | Math.floor | `const mins = Math.floor(duration / 60), secs = duration % 60;` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:699 | Math.floor | `const daysAgo = Math.floor(` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:1148 | Math.floor | `const minsInState = Math.floor((Date.now() - new Date(s.state_changed_at).getTime()) / 60000);` | non-money non-critical |
| src/pages/erp/salesx/transactions/Telecaller.tsx:1149 | Math.floor | `const fmtSecs = (n: number) => `${Math.floor(n / 60)}m`;` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:41 | Math.floor | `if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:42 | Math.floor | `if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:43 | Math.floor | `if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:44 | Math.floor | `if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:45 | Math.floor | `return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:47 | Math.floor | `const mins = Math.floor(diff / 60000);` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:50 | Math.floor | `const hrs = Math.floor(mins / 60);` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:52 | Math.floor | `const days = Math.floor(hrs / 24);` | non-money non-critical |
| src/pages/erp/pay-hub/transactions/EmployeeExperience.tsx:286 | Math.floor | `const yrs = Math.floor(diff / (365.25 * 86400000));` | non-money non-critical |
| src/pages/erp/distributor-hub/DistributorHubWelcome.tsx:60 | Math.floor | `const mins = Math.floor(diff / 60000);` | non-money non-critical |
| src/pages/erp/distributor-hub/DistributorHubWelcome.tsx:63 | Math.floor | `const hrs = Math.floor(mins / 60);` | non-money non-critical |
| src/pages/erp/distributor-hub/DistributorHubWelcome.tsx:65 | Math.floor | `const days = Math.floor(hrs / 24);` | non-money non-critical |
| src/pages/erp/procure-hub/panels.tsx:1247 | Math.floor | `? Math.floor((today - new Date(r.timeout_at).getTime()) / 86400000)` | non-money non-critical |
| src/pages/erp/accounting/LedgerMaster.tsx:702 | Math.floor | `const lakhs = Math.floor(n / 100000);` | non-money non-critical |
| src/pages/erp/accounting/LedgerMaster.tsx:705 | Math.floor | `const crores = Math.floor(n / 10000000);` | non-money non-critical |
| src/pages/erp/accounting/LedgerMaster.tsx:2304 | Math.floor | `const dm = m + i - 1; const dy = y + Math.floor(dm / 12);` | non-money non-critical |
| src/pages/erp/dispatch/transactions/LRUpdate.tsx:26 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);` | non-money non-critical |
| src/pages/erp/dispatch/transactions/LRTracker.tsx:32 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);` | non-money non-critical |
| src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx:343 | Math.floor | `const age = Math.floor((Date.now() - new Date(u.purchase_date).getTime()) / 86400000);` | non-money non-critical |
| src/pages/erp/accounting/capital-assets/CWIPRegister.tsx:84 | Math.floor | `const age = Math.floor((Date.now() - new Date(u.purchase_date).getTime()) / 86400000);` | non-money non-critical |
| src/pages/erp/dispatch/transactions/DisputeQueue.tsx:48 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);` | non-money non-critical |
| src/pages/erp/accounting/capital-assets/AMCWarrantyTracker.tsx:27 | Math.floor | `return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);` | non-money non-critical |
| src/pages/erp/dispatch/DispatchHubWelcome.tsx:31 | Math.floor | `return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/pages/erp/distributor/DistributorDisputeQueue.tsx:91 | Math.floor | `approved = Math.floor(rs * 100);` | non-money non-critical |
| src/services/entity-setup-service.ts:1826 | Math.ceil | `const withCustomer = i <= Math.ceil(rpCfg.count / 2);` | non-money non-critical |
| src/lib/distributor-order-engine.ts:119 | Math.ceil | `const target = Math.ceil(daily * coverDays);` | non-money non-critical |
| src/pages/vendor-portal/VendorInbox.tsx:42 | Math.ceil | `return Math.ceil(ms / 86_400_000);` | non-money non-critical |
| src/lib/ewb-engine.ts:111 | Math.ceil | `const days = Math.max(1, Math.ceil(distanceKm / 200));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:434 | Math.ceil | `return Math.ceil(ms / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:632 | Math.ceil | `const days = Math.ceil((new Date(amc.contract_end).getTime() - Date.now()) / (86400 * 1000));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:986 | Math.ceil | `const turnaround_days = Math.max(0, Math.ceil((inAt - outAt) / (86400 * 1000)));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:1089 | Math.ceil | `const days = Math.max(1, Math.ceil((Date.now() - outAt) / (86400 * 1000)));` | non-money non-critical |
| src/lib/servicedesk-engine.ts:1321 | Math.ceil | `const actual_days = Math.ceil(` | non-money non-critical |
| src/lib/servicedesk-engine.ts:1459 | Math.ceil | `return Math.ceil(base_hours * benefits.sla_multiplier);` | non-money non-critical |
| src/lib/scheduling-engine.ts:68 | Math.ceil | `duration_days: Math.ceil((endMs - startMs) / 86400000),` | non-money non-critical |
| src/lib/scheduling-engine.ts:112 | Math.ceil | `duration_days: Math.ceil((endMs - startMs) / 86400000),` | non-money non-critical |
| src/lib/loyalty-engine.ts:157 | Math.ceil | `return Math.max(0, Math.ceil(ms / MS_PER_DAY));` | non-money non-critical |
| src/lib/sample-kit-engine.ts:73 | Math.ceil | `return Math.ceil(ms / MS_PER_DAY);` | non-money non-critical |
| src/components/batch-grid/BatchList.tsx:23 | Math.ceil | `const d = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);` | non-money non-critical |
| src/pages/erp/accounting/LedgerMaster.tsx:4015 | Math.ceil | `return Math.ceil(diff / (1000 * 60 * 60 * 24));` | non-money non-critical |
| src/pages/erp/customer-hub/transactions/CustomerCart.tsx:136 | Math.ceil | `const effectiveRedeemPoints = loyaltyDiscount > 0 ? Math.ceil(loyaltyDiscount * 10 / 100) : 0; // reverse calc` | non-money non-critical |
| src/pages/erp/inventory/InventoryHubWelcome.tsx:145 | Math.ceil | `cycleCountsDue = ageDays > 30 ? Math.ceil(ageDays / 30) : 0;` | non-money non-critical |
| src/pages/erp/pay-hub/masters/AssetMaster.tsx:518 | Math.ceil | `if (diff < 90) return <p className="text-[10px] text-amber-600 mt-0.5">⚠ Warranty expires in {Math.ceil(diff)} days</p>;` | non-money non-critical |

### T1 Re-Sweep — Class A additions (Math.floor/Math.ceil)

| File:Line | Pattern | Code | Note |
|---|---|---|---|
