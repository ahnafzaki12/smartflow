import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Camera } from 'lucide-react';
import { useIntersections } from '@/hooks/useIntersections';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function IntersectionsPage() {
  const navigate = useNavigate();
  const { intersections } = useIntersections();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1>Daftar Persimpangan</h1>
        <p className="text-sm text-muted-foreground">Kelola dan pantau seluruh persimpangan cerdas</p>
      </div>

      {/* Grid of Intersections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {intersections.map((intersection) => (
          <div 
            key={intersection.id}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300 group flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {intersection.name}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    {intersection.zone} <span className="opacity-50">•</span> {intersection.id.toUpperCase()}
                  </div>
                </div>
              </div>
              <StatusBadge status={intersection.status} vehicles={intersection.vehicles} />
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                {intersection.cctvId}
              </div>
              <button 
                onClick={() => navigate(`/intersections/${intersection.id}`)}
                className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
              >
                Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
