import { ArrowRightIcon } from '@radix-ui/react-icons';

export type NextAction = {
  title: string;
  action: string;
  ref?: Record<string, unknown>;
};

export const NextActionCard = ({ action }: { action: NextAction }) => {
  return (
    <div className="flex max-w-sm items-start gap-3 rounded-xl border border-brand/30 bg-white px-4 py-3 shadow-sm">
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-brand">
        <ArrowRightIcon />
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-brand">Next Best Action</p>
        <h3 className="text-sm font-semibold text-slate-900">{action.title}</h3>
        <p className="text-sm text-slate-600">{action.action}</p>
      </div>
    </div>
  );
};
