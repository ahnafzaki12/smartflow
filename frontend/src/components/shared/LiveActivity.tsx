import { motion, AnimatePresence } from 'motion/react';
import { Brain, ArrowRight } from 'lucide-react';

interface DecisionEntry {
  id: number;
  time: string;
  intersection: string;
  prev_green: number;
  new_green: number;
  reason: string;
}

interface LiveActivityProps {
  /** Live decisions from /decisions endpoint (Phase 3D).
   * Falls back to empty state gracefully if undefined. */
  decisions?: DecisionEntry[];
}

export function LiveActivity({ decisions = [] }: LiveActivityProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">Keputusan AI</div>
            <div className="text-xs text-muted-foreground">Log optimasi waktu-nyata</div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Langsung
        </span>
      </div>

      {/* Entries */}
      <div className="flex-1 space-y-2 overflow-hidden">
        {decisions.length === 0 ? (
          /* Empty state while decisions accumulate */
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="flex flex-col gap-2 w-full">
              {[0.9, 0.7, 0.8, 0.6].map((w, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Menunggu keputusan AI…
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {decisions.slice(0, 6).map((e) => {
              const diff = e.new_green - e.prev_green;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-3 rounded-xl border border-border bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-800/60 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{e.intersection}</div>
                    <div className="text-xs text-muted-foreground">{e.time}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{e.reason}</div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted-foreground line-through">
                      {e.prev_green}d
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className={`px-2 py-0.5 rounded-md font-medium ${
                      diff >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-sky-50 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'
                    }`}>
                      {e.new_green}d hijau {diff > 0 ? `(+${diff}d)` : diff < 0 ? `(${diff}d)` : ''}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
