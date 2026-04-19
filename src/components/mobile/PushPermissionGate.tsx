/**
 * PushPermissionGate.tsx — Asks for push permission on first login.
 * Stores user's answer so we don't prompt again.
 * Top-1%: explains WHY we need permission before system dialog.
 */

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { isNative } from '@/lib/platform-engine';
import { requestPushPermission, registerForPush } from '@/lib/push-notification-bridge';

const DECIDED_KEY = 'opx_push_permission_decided';

export function PushPermissionGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNative()) return;
    try {
      // [JWT] n/a — local preference
      const decided = localStorage.getItem(DECIDED_KEY);
      if (!decided) setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const allow = async () => {
    const result = await requestPushPermission();
    if (result.granted) await registerForPush();
    try {
      localStorage.setItem(DECIDED_KEY, result.granted ? 'granted' : 'denied');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const skip = () => {
    try {
      localStorage.setItem(DECIDED_KEY, 'skipped');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Stay in the loop
          </DialogTitle>
          <DialogDescription>
            Get real-time alerts when your orders are confirmed, shipped,
            or delivered. You can change this anytime in device settings.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={skip} className="gap-1">
            <BellOff className="h-4 w-4" /> Maybe later
          </Button>
          <Button onClick={allow} className="gap-1">
            <Bell className="h-4 w-4" /> Allow notifications
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PushPermissionGate;
