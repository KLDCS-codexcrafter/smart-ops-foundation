/**
 * @file        src/pages/erp/docvault/registers/FoldersPage.tsx
 * @purpose     S143 · DocVault Control Pt 1 · folder tree CRUD + floor + move
 * @sprint      Sprint 143 · T-TaskFlow-A641.7 · Block 4
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FolderPlus, Trash2, FolderTree } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listFolderTree, createFolder, deleteFolder,
  type FolderTreeNode,
} from '@/lib/docvault-control-engine';
import type { ConfidentialityLevel } from '@/types/docvault';

const CONF_LEVELS: ConfidentialityLevel[] = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];

export default function FoldersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const byUserId = user?.id ?? 'demo-user';
  const [tree, setTree] = useState<FolderTreeNode[]>([]);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [floor, setFloor] = useState<ConfidentialityLevel | ''>('');

  const refresh = useCallback(() => { setTree(listFolderTree(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const flatFolders = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    const walk = (nodes: FolderTreeNode[], prefix: string): void => {
      for (const n of nodes) {
        out.push({ id: n.folder.id, name: `${prefix}${n.folder.name}` });
        walk(n.children, `${prefix}${n.folder.name} / `);
      }
    };
    walk(tree, '');
    return out;
  }, [tree]);

  const onCreate = (): void => {
    if (!name.trim()) { toast.error('Folder name is required'); return; }
    try {
      createFolder(entityCode, {
        name: name.trim(),
        parent_folder_id: parentId || null,
        confidentiality_floor: floor || null,
      }, byUserId);
      toast.success('Folder created');
      setName(''); setParentId(''); setFloor('');
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const onDelete = (id: string): void => {
    deleteFolder(entityCode, id);
    toast.success('Folder deleted');
    refresh();
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Folders</h1>
        <p className="text-sm text-muted-foreground">
          Organise documents into folders. Set a confidentiality floor to block under-classified documents.
        </p>
      </div>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base">New folder</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Statutory · 2026" className="rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label>Parent folder</Label>
              <Select value={parentId || 'root'} onValueChange={(v) => setParentId(v === 'root' ? '' : v)}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Root" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root</SelectItem>
                  {flatFolders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Confidentiality floor</Label>
              <Select value={floor || 'none'} onValueChange={(v) => setFloor(v === 'none' ? '' : (v as ConfidentialityLevel))}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CONF_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={onCreate}><FolderPlus className="h-4 w-4 mr-2" />Create folder</Button>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FolderTree className="h-4 w-4" />Folder tree</CardTitle></CardHeader>
        <CardContent>
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No folders yet.</p>
          ) : (
            <FolderTreeView nodes={tree} onDelete={onDelete} depth={0} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FolderTreeView({
  nodes, onDelete, depth,
}: { nodes: FolderTreeNode[]; onDelete: (id: string) => void; depth: number }): JSX.Element {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.folder.id}>
          <div
            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{n.folder.name}</span>
              {n.folder.confidentiality_floor && (
                <Badge variant="outline" className="text-[10px]">floor: {n.folder.confidentiality_floor}</Badge>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => onDelete(n.folder.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {n.children.length > 0 && (
            <FolderTreeView nodes={n.children} onDelete={onDelete} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}
