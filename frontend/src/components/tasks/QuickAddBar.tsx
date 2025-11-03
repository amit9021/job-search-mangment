import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  TaskQuickParseResult,
  TaskQuickParseSuggestion,
  useTaskCreateMutation,
  useTaskQuickParseMutation
} from '../../api/hooks';

export type QuickAddBarHandle = {
  focus: () => void;
};

interface QuickAddBarProps {
  onCreated?: () => void;
}

type PendingParse = {
  result: TaskQuickParseResult;
  selections: Record<string, string | null>;
};

export const QuickAddBar = forwardRef<QuickAddBarHandle, QuickAddBarProps>(({ onCreated }, ref) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState<PendingParse | null>(null);
  const quickParse = useTaskQuickParseMutation();
  const createTask = useTaskCreateMutation();

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }));

  const resetInput = () => {
    setValue('');
    setPending(null);
    onCreated?.();
  };

  const buildPayload = (parsed: TaskQuickParseResult, selections?: Record<string, string | null>) => {
    const payload: Record<string, unknown> = {
      title: parsed.title,
      tags: parsed.tags ?? []
    };

    if (parsed.priority) {
      payload.priority = parsed.priority;
    }
    if (parsed.dueAt) {
      payload.dueAt = parsed.dueAt;
    }
    if (parsed.recurrence) {
      payload.recurrence = parsed.recurrence;
    }

    const links: Record<string, string> = {};
    Object.entries(parsed.links ?? {}).forEach(([key, val]) => {
      if (val) {
        links[key] = val;
      }
    });

    if (selections) {
      selections.job && (links.jobId = selections.job);
      selections.contact && (links.contactId = selections.contact);
    }

    if (Object.keys(links).length > 0) {
      payload.links = links;
    }

    return payload;
  };

  const createFromParsed = async (parsed: TaskQuickParseResult, selections?: Record<string, string | null>) => {
    const payload = buildPayload(parsed, selections);
    await createTask.mutateAsync(payload);
    resetInput();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!value.trim() || quickParse.isPending || createTask.isPending) {
      return;
    }

    try {
      const result = await quickParse.mutateAsync({ text: value.trim() });
      if (result.suggestions.length > 0) {
        const defaults: Record<string, string | null> = {};
        result.suggestions.forEach((suggestion) => {
          if (suggestion.matches.length === 1) {
            defaults[suggestion.kind] = suggestion.matches[0].id;
          } else {
            defaults[suggestion.kind] = null;
          }
        });
        setPending({ result, selections: defaults });
      } else {
        await createFromParsed(result);
      }
    } catch {
      // handled by toast
    }
  };

  const updateSelection = (kind: TaskQuickParseSuggestion['kind'], id: string | null) => {
    setPending((prev) =>
      prev
        ? {
            result: prev.result,
            selections: { ...prev.selections, [kind]: id }
          }
        : prev
    );
  };

  const disableInput = quickParse.isPending || createTask.isPending;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='Quick add: "Follow up Dana tomorrow 9 #followup @job:Acme"'
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 outline-none ring-brand/20 transition focus:border-brand focus:ring"
          disabled={disableInput}
        />
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={disableInput || value.trim().length === 0}
        >
          {quickParse.isPending ? 'Parsing…' : 'Add'}
        </button>
      </form>

      {pending && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 text-sm font-semibold text-amber-800">
            Choose context to link this task:
          </div>
          <div className="space-y-4">
            {pending.result.suggestions.map((suggestion) => (
              <div key={suggestion.kind}>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                  {suggestion.kind === 'job' ? 'Job match' : 'Contact match'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestion.matches.map((match) => {
                    const isActive = pending.selections[suggestion.kind] === match.id;
                    return (
                      <button
                        type="button"
                        key={match.id}
                        onClick={() => updateSelection(suggestion.kind, match.id)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          isActive
                            ? 'border-brand bg-white text-brand'
                            : 'border-amber-200 bg-white/70 text-amber-700 hover:border-amber-400'
                        }`}
                      >
                        {match.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => updateSelection(suggestion.kind, null)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      pending.selections[suggestion.kind] === null
                        ? 'border-slate-400 bg-white text-slate-600'
                        : 'border-amber-200 bg-white/50 text-amber-500 hover:border-amber-400'
                    }`}
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => createFromParsed(pending.result, pending.selections)}
              className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:bg-brand/60"
              disabled={createTask.isPending}
            >
              Create task
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="rounded-lg border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

QuickAddBar.displayName = 'QuickAddBar';
