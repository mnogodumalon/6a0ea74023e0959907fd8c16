import { useDashboardData } from '@/hooks/useDashboardData';
import type { HalloWelt } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { HalloWeltDialog } from '@/components/dialogs/HalloWeltDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle,
  IconTool,
  IconRefresh,
  IconCheck,
  IconPlus,
  IconPencil,
  IconTrash,
  IconSearch,
  IconUsers,
  IconMessageCircle,
  IconUser,
  IconInbox,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a0ea74023e0959907fd8c16';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const { halloWelt, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<HalloWelt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HalloWelt | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return halloWelt;
    return halloWelt.filter(
      (e) =>
        e.fields.vorname?.toLowerCase().includes(q) ||
        e.fields.nachname?.toLowerCase().includes(q) ||
        e.fields.nachricht?.toLowerCase().includes(q)
    );
  }, [halloWelt, search]);

  const withNachricht = useMemo(
    () => halloWelt.filter((e) => e.fields.nachricht?.trim()),
    [halloWelt]
  );

  const handleCreate = async (fields: HalloWelt['fields']) => {
    await LivingAppsService.createHalloWeltEntry(fields);
    fetchAll();
  };

  const handleEdit = async (fields: HalloWelt['fields']) => {
    if (!editRecord) return;
    await LivingAppsService.updateHalloWeltEntry(editRecord.record_id, fields);
    fetchAll();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteHalloWeltEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const openEdit = (entry: HalloWelt) => {
    setEditRecord(entry);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gästebuch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nachrichten und Einträge verwalten
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neuer Eintrag
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          title="Einträge gesamt"
          value={String(halloWelt.length)}
          description="Alle Gästebucheinträge"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit Nachricht"
          value={String(withNachricht.length)}
          description="Einträge mit Text"
          icon={<IconMessageCircle size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ohne Nachricht"
          value={String(halloWelt.length - withNachricht.length)}
          description="Nur Name eingetragen"
          icon={<IconUser size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0"
        />
        <Input
          placeholder="Einträge durchsuchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Entry Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <IconInbox size={48} className="text-muted-foreground" stroke={1.5} />
          <div>
            <p className="font-medium text-foreground">
              {search ? 'Keine Treffer' : 'Noch keine Einträge'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? 'Probiere einen anderen Suchbegriff.'
                : 'Erstelle den ersten Gästebucheintrag.'}
            </p>
          </div>
          {!search && (
            <Button onClick={openCreate} variant="outline" size="sm">
              <IconPlus size={14} className="mr-1" />
              Eintrag erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <EntryCard
              key={entry.record_id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => setDeleteTarget(entry)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <HalloWeltDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditRecord(null);
        }}
        onSubmit={editRecord ? handleEdit : handleCreate}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['HalloWelt']}
        enablePhotoLocation={AI_PHOTO_LOCATION['HalloWelt']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={
          deleteTarget
            ? `Soll der Eintrag von ${deleteTarget.fields.vorname ?? ''} ${deleteTarget.fields.nachname ?? ''} wirklich gelöscht werden?`
            : ''
        }
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: HalloWelt;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials =
    ((entry.fields.vorname?.[0] ?? '') + (entry.fields.nachname?.[0] ?? '')).toUpperCase() || '?';

  const fullName = [entry.fields.vorname, entry.fields.nachname].filter(Boolean).join(' ') || 'Unbekannt';

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 min-w-0">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-primary">{initials}</span>
        </div>
        {/* Name */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{fullName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {entry.fields.vorname && entry.fields.nachname
              ? `${entry.fields.vorname} ${entry.fields.nachname}`
              : entry.fields.vorname || entry.fields.nachname || '—'}
          </p>
        </div>
        {/* Actions — always visible */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <IconPencil size={15} className="shrink-0" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Löschen"
          >
            <IconTrash size={15} className="shrink-0" />
          </button>
        </div>
      </div>

      {/* Nachricht */}
      {entry.fields.nachricht ? (
        <div className="bg-muted/50 rounded-xl px-3 py-2">
          <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap">
            {entry.fields.nachricht}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Keine Nachricht hinterlassen</p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Das Problem wurde behoben. Bitte die Seite neu laden.
          </p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />
          Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>
          Erneut versuchen
        </Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
          ) : (
            <IconTool size={14} className="mr-1" />
          )}
          {repairing ? 'Wird repariert...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && (
        <p className="text-sm text-destructive">
          Automatische Reparatur fehlgeschlagen. Bitte Support kontaktieren.
        </p>
      )}
    </div>
  );
}
