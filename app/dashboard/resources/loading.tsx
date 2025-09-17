export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-12 w-48 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters Skeleton */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="h-12 w-80 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Results Summary Skeleton */}
        <div className="mb-6">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Resources Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2 mb-4">
                <div className="h-3 w-full bg-gray-200 rounded"></div>
                <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
              </div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 flex-1 bg-gray-200 rounded-xl"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 