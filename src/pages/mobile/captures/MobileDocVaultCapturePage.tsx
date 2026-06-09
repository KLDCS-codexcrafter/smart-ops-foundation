/**
 * @file        src/pages/mobile/captures/MobileDocVaultCapturePage.tsx
 * @purpose     AM.2 · mobile-gap persona · capture a document with phone camera
 *              CONSUMES docvault-engine.createDocument · MANUAL metadata
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 2
 * @canon       NO reimplement · NO OCR · manual fields only
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createDocument } from '@/lib/docvault-engine';
import { CameraCapture } from '@/components/mobile/CameraCapture';

const E = 'DEMO';
const USER = 'mobile_user';

export default function MobileDocVaultCapturePage(): JSX.Element {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('invoice');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function handleSubmit(): void {
    if (!title.trim() || !photoUrl) {
      toast.error('Title and photo are required');
      return;
    }
    try {
      const docInput = {
        entity_id: E,
        document_type: docType,
        title,
        tags: {},
        originating_department_id: 'mobile',
      };
      const versionInput = {
        version_no: '1',
        file_url: photoUrl,
        file_size_bytes: photoUrl.length,
        uploaded_at: new Date().toISOString(),
        uploaded_by: USER,
      };
      const doc = createDocument(
        E,
        docInput as unknown as Parameters<typeof createDocument>[1],
        versionInput as unknown as Parameters<typeof createDocument>[2],
        USER,
      );
      toast.success(`Document ${doc.id} captured`);
      navigate('/operix-go');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-md mx-auto space-y-4">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">DocVault · Mobile Capture</h1>
      </header>

      <Card className="p-3 text-xs text-muted-foreground">
        Consumes <code className="font-mono">docvault-engine.createDocument</code> · MANUAL metadata only.
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Document type</Label>
          <Input value={docType} onChange={(e) => setDocType(e.target.value)} />
        </div>
      </Card>

      <CameraCapture label="Document photo" onPhotoAttached={setPhotoUrl} />

      <Button className="w-full" disabled={!title.trim() || !photoUrl} onClick={handleSubmit}>
        <FileUp className="h-4 w-4 mr-1" /> Capture document
      </Button>
    </div>
  );
}
