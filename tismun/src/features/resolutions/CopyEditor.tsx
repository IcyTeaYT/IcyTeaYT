import { AlertTriangle, Check, Loader2, PencilLine, Plus, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  copyClauses,
  newCopy,
  operativeNumber,
  type ClauseKind,
  type Copy,
  type CopyClause,
  type CopyOp,
  type ResolutionText,
  type TopicNo,
} from '@/lib/resolution';
import { ClauseBody, DiffText, WholeClause } from './ResolutionDocument';
import type { Workspace } from './useResolutions';

/**
 * A copy of the resolution, edited clause by clause.
 *
 * Tap a clause to change its words; it saves as you type. Whoever is typing in
 * a clause holds it, so two delegates on the same copy never overwrite each
 * other — the other sees "India is editing" and the words appear as they land.
 */

const SAVE_AFTER_MS = 700;
/** Re-claim a clause this often while it stays open, so the hold never lapses mid-thought. */
const HOLD_EVERY_MS = 8000;

const newClauseId = (): string =>
  `n-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

export function useCopyActions(ws: Workspace, topic: TopicNo, copy: Copy) {
  const copyId = useRef<string | null>(copy.id || null);
  const draftId = useRef<string | undefined>(copy.draftId);
  const newDraft = useRef<boolean>(copy.newDraft === true);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    copyId.current = copy.id || null;
    draftId.current = copy.draftId;
    newDraft.current = copy.newDraft === true;
  }, [copy.id, copy.draftId, copy.newDraft]);

  /** Changes go out one after another, so the first one can create the copy. */
  const send = useCallback(
    (ops: CopyOp[]) => {
      const run = queue.current.then(async () => {
        const result = await ws.act({
          action: 'edit',
          topic,
          copyId: copyId.current,
          ops,
          ...(draftId.current ? { draftId: draftId.current } : {}),
          ...(newDraft.current ? { newDraft: true } : {}),
        });
        if (result.copy) copyId.current = result.copy.id;
        return result;
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [ws, topic],
  );
  return { send, copyId };
}

export function CopyEditor({
  ws,
  topic,
  copy,
  current,
  readOnly,
  onError,
}: {
  ws: Workspace;
  topic: TopicNo;
  copy: Copy;
  current: ResolutionText;
  readOnly: boolean;
  onError: (message: string) => void;
}) {
  const { send } = useCopyActions(ws, topic, copy);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const lastSent = useRef(0);
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;
  const textRef = useRef(text);
  textRef.current = text;

  const rows = useMemo(() => copyClauses(copy, current), [copy, current]);
  const now = Date.now() + ws.offset;
  const heldBy = (clauseId: string) => {
    const lock = copy.locks[clauseId];
    return lock && lock.until > now && lock.holder !== ws.me?.key ? lock : null;
  };

  const fail = useCallback(
    (error: unknown) => onError(error instanceof Error ? error.message : 'That did not save. Check your connection.'),
    [onError],
  );

  const flush = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    const clauseId = editingRef.current;
    if (!clauseId || !dirty.current) return;
    dirty.current = false;
    lastSent.current = Date.now();
    setSaving(true);
    try {
      const result = await send([{ op: 'set', clauseId, text: textRef.current }]);
      if (result.refused?.includes(clauseId)) {
        onError('Someone else started editing that clause, so your last words there were not saved.');
        setEditing(null);
      }
    } catch (error) {
      dirty.current = true;
      fail(error);
    } finally {
      setSaving(false);
    }
  }, [send, fail, onError]);

  const change = (value: string) => {
    setText(value);
    dirty.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), SAVE_AFTER_MS);
  };

  // While a clause stays open, keep holding it.
  useEffect(() => {
    if (!editing) return;
    const id = window.setInterval(() => {
      if (Date.now() - lastSent.current < HOLD_EVERY_MS) return;
      lastSent.current = Date.now();
      void send([{ op: 'lock', clauseId: editing }]).catch(() => undefined);
    }, HOLD_EVERY_MS / 2);
    return () => window.clearInterval(id);
  }, [editing, send]);

  // Leaving the page mid-sentence still saves it.
  useEffect(() => () => void flush(), [flush]);

  const open = async (row: CopyClause) => {
    if (readOnly) return;
    const holder = heldBy(row.id);
    if (holder) {
      onError(`${holder.name} (${holder.country}) is editing that clause right now.`);
      return;
    }
    if (editing && editing !== row.id) await close();
    setEditing(row.id);
    setText(row.text ?? row.official ?? '');
    dirty.current = false;
    lastSent.current = Date.now();
    try {
      const result = await send([{ op: 'lock', clauseId: row.id }]);
      if (result.refused?.includes(row.id)) {
        setEditing(null);
        onError('Someone else is editing that clause right now.');
      }
    } catch (error) {
      fail(error);
    }
  };

  const close = async () => {
    const clauseId = editingRef.current;
    await flush();
    setEditing(null);
    if (clauseId) void send([{ op: 'unlock', clauseId }]).catch(() => undefined);
  };

  const run = async (ops: CopyOp[]) => {
    try {
      const result = await send(ops);
      const refused = result.refused ?? [];
      if (refused.length) onError('Someone else is editing that clause right now.');
    } catch (error) {
      fail(error);
    }
  };

  const add = async (kind: ClauseKind, afterId: string | null) => {
    if (editing) await close();
    const clauseId = newClauseId();
    setEditing(clauseId);
    setText('');
    dirty.current = false;
    await run([{ op: 'add', clauseId, clauseKind: kind, afterId, text: '' }]);
  };

  const lastOf = (kind: ClauseKind): string | null => {
    const ofKind = rows.filter((row) => row.kind === kind);
    return ofKind[ofKind.length - 1]?.id ?? null;
  };

  const renderSection = (kind: ClauseKind) => {
    const section = rows.filter((row) => row.kind === kind);
    return (
      <section className="space-y-2.5">
        <p className="label-micro">{kind === 'preamble' ? 'Preambulatory clauses' : 'Operative clauses'}</p>
        {section.length === 0 ? (
          <p className="rounded-card border border-dashed border-hairline px-4 py-4 text-sm text-muted">
            {kind === 'preamble' ? 'No preambulatory clauses yet.' : 'No operative clauses yet.'}
          </p>
        ) : null}
        {section.map((row) => (
          <ClauseRow
            key={row.id}
            row={row}
            number={row.kind === 'operative' ? operativeNumber(current.clauses, row.id) : null}
            editing={editing === row.id}
            text={text}
            saving={saving && editing === row.id}
            holder={heldBy(row.id)}
            readOnly={readOnly}
            onOpen={() => void open(row)}
            onChange={change}
            onDone={() => void close()}
            onRemove={() => {
              if (editing === row.id) setEditing(null);
              void run([{ op: 'remove', clauseId: row.id }]);
            }}
            onUndo={() => {
              if (editing === row.id) setEditing(null);
              void run([{ op: 'revert', clauseId: row.id }]);
            }}
            onKeepMine={() => void run([{ op: 'rebase', clauseId: row.id }])}
            onAddAfter={() => void add(row.kind, row.id)}
          />
        ))}
        {!readOnly ? (
          <button
            type="button"
            onClick={() => void add(kind, lastOf(kind))}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-teal-200 px-4 py-3 text-sm font-medium text-teal-700 transition-colors duration-200 hover:border-teal-300 hover:bg-teal-50/50"
          >
            <Plus size={15} strokeWidth={1.75} />
            Add {kind === 'preamble' ? 'a preambulatory' : 'an operative'} clause
          </button>
        ) : null}
      </section>
    );
  };

  return (
    <div className="space-y-7" lang={current.language}>
      {renderSection('preamble')}
      {renderSection('operative')}
    </div>
  );
}

function ClauseRow({
  row,
  number,
  editing,
  text,
  saving,
  holder,
  readOnly,
  onOpen,
  onChange,
  onDone,
  onRemove,
  onUndo,
  onKeepMine,
  onAddAfter,
}: {
  row: CopyClause;
  number: number | null;
  editing: boolean;
  text: string;
  saving: boolean;
  holder: { name: string; country: string } | null;
  readOnly: boolean;
  onOpen: () => void;
  onChange: (value: string) => void;
  onDone: () => void;
  onRemove: () => void;
  onUndo: () => void;
  onKeepMine: () => void;
  onAddAfter: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Grow with the text, so a long clause never scrolls inside a tiny box.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [text, editing]);

  useEffect(() => {
    if (editing) textarea.current?.focus();
  }, [editing]);

  const tone =
    row.status === 'added'
      ? 'border-success-border bg-success-soft/30'
      : row.status === 'removed'
        ? 'border-danger-border bg-danger-soft/30'
        : row.status === 'changed'
          ? 'border-teal-200 bg-teal-50/30'
          : 'border-hairline bg-surface';

  const label =
    row.status === 'added'
      ? `New ${row.kind === 'operative' ? 'operative' : 'preambulatory'} clause`
      : row.kind === 'operative'
        ? number
          ? `Clause ${number}`
          : 'Clause'
        : null;

  return (
    <div className={cn('rounded-card border px-4 py-3.5 transition-colors duration-200', tone, editing && 'border-teal-400 ring-2 ring-teal-100')}>
      <div className="mb-1.5 flex min-h-[20px] flex-wrap items-center gap-2 text-xs">
        {label ? <span className="font-semibold text-teal-700">{label}</span> : null}
        {row.status === 'changed' ? <span className="font-medium text-teal-700">{label ? '· ' : ''}Changed</span> : null}
        {row.status === 'removed' ? <span className="font-medium text-danger">{label ? '· ' : ''}Removed</span> : null}
        {holder ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning">
            <PencilLine size={11} strokeWidth={2} />
            {holder.name} ({holder.country}) is editing
          </span>
        ) : null}
        {editing ? (
          <span className="ml-auto inline-flex items-center gap-1 text-muted">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2} />}
            {saving ? 'Saving' : 'Saved'}
          </span>
        ) : null}
      </div>

      {row.stale ? (
        <div className="mb-2.5 rounded-control border border-warning-border bg-warning-soft px-3 py-2.5 text-xs text-warning">
          <p className="flex items-start gap-1.5 font-medium">
            <AlertTriangle size={13} strokeWidth={1.75} className="mt-px shrink-0" />
            {row.stale === 'gone'
              ? 'The committee has removed this clause since you edited it.'
              : 'The committee changed this clause since you edited it.'}
          </p>
          {!readOnly ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {row.stale === 'changed' ? (
                <Button size="sm" variant="secondary" onClick={onKeepMine}>
                  Keep my version
                </Button>
              ) : null}
              <Button size="sm" variant="secondary" onClick={onUndo}>
                {row.stale === 'gone' ? 'Drop my change' : 'Use the new wording'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <>
          <textarea
            ref={textarea}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            spellCheck
            aria-label={label ?? 'Clause'}
            className="block w-full resize-none rounded-control border border-hairline bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink-900 outline-none focus:border-teal-400"
            placeholder={row.kind === 'operative' ? 'e.g. Encourages member states to…' : 'e.g. Recognising that…'}
          />
          <p className="mt-1.5 text-xs text-muted">
            Sub-clauses go on their own lines: “a. …”, “b. …”.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" onClick={onDone}>
              <Check size={15} strokeWidth={2} />
              Done
            </Button>
            <Button variant="ghost" size="sm" onClick={onAddAfter}>
              <Plus size={14} strokeWidth={1.75} />
              Add a new clause after this one
            </Button>
            {row.status === 'added' ? (
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 size={14} strokeWidth={1.75} />
                Delete this clause
              </Button>
            ) : (
              <>
                {row.status !== 'same' ? (
                  <Button variant="ghost" size="sm" onClick={onUndo}>
                    <RotateCcw size={14} strokeWidth={1.75} />
                    Undo my changes
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={onRemove}>
                  <Trash2 size={14} strokeWidth={1.75} />
                  Remove this clause
                </Button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onOpen}
            disabled={readOnly || Boolean(holder) || row.status === 'removed'}
            className="block w-full rounded-control text-left text-[15px] text-ink-900 disabled:cursor-default"
            aria-label={readOnly ? undefined : `Change ${label ?? 'this clause'}`}
          >
            {row.status === 'same' ? (
              <ClauseBody clause={{ kind: row.kind, text: row.text ?? '' }} />
            ) : row.status === 'removed' ? (
              <WholeClause text={row.official ?? row.edit?.baseText ?? ''} mode="removed" />
            ) : row.status === 'added' ? (
              row.text ? (
                <WholeClause text={row.text} mode="added" />
              ) : (
                <span className="text-sm italic text-muted">Empty — tap to write it</span>
              )
            ) : (
              <DiffText before={row.official ?? row.edit?.baseText ?? ''} after={row.text ?? ''} />
            )}
          </button>
          {!readOnly ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {row.status === 'removed' ? (
                <Button variant="secondary" onClick={onUndo}>
                  <Undo2 size={15} strokeWidth={1.75} />
                  Bring it back
                </Button>
              ) : (
                <Button variant="secondary" onClick={onOpen} disabled={Boolean(holder)}>
                  <PencilLine size={15} strokeWidth={1.75} />
                  {row.status === 'same' ? 'Change this' : 'Edit'}
                </Button>
              )}
              {row.status === 'changed' || row.status === 'added' ? (
                <Button variant="ghost" onClick={row.status === 'added' ? onRemove : onUndo}>
                  <RotateCcw size={15} strokeWidth={1.75} />
                  {row.status === 'added' ? 'Delete it' : 'Undo'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/** This country's own copy, before it has been saved for the first time. */
export const virtualCopy = (topic: TopicNo, country: string, epoch: number): Copy => newCopy('', topic, country, epoch, 0);
