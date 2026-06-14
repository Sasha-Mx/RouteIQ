export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded ${className}`} />
  );
}

export function SkeletonRouteCard() {
  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-8 w-16" />
      </div>
      <div className="flex gap-2">
        <SkeletonBlock className="h-6 w-16 rounded-full" />
        <SkeletonBlock className="h-6 w-20 rounded-full" />
        <SkeletonBlock className="h-6 w-14 rounded-full" />
      </div>
      <div className="border-t border-dashed border-gray-100 pt-3 flex justify-between items-center">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-4 w-16" />
      </div>
    </div>
  );
}

export function SkeletonLoader({ type = 'routes', count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {type === 'routes' ? <SkeletonRouteCard /> : (
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="h-3 w-20" />
                </div>
              </div>
              <SkeletonBlock className="h-6 w-12" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
