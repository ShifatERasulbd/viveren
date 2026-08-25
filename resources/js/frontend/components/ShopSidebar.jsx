import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

const availabilityFilters = ['In stock', 'Out of stock'];
const genderFilters = ['Men', 'Women'];

function FilterChevron({ open = false }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`size-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
        >
            <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function SidebarFilterRow({ title, open = false, onToggle, children }) {
    return (
        <div className="border-b border-zinc-200 pb-4">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3"
            >
                <span className="text-left text-[1rem] font-medium uppercase tracking-[0.01em] text-zinc-700">
                    {title}
                </span>
                <FilterChevron open={open} />
            </button>

            {open && children ? <div className="pt-4">{children}</div> : null}
        </div>
    );
}

function ActiveFilterChip({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-[0.72rem] font-medium text-zinc-700">
            {label}
            <button
                type="button"
                onClick={onRemove}
                aria-label={`Remove ${label} filter`}
                className="text-zinc-400 transition-colors hover:text-zinc-900"
            >
                <X className="size-3" strokeWidth={2.2} />
            </button>
        </span>
    );
}

function CheckboxFilterList({ values, checkedValues, onToggle }) {
    return (
        <ul className="space-y-2 text-[0.8rem] text-zinc-600">
            {values.map((value) => {
                const key = typeof value === 'object' ? String(value.id) : String(value);
                const label = typeof value === 'object' ? String(value.name || '') : String(value);
                const checked = checkedValues.includes(key);
                return (
                    <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2.5">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(key)}
                                className="size-4 rounded border-zinc-300 text-zinc-900"
                            />
                            <span>{label}</span>
                        </label>
                    </li>
                );
            })}
        </ul>
    );
}

export default function ShopSidebar({
    sizeOptions = [],
    categoryOptions = [],
    selectedAvailability = [],
    selectedSizes = [],
    selectedCategories = [],
    minPrice = '',
    maxPrice = '',
    highestPrice = '',
    selectedGenders = [],
    onToggleAvailability,
    onToggleSize,
    onToggleCategory,
    onToggleGender,
    onMinPriceChange,
    onMaxPriceChange,
    hideTitle = false,
}) {
    const [openSections, setOpenSections] = useState({
        availability: true,
        price: true,
        gender: true,
        size: true,
        categories: true,
    });
    const [showAllCategories, setShowAllCategories] = useState(true);

    const visibleCategories = useMemo(() => {
        if (showAllCategories) {
            return categoryOptions;
        }

        return categoryOptions.slice(0, 8);
    }, [showAllCategories, categoryOptions]);

    function toggleSection(sectionKey) {
        setOpenSections((previous) => ({
            ...previous,
            [sectionKey]: !previous[sectionKey],
        }));
    }

    const hasPriceFilter = Number(minPrice) > 0
        || (highestPrice !== '' && Number(maxPrice) < Number(highestPrice));

    const activeFilters = useMemo(() => {
        const filters = [];

        selectedAvailability.forEach((value) => {
            filters.push({
                key: `availability-${value}`,
                label: value,
                onRemove: () => onToggleAvailability?.(value),
            });
        });

        selectedGenders.forEach((value) => {
            filters.push({
                key: `gender-${value}`,
                label: value,
                onRemove: () => onToggleGender?.(value),
            });
        });

        selectedCategories.forEach((id) => {
            const option = categoryOptions.find((item) => String(item.id) === String(id));
            filters.push({
                key: `category-${id}`,
                label: option?.name || 'Category',
                onRemove: () => onToggleCategory?.(id),
            });
        });

        selectedSizes.forEach((id) => {
            const option = sizeOptions.find((item) => String(item.id) === String(id));
            filters.push({
                key: `size-${id}`,
                label: option?.name || 'Size',
                onRemove: () => onToggleSize?.(id),
            });
        });

        if (hasPriceFilter) {
            filters.push({
                key: 'price',
                label: `$${minPrice || '0'} - $${maxPrice || highestPrice || '0'}`,
                onRemove: () => {
                    onMinPriceChange?.('0');
                    onMaxPriceChange?.(highestPrice || '0');
                },
            });
        }

        return filters;
    }, [
        selectedAvailability,
        selectedGenders,
        selectedCategories,
        selectedSizes,
        categoryOptions,
        sizeOptions,
        hasPriceFilter,
        minPrice,
        maxPrice,
        highestPrice,
        onToggleAvailability,
        onToggleGender,
        onToggleCategory,
        onToggleSize,
        onMinPriceChange,
        onMaxPriceChange,
    ]);

    function clearAllFilters() {
        selectedAvailability.forEach((value) => onToggleAvailability?.(value));
        selectedGenders.forEach((value) => onToggleGender?.(value));
        selectedCategories.forEach((id) => onToggleCategory?.(id));
        selectedSizes.forEach((id) => onToggleSize?.(id));
        onMinPriceChange?.('0');
        onMaxPriceChange?.(highestPrice || '0');
    }

    return (
        <aside className="font-monstrate px-6 py-7 sm:px-7 sm:py-8">
            <div className="space-y-6">
                {!hideTitle ? (
                    <h2 className="text-[1.5rem] font-semibold uppercase tracking-[0.03em] text-zinc-800">Filters</h2>
                ) : null}

                {activeFilters.length > 0 ? (
                    <div className="space-y-3 border-b border-zinc-200 pb-5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-zinc-500">
                                Applied Filters
                            </span>
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="text-[0.72rem] font-medium uppercase tracking-[0.06em] text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {activeFilters.map((filter) => (
                                <ActiveFilterChip key={filter.key} label={filter.label} onRemove={filter.onRemove} />
                            ))}
                        </div>
                    </div>
                ) : null}

                <SidebarFilterRow
                    title="Availability"
                    open={openSections.availability}
                    onToggle={() => toggleSection('availability')}
                >
                    <CheckboxFilterList
                        values={availabilityFilters}
                        checkedValues={selectedAvailability}
                        onToggle={onToggleAvailability}
                    />
                </SidebarFilterRow>

                <SidebarFilterRow
                    title="Price"
                    open={openSections.price}
                    onToggle={() => toggleSection('price')}
                >
                    <div className="space-y-3">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                            <label className="relative block">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-zinc-500">$</span>
                                <input
                                    type="text"
                                    value={minPrice}
                                    onChange={(event) => onMinPriceChange?.(event.target.value)}
                                    className="h-9 w-full rounded border border-zinc-300  pl-6 pr-2 text-[0.8rem] text-zinc-700"
                                />
                            </label>

                            <span className="text-[0.8rem] text-zinc-500">to</span>

                            <label className="relative block">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] text-zinc-500">$</span>
                                <input
                                    type="text"
                                    value={maxPrice}
                                    onChange={(event) => onMaxPriceChange?.(event.target.value)}
                                    className="h-9 w-full rounded border border-zinc-300  pl-6 pr-2 text-[0.8rem] text-zinc-700"
                                />
                            </label>
                        </div>

                        <p className="text-[0.8rem] text-zinc-500">The highest price is ${highestPrice || '0.00'}</p>
                    </div>
                </SidebarFilterRow>

                <SidebarFilterRow
                    title="Gender"
                    open={openSections.gender}
                    onToggle={() => toggleSection('gender')}
                >
                    <CheckboxFilterList
                        values={genderFilters}
                        checkedValues={selectedGenders}
                        onToggle={onToggleGender}
                    />
                </SidebarFilterRow>

                {/* <SidebarFilterRow
                    title="Size"
                    open={openSections.size}
                    onToggle={() => toggleSection('size')}
                >
                    <CheckboxFilterList
                        values={sizeOptions}
                        checkedValues={selectedSizes}
                        onToggle={onToggleSize}
                    />
                </SidebarFilterRow> */}

                <SidebarFilterRow
                    title="Category"
                    open={openSections.categories}
                    onToggle={() => toggleSection('categories')}
                >
                    <div className="space-y-3">
                        <CheckboxFilterList
                            values={visibleCategories}
                            checkedValues={selectedCategories}
                            onToggle={onToggleCategory}
                        />

                        <button
                            type="button"
                            onClick={() => setShowAllCategories((previous) => !previous)}
                            className="inline-flex items-center gap-2 text-[1.35rem] text-zinc-600 transition-colors hover:text-zinc-900"
                        >
                            <span className="text-[1.1rem]">{showAllCategories ? '-' : '+'}</span>
                            {showAllCategories ? 'Show less' : 'Show more'}
                        </button>
                    </div>
                </SidebarFilterRow>
            </div>
        </aside>
    );
}
