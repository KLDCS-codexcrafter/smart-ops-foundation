/**
 * DistributorVisitCapture.tsx — Portal · log a visit to a sub-dealer
 * Sprint 11a. Route: /erp/distributor/crm/visit/new
 * Indigo-600 accent. Mobile-first responsive. Append-only.
 * [JWT] POST /api/distributor/visits
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MapPin, CheckCircle2, AlertCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { getDistributorSession } from '@/lib/distributor-auth-engine';
import { getDescendants } from '@/lib/hierarchy-engine';
import { hierarchyNodesKey, type HierarchyNode } from '@/types/distributor-hierarchy';

const DEFAULT_CHECK_IN_RADIUS_METERS = 500;

interface VisitLog {
  id: string;
  date: string;
  check_in_at: string;
  check_out_at: string | null;
  customer_id: string;
  customer_name: string;
  salesman_person_id: string;
  purpose: string;
  outcome: string;
  remarks: string;
  latitude: number | null;
  longitude: number | null;
  within_radius: boolean | null;
  linked_enquiry_id: string | null;
  source: 'distributor_portal';
  created_at: string;
}

interface CustomerLite {
  id: string; partyName: string; latitude?: number | null; longitude?: number | null;
}

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function DistributorVisitCapturePanel() { return <DistributorVisitCapture />; }

export default function DistributorVisitCapture() {
  const navigate = useNavigate();
  const session = getDistributorSession();
  const [customerId, setCustomerId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [outcome, setOutcome] = useState('');
  const [remarks, setRemarks] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [withinRadius, setWithinRadius] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  const allNodes = useMemo<HierarchyNode[]>(
    () => session ? ls<HierarchyNode>(hierarchyNodesKey(session.entity_code)) : [],
    [session],
  );
  const myNode = useMemo(
    () => session?.hierarchy_node_id ? allNodes.find(n => n.id === session.hierarchy_node_id) ?? null : null,
    [session, allNodes],
  );
  const downstreamCustomers = useMemo<CustomerLite[]>(() => {
    if (!myNode) return [];
    const downIds = new Set(getDescendants(myNode.id, allNodes).map(n => n.customer_id));
    const all = ls<CustomerLite>('erp_group_customer_master');
    return all.filter(c => downIds.has(c.id));
  }, [myNode, allNodes]);

  const selectedCust = downstreamCustomers.find(c => c.id === customerId) ?? null;

  const handleCheckIn = async () => {
    if (!customerId) { toast.error('Pick a sub-dealer first'); return; }
    setChecking(true);
    try {
      if (!('geolocation' in navigator)) {
        toast.warning('Geolocation unavailable — saving without radius check');
        setWithinRadius(null);
        return;
      }
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setCoords({ lat, lng });
            if (selectedCust?.latitude != null && selectedCust?.longitude != null) {
              const d = distanceMeters(lat, lng, selectedCust.latitude, selectedCust.longitude);
              setWithinRadius(d <= DEFAULT_CHECK_IN_RADIUS_METERS);
            } else {
              setWithinRadius(null);
            }
            resolve();
          },
          err => reject(err),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
      toast.success('Checked in');
    } catch {
      toast.error('Could not get location');
    } finally {
      setChecking(false);
    }
  };

  const handleSave = () => {
    if (!session) return;
    if (!customerId || !selectedCust) { toast.error('Select a sub-dealer'); return; }
    if (!purpose.trim()) { toast.error('Purpose required'); return; }
    setSaving(true);
    try {
      const now = new Date();
      const visit: VisitLog = {
        id: 'vl-' + Math.random().toString(36).slice(2, 10),
        date: now.toISOString().slice(0, 10),
        check_in_at: now.toISOString(),
        check_out_at: now.toISOString(),
        customer_id: selectedCust.id,
        customer_name: selectedCust.partyName,
        salesman_person_id: session.distributor_id,
        purpose: purpose.trim(),
        outcome: outcome.trim(),
        remarks: remarks.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        within_radius: withinRadius,
        linked_enquiry_id: null,
        source: 'distributor_portal',
        created_at: now.toISOString(),
      };
      const key = `erp_visit_logs_${session.entity_code}`;
      // [JWT] POST /api/distributor/visits
      const all = ls<VisitLog>(key);
      all.push(visit);
      localStorage.setItem(key, JSON.stringify(all));
      toast.success('Visit logged');
      navigate('/erp/distributor/crm');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  useCtrlS(handleSave);

  if (!session) return null;

  return (
    <DistributorLayout title="Log Visit" subtitle="Capture a visit to a sub-dealer">
      <div className="p-4 lg:p-6 max-w-2xl mx-auto" data-keyboard-form>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-600" />Visit Capture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Sub-Dealer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick a downstream customer" /></SelectTrigger>
                <SelectContent>
                  {downstreamCustomers.length === 0
                    ? <div className="text-xs text-muted-foreground p-3">No downstream customers</div>
                    : downstreamCustomers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckIn}
                disabled={checking || !customerId}
                className="border-indigo-600/40 text-indigo-700 hover:bg-indigo-600/10"
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
                Check In
              </Button>
              {coords && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              )}
              {withinRadius === true && (
                <span className="text-[10px] inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />Within {DEFAULT_CHECK_IN_RADIUS_METERS}m
                </span>
              )}
              {withinRadius === false && (
                <span className="text-[10px] inline-flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3 w-3" />Outside radius
                </span>
              )}
            </div>

            <div>
              <Label className="text-xs">Purpose</Label>
              <Input
                className="h-9 text-xs"
                value={purpose}
                onKeyDown={onEnterNext}
                onChange={e => setPurpose(e.target.value)}
                placeholder="Order pickup / collection / training"
              />
            </div>

            <div>
              <Label className="text-xs">Outcome</Label>
              <Input
                className="h-9 text-xs"
                value={outcome}
                onKeyDown={onEnterNext}
                onChange={e => setOutcome(e.target.value)}
                placeholder="What was achieved?"
              />
            </div>

            <div>
              <Label className="text-xs">Remarks</Label>
              <Textarea
                className="text-xs"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Notes for the next visit"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate('/erp/distributor/crm')}>
                Cancel
              </Button>
              <Button
                data-primary
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                Save Visit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DistributorLayout>
  );
}
