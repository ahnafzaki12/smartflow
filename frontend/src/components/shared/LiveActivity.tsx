import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, ArrowRight } from 'lucide-react';
import { AI_DECISION_TEMPLATES } from '@/mocks/metrics';
import type { AiDecisionEntry } from '@/types/metrics';

export function LiveActivity() {
  const [entries, setEntries] = useState<AiDecisionEntry[]>([]);

  useEffect(() => {
    let counter = 0;

    const push = () => {
      const t = AI_DECISION_TEMPLATES[Math.floor(Math.random() * AI_DECISION_TEMPLATES.length)];
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setEntries((prev) =>
        [{ id: counter++, ...t, time }, ...prev].slice(0, 6)
      );
    };

    push(); push(); push();
    const interval = setInterval(push, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-medium">AI Decisions</div>
            <div className="text-xs text-muted-foreground">Real-time optimization log</div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Entries */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div
              key={e.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="p-3 rounded-xl border border-border bg-gradient-to-br from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-800/60"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{e.loc}</div>
                <div className="text-xs text-muted-foreground">{e.time}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{e.reason}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-muted-foreground line-through">
                  {e.from}s
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                  {e.to}s green
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
