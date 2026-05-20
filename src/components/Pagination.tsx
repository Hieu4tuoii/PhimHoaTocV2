import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildPageLink: (page: number) => string;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, buildPageLink }) => {
  if (totalPages <= 1) return null;

  // Calculate pages to show
  const range = 2; // how many pages to show around current page
  const pages: number[] = [];

  for (
    let i = Math.max(1, currentPage - range);
    i <= Math.min(totalPages, currentPage + range);
    i++
  ) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      {/* Prev Button */}
      {currentPage > 1 ? (
        <Link
          href={buildPageLink(currentPage - 1)}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-rose hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/20 border border-slate-900 text-slate-600 cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* First Page Link */}
      {currentPage - range > 1 && (
        <>
          <Link
            href={buildPageLink(1)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-rose text-slate-300 hover:text-white transition-colors"
          >
            1
          </Link>
          {currentPage - range > 2 && (
            <span className="w-8 text-center text-slate-500 font-bold select-none">...</span>
          )}
        </>
      )}

      {/* Pages List */}
      {pages.map((p) => {
        const isCurrent = p === currentPage;
        
        return (
          <Link
            key={p}
            href={buildPageLink(p)}
            className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all duration-300 ${
              isCurrent
                ? 'bg-gradient-brand text-white border-transparent shadow-lg shadow-brand-violet/25'
                : 'bg-slate-900/60 border border-slate-800 hover:border-brand-rose text-slate-300 hover:text-white'
            }`}
          >
            {p}
          </Link>
        );
      })}

      {/* Last Page Link */}
      {currentPage + range < totalPages && (
        <>
          {currentPage + range < totalPages - 1 && (
            <span className="w-8 text-center text-slate-500 font-bold select-none">...</span>
          )}
          <Link
            href={buildPageLink(totalPages)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-rose text-slate-300 hover:text-white transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={buildPageLink(currentPage + 1)}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-brand-rose hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
          <ChevronRight className="w-5 h-5" />
        </Link>
      ) : (
        <button
          disabled
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-950/20 border border-slate-900 text-slate-600 cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
