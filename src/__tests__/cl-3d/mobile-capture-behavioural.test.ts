/**
 * @sprint T-CL3d-Components-Mobile-HookSweep
 * @purpose Behavioural — converted P2 capture reads under active entityCode (reactive via useEntityCode).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CL-3d · behavioural — MobileGateGuardCapture uses reactive hook', () => {
  it('reads entityCode from useEntityCode hook at component top level', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/mobile/MobileGateGuardCapture.tsx'), 'utf8');
    expect(src).toMatch(/import \{ useEntityCode \} from '@\/hooks\/useEntityCode'/);
    expect(src).toMatch(/export default function MobileGateGuardCapture\(\) \{\s*\n\s*const \{ entityCode \} = useEntityCode\(\);/);
    // Engine calls thread entityCode (not hardcoded DEMO)
    expect(src).toMatch(/findByVehicleNo\([^,]+, entityCode\)/);
    expect(src).toMatch(/createInwardEntry\([^,]+, entityCode, /);
    expect(src).not.toMatch(/'DEMO'/);
  });

  it('MobileApprovalInboxCapture (P2) is hook-converted', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/mobile/MobileApprovalInboxCapture.tsx'), 'utf8');
    expect(src).not.toMatch(/function getActiveEntityCode/);
    expect(src).not.toMatch(/getItem\(['"]active_entity_code/);
    expect(src).toMatch(/const \{ entityCode \} = useEntityCode\(\);/);
    expect(src).toMatch(/listPendingMirrors\(entityCode\)/);
  });
});
