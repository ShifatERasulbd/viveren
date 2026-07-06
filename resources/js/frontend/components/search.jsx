import { Search, X } from 'lucide-react';

export default function SearchProducts({
    isSearchOpen,
    closeSearch,
    handleSearchSubmit,
    searchInputRef,
    searchQuery,
    setSearchQuery,
}) {
    return (
        <div
            className={`fixed left-1/2 top-[96px] z-[1410] w-[calc(100vw-2rem)] max-w-[720px] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_28px_80px_rgba(0,0,0,0.25)] transition-all duration-200 ${
                isSearchOpen
                    ? 'visible translate-y-0 opacity-100 pointer-events-auto'
                    : 'invisible -translate-y-2 opacity-0 pointer-events-none'
            }`}
            role="dialog"
            aria-label="Search products"
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    closeSearch();
                }
            }}
        >
            <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
                <Search className="size-5 text-zinc-500" strokeWidth={1.75} />
                <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search products by name, category, or keyword"
                    className="h-11 min-w-0 flex-1 rounded-md border border-zinc-300 px-3 text-[0.95rem] text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-500"
                />
                <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-white"
                >
                    Search
                </button>
                <button
                    type="button"
                    onClick={closeSearch}
                    aria-label="Close search"
                    className="inline-flex size-11 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                    <X className="size-4" strokeWidth={2} />
                </button>
            </form>
        </div>
    );
}
