/**
 * packing-slip-engine.ts — Compute packing slip from DLN + item-packing master.
 * Pure functions. No React, no localStorage.
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { ItemPacking } from '@/types/item-packing';
import type { PackingSlip, PackingSlipLine } from '@/types/packing-slip';

interface ComputeInput {
  dln: Voucher;
  itemPackings: ItemPacking[];
  shipToAddress: string;
  shipToCity: string;
  shipToState: string;
  shipToPincode: string;
  generatedBy: string;
  entityCode: string;
}

function computeLinePacking(
  line: VoucherInventoryLine, packings: ItemPacking[],
): Omit<PackingSlipLine, 'id' | 'dln_line_id'> {
  const itemPackings = packings.filter(p => p.item_id === line.item_id);
  const masterPack = itemPackings.find(p => p.level === 'master');
  const primaryPack = itemPackings.find(p => p.level === 'primary');

  const packsPerCarton = masterPack?.packs_per_carton ?? 1;
  const grossPerPack = primaryPack?.gross_weight ?? 0;
  const grossPerCarton = masterPack?.gross_weight ?? (packsPerCarton * grossPerPack);

  const qty = line.qty;
  const fullCartons = packsPerCarton > 0 ? Math.floor(qty / packsPerCarton) : 0;
  const loosePacks = qty - fullCartons * packsPerCarton;
  const totalGrossKg = fullCartons * grossPerCarton + loosePacks * grossPerPack;

  const dim = masterPack && masterPack.length && masterPack.width && masterPack.height ? {
    l: masterPack.length,
    w: masterPack.width,
    h: masterPack.height,
    unit: masterPack.dimension_unit,
  } : undefined;

  return {
    item_id: line.item_id,
    item_code: line.item_code,
    item_name: line.item_name,
    qty: line.qty,
    uom: line.uom,
    godown_id: line.godown_id,
    batch_id: line.batch_id ?? null,
    serial_ids: line.serial_id ? [line.serial_id] : null,
    full_cartons: fullCartons,
    loose_packs: loosePacks,
    total_gross_kg: totalGrossKg,
    carton_dimensions: dim,
  };
}

export function computePackingSlip(input: ComputeInput): PackingSlip {
  const { dln, itemPackings } = input;
  const lines: PackingSlipLine[] = (dln.inventory_lines ?? []).map(line => {
    const computed = computeLinePacking(line, itemPackings);
    return {
      id: `psl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dln_line_id: line.id,
      ...computed,
    };
  });

  const totalFullCartons = lines.reduce((s, l) => s + l.full_cartons, 0);
  const totalLoosePacks = lines.reduce((s, l) => s + l.loose_packs, 0);
  const totalGrossKg = lines.reduce((s, l) => s + l.total_gross_kg, 0);

  // Volumetric weight: 1 CFT = 10 kg (OM-style)
  let totalVolumetricKg = 0;
  for (const l of lines) {
    if (!l.carton_dimensions) continue;
    const mult = l.carton_dimensions.unit === 'inch' ? 2.54 : 1;
    const cmL = l.carton_dimensions.l * mult;
    const cmW = l.carton_dimensions.w * mult;
    const cmH = l.carton_dimensions.h * mult;
    const cft = (cmL * cmW * cmH) / 28316.85;
    totalVolumetricKg += cft * 10 * l.full_cartons;
  }

  return {
    id: `ps-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: input.entityCode,
    dln_voucher_id: dln.id,
    dln_voucher_no: dln.voucher_no,
    dln_date: dln.date,
    party_id: dln.party_id ?? null,
    party_name: dln.party_name ?? '',
    ship_to_address: input.shipToAddress,
    ship_to_city: input.shipToCity,
    ship_to_state: input.shipToState,
    ship_to_pincode: input.shipToPincode,
    lines,
    total_full_cartons: totalFullCartons,
    total_loose_packs: totalLoosePacks,
    total_gross_kg: Math.round(totalGrossKg * 1000) / 1000,
    total_volumetric_kg: Math.round(totalVolumetricKg * 1000) / 1000,
    transporter_id: null,
    transporter_name: dln.transporter ?? null,
    vehicle_no: dln.vehicle_no,
    generated_at: new Date().toISOString(),
    generated_by: input.generatedBy,
    printed_count: 0,
    status: 'draft',
  };
}
