/**
 * @file     src/pages/prudent360/Prudent360HubPage.tsx
 * @sprint   PRUDENT360 · T-P360-DevTeam-Hub
 * @purpose  Internal dev-team command hub — Screen Directory + Sprint Roadmap +
 *           System Preview + Dev-Surface quick-access + Docs · ccc-modeled
 *           (searchable left sidebar · right panel area).
 * @audience OUR dev team only. Behind the app shell. No external auth.
 */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Star, Clock, LayoutGrid, GitBranch, Activity, Wrench,
  BookOpen, ExternalLink, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  buildScreenDirectory, searchScreenDirectory, buildSprintRoadmap,
  buildSystemPreview, getDevSurfaceLinks,
  getFavorites, isFavorite, toggleFavorite,
  getRecent, recordRecent,
} from '@/lib/prudent360-engine';
import type { P360Section, ScreenDirEntry } from '@/types/prudent360';

const SECTIONS: Array<{ id: P360Section; label: string; icon: typeof LayoutGrid }> = [
  { id: 'screen-directory', label: 'Screen Directory', icon: LayoutGrid },
  { id: 'sprint-roadmap',   label: 'Sprint Roadmap',   icon: GitBranch },
  { id: 'system-preview',   label: 'System Preview',   icon: Activity },
  { id: 'dev-surfaces',     label: 'Dev Surfaces',     icon: Wrench },
  { id: 'docs',             label: 'Docs',             icon: BookOpen },
];

export default function Prudent360HubPage(): JSX.Element {
  const navigate = useNavigate();
  const [section, setSection] = useState<P360Section>('screen-directory');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [favTick, setFavTick] = useState(0);
  const [recents, setRecents] = useState(() => getRecent());

  useEffect(() => { setRecents(getRecent()); }, [favTick]);

  const directory = useMemo(() => buildScreenDirectory(), []);
  const roadmap = useMemo(() => buildSprintRoadmap(), []);
  const preview = useMemo(() => buildSystemPreview(), []);
  const devLinks = useMemo(() => getDevSurfaceLinks(), []);
  const filtered = useMemo(() => searchScreenDirectory(query, directory), [query, directory]);

  function go(entry: ScreenDirEntry | { id: string; label: string; route: string }) {
    if (!entry.route) return;
    recordRecent({ id: entry.id, label: entry.label, route: entry.route });
    setFavTick((t) => t + 1);
    if (entry.route.startsWith('/')) navigate(entry.route);
  }

  function toggleFav(entry: ScreenDirEntry) {
    if (!entry.route) return;
    toggleFavorite({ id: entry.id, label: entry.label, route: entry.route });
    setFavTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`border-r border-border bg-card/40 transition-all ${
          collapsed ? 'w-14' : 'w-64'
        } flex flex-col`}
      >
        <div className="flex items-center justify-between p-3 border-b border-border">
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">Prudent360</p>
              <p className="text-xs text-muted-foreground">Dev-Team Hub</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{s.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/welcome')}
          >
            {collapsed ? '←' : '← Back to Welcome'}
          </Button>
        </div>
      </aside>

      {/* ── Main Panel ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-card/30 backdrop-blur-xl px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">
                {SECTIONS.find((s) => s.id === section)?.label}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dev-team console · internal reference. Live health metrics arrive with Wave-2.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">INTERNAL</Badge>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 animate-fade-in">
            {section === 'screen-directory' && (
              <ScreenDirectoryPanel
                entries={filtered}
                total={directory.length}
                query={query}
                onQueryChange={setQuery}
                onGo={go}
                onFav={toggleFav}
                favTick={favTick}
                recents={recents}
              />
            )}
            {section === 'sprint-roadmap'  && <SprintRoadmapPanel rows={roadmap} />}
            {section === 'system-preview'  && <SystemPreviewPanel stats={preview} />}
            {section === 'dev-surfaces'    && <DevSurfacesPanel links={devLinks} onGo={go} />}
            {section === 'docs'            && <DocsPanel roadmap={roadmap} />}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

// ── Screen Directory Panel ───────────────────────────────────────────────
function ScreenDirectoryPanel(props: {
  entries: ScreenDirEntry[];
  total: number;
  query: string;
  onQueryChange: (q: string) => void;
  onGo: (e: ScreenDirEntry) => void;
  onFav: (e: ScreenDirEntry) => void;
  favTick: number;
  recents: ReturnType<typeof getRecent>;
}): JSX.Element {
  const { entries, total, query, onQueryChange, onGo, onFav, favTick, recents } = props;
  // favTick intentionally drives re-render so we re-read favorites; getFavorites is cheap.
  void favTick;
  const favs = getFavorites();
  const grouped = useMemo(() => {
    const g: Record<string, ScreenDirEntry[]> = {};
    for (const e of entries) {
      (g[e.card] ??= []).push(e);
    }
    return g;
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search screens · cards · groups · routes"
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {entries.length} / {total}
        </Badge>
      </div>

      {(favs.length > 0 || recents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {favs.length > 0 && (
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                <Star className="h-3.5 w-3.5 text-warning" /> Favorites
              </div>
              <div className="space-y-1">
                {favs.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onGo({ id: f.id, label: f.label, route: f.route, card: 'fav', source: 'route-group' })}
                    className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-muted/40"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recents.length > 0 && (
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold mb-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Recently visited
              </div>
              <div className="space-y-1">
                {recents.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onGo({ id: r.id, label: r.label, route: r.route, card: 'recent', source: 'route-group' })}
                    className="block w-full text-left text-xs px-2 py-1 rounded hover:bg-muted/40"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">
          No screens match "{query}".
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([card, items]) => (
            <section key={card} className="rounded-lg border border-border bg-card/30">
              <header className="px-3 py-2 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize">{card.replace(/-/g, ' ')}</h3>
                <Badge variant="outline" className="font-mono text-xs">{items.length}</Badge>
              </header>
              <ul className="divide-y divide-border">
                {items.map((e) => {
                  const fav = isFavorite(e.id);
                  return (
                    <li key={e.id} className="px-3 py-1.5 flex items-center gap-2 hover:bg-muted/30">
                      <button
                        onClick={() => onFav(e)}
                        className="text-muted-foreground hover:text-warning"
                        aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                      >
                        <Star className={`h-3.5 w-3.5 ${fav ? 'fill-warning text-warning' : ''}`} />
                      </button>
                      <button
                        onClick={() => onGo(e)}
                        disabled={!e.route}
                        className="flex-1 text-left text-sm disabled:opacity-50"
                      >
                        <span className="truncate">{e.label}</span>
                        {e.group && (
                          <span className="ml-2 text-xs text-muted-foreground">· {e.group}</span>
                        )}
                      </button>
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[40%]">
                        {e.route ?? '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sprint Roadmap Panel ─────────────────────────────────────────────────
function SprintRoadmapPanel({ rows }: { rows: ReturnType<typeof buildSprintRoadmap> }): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card/30">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sprint Roadmap · newest-first</h3>
        <Badge variant="outline" className="font-mono text-xs">{rows.length}</Badge>
      </header>
      <ul className="divide-y divide-border">
        {rows.map((r, i) => (
          <li key={`${r.sprintNumber}-${i}`} className="px-3 py-2 flex items-center gap-3 text-sm">
            <span className="font-mono text-xs w-12 text-muted-foreground">#{String(r.sprintNumber)}</span>
            <span className="flex-1 truncate">{r.code}</span>
            <span className="text-xs">
              {r.grade ?? '—'} {r.starred && <Star className="inline h-3 w-3 text-warning fill-warning" />}
            </span>
            <span className="font-mono text-xs text-muted-foreground w-24 text-right">
              {r.inFlight ? <em className="text-warning not-italic">in-flight</em> : (r.headSha ?? '—')}
            </span>
            <span className="font-mono text-xs text-muted-foreground w-24 text-right">
              {r.bankDate ?? '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── System Preview Panel ─────────────────────────────────────────────────
function SystemPreviewPanel({ stats }: { stats: ReturnType<typeof buildSystemPreview> }): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-lg border p-3 ${
            s.deferred
              ? 'border-dashed border-warning/40 bg-warning/5'
              : 'border-border bg-card/30'
          }`}
        >
          <p className="text-xs text-muted-foreground">{s.label}</p>
          <p className="text-lg font-bold font-mono mt-1">{s.value}</p>
          {s.deferred && (
            <p className="text-[11px] text-warning mt-1">Wave-2 · honest deferred</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Dev Surfaces Panel ───────────────────────────────────────────────────
function DevSurfacesPanel(props: {
  links: ReturnType<typeof getDevSurfaceLinks>;
  onGo: (e: { id: string; label: string; route: string }) => void;
}): JSX.Element {
  const { links, onGo } = props;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {links.map((l) => (
        <button
          key={l.id}
          onClick={() => onGo({ id: `dev:${l.id}`, label: l.label, route: l.route })}
          className="text-left rounded-lg border border-border bg-card/30 p-4 hover:bg-card/60 transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold">{l.label}</h4>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{l.description}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-2">{l.route}</p>
        </button>
      ))}
    </div>
  );
}

// ── Docs Panel ───────────────────────────────────────────────────────────
function DocsPanel({ roadmap }: { roadmap: ReturnType<typeof buildSprintRoadmap> }): JSX.Element {
  const recent = roadmap.slice(0, 6);
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card/30 p-4">
        <h3 className="text-sm font-semibold mb-2">What's New</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Derived from sprint-history · most recent banks.
        </p>
        <ul className="space-y-1 text-sm">
          {recent.map((r, i) => (
            <li key={`${r.sprintNumber}-${i}`} className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground w-12">#{String(r.sprintNumber)}</span>
              <span className="flex-1 truncate">{r.code}</span>
              <span className="text-xs text-muted-foreground">{r.bankDate ?? '—'}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-4">
        <h3 className="text-sm font-semibold mb-1">Developer Hub</h3>
        <p className="text-xs text-warning">
          Full inline docs arrive with Wave-2. Until then, refer to README.md and docs/ARCHITECTURE.md
          in the repository root.
        </p>
      </div>
    </div>
  );
}
