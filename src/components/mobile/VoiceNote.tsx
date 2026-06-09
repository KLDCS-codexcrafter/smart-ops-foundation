/**
 * @file        src/components/mobile/VoiceNote.tsx
 * @purpose     AM.2 · capture SHELL · record audio → attach as a note
 *              NO transcription · NO fabricated text · Wave-2 transcribe-seam
 * @sprint      AM.2 · T-AM2-Mobile-Captures · Pass 1
 * @canon       Tier-L · voice-to-text arrives with Wave-2
 *              [JWT] Wave-2: POST /api/ai/transcribe
 */
import { useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export const VOICE_NOTE_HONESTY =
  'Voice-to-text arrives with Wave-2 — the recording is attached as an audio note for now.';

export interface VoiceNoteProps {
  label?: string;
  onAudioAttached?: (audioBlobUrl: string | null) => void;
}

export function VoiceNote({
  label = 'Voice note',
  onAudioAttached,
}: VoiceNoteProps): JSX.Element {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function handleStart(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev: BlobEvent) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onAudioAttached?.(url);
        stream.getTracks().forEach((t) => t.stop());
        // [JWT] Wave-2: POST /api/ai/transcribe { audio: blob }
        // NO client transcription — Tier-L attaches the raw clip only.
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error('Microphone unavailable on this device');
    }
  }

  function handleStop(): void {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function handleClear(): void {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    onAudioAttached?.(null);
  }

  return (
    <Card className="p-3 space-y-2 glass-card rounded-2xl">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold flex items-center gap-1">
          <Mic className="h-3.5 w-3.5 text-primary" />
          {label}
        </Label>
        {audioUrl && (
          <Button variant="ghost" size="sm" onClick={handleClear} aria-label="Remove audio">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {recording ? (
        <Button variant="destructive" className="w-full" onClick={handleStop}>
          <Square className="h-4 w-4 mr-2" />
          Stop recording
        </Button>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => void handleStart()}>
          <Mic className="h-4 w-4 mr-2" />
          {audioUrl ? 'Re-record' : 'Start recording'}
        </Button>
      )}

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full" />
      )}

      <p className="text-[11px] text-muted-foreground italic">
        {VOICE_NOTE_HONESTY}
      </p>
    </Card>
  );
}

export default VoiceNote;
