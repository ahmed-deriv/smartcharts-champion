import { ActiveSymbols as TActiveSymbols } from '../types/api-types';
import { TProcessedSymbols, TProcessedSymbolItem, TCategorizedSymbols } from '../types/active-symbols.types';
import { TSubCategory, TSubCategoryDataItem, TCategorizedSymbolItem } from '../types/categorical-display.types';
import { getCachedDisplayNames } from "./displayNameUtils";

// Helper function for stable sort
export function stableSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    return array
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const order = compareFn(a.item, b.item);
            return order !== 0 ? order : a.index - b.index;
        })
        .map(({ item }) => item);
}

// Helper functions for processing symbols
export const processSymbols = (symbols: TActiveSymbols): TProcessedSymbols => {
    const processedSymbols: TProcessedSymbols = [];

    // Stable sort is required to retain the order of the symbol name
    const sortedSymbols = stableSort(symbols, (a, b) => a.submarket.localeCompare(b.submarket));

    for (const s of sortedSymbols) {
        const symbolData = s as any;
        const symbolForDisplayName = symbolData.underlying_symbol || s.symbol;

        // Get display names using the display name service
        const displayNames = getCachedDisplayNames({
            symbol: symbolForDisplayName,
            market: s.market,
            submarket: s.submarket,
            subgroup: s.subgroup,
        });

        processedSymbols.push({
            symbol: symbolData.underlying_symbol || s.symbol,
            name: symbolData.underlying_symbol || s.symbol,
            market: s.market,
            subgroup: s.subgroup,
            submarket: s.submarket,
            exchange_is_open: !!s.exchange_is_open,
            decimal_places: (symbolData.pip_size ?? s.pip).toString().length - 2,
            displayName: displayNames.symbolDisplayName,
            marketDisplayName: displayNames.marketDisplayName,
            submarketDisplayName: displayNames.submarketDisplayName,
            subgroupDisplayName: displayNames.subgroupDisplayName,
        });
    }

    return processedSymbols;
};

export const categorizeActiveSymbols = (activeSymbols: TProcessedSymbols): TCategorizedSymbols => {
    const categorizedSymbols: TCategorizedSymbols = [];
    if (!activeSymbols.length) return categorizedSymbols;

    const first = activeSymbols[0];
    const getSubcategory = (d: TProcessedSymbolItem): TSubCategory => ({
        subcategoryName: d.submarketDisplayName,
        data: [],
    });
    const getCategory = (d: TProcessedSymbolItem): TCategorizedSymbolItem<TSubCategoryDataItem> => ({
        categoryName: d.marketDisplayName,
        categoryId: d.market,
        hasSubcategory: true,
        hasSubgroup: !!(d.subgroup && d.subgroup !== 'none'),
        data: [],
        subgroups: [],
    });
    let subcategory = getSubcategory(first);
    let category = getCategory(first);
    for (const symbol of activeSymbols) {
        if (
            category.categoryName !== symbol.marketDisplayName &&
            category.categoryName !== symbol.subgroupDisplayName
        ) {
            category.data.push(subcategory as unknown as TSubCategoryDataItem);
            categorizedSymbols.push(category);
            subcategory = getSubcategory(symbol);
            category = getCategory(symbol);
        }

        if (category.hasSubgroup) {
            if (!category.subgroups?.some((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)) {
                category.subgroups?.push({
                    data: [],
                    categoryName: symbol.subgroupDisplayName,
                    categoryId: symbol.subgroup,
                    hasSubcategory: true,
                    hasSubgroup: false,
                    subgroups: [],
                });
            }
            // should push a subcategory instead of symbol
            if (
                !category.subgroups
                    ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                    ?.data.find((el: TSubCategory) => el.subcategoryName === symbol.submarketDisplayName)
            ) {
                subcategory = getSubcategory(symbol);
                category.subgroups
                    ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                    ?.data.push(subcategory);
                subcategory = getSubcategory(symbol);
            }
            category.subgroups
                ?.find((el: TCategorizedSymbolItem) => el.categoryId === symbol.subgroup)
                ?.data.find((el: TSubCategory) => el.subcategoryName === symbol.submarketDisplayName)
                ?.data.push({
                    enabled: true,
                    itemId: symbol.symbol,
                    display: symbol.name,
                    dataObject: symbol,
                });
        }
        if (subcategory.subcategoryName !== symbol.submarketDisplayName) {
            category.data.push(subcategory as unknown as TSubCategoryDataItem);
            subcategory = getSubcategory(symbol);
        }
        subcategory.data.push({
            enabled: true,
            itemId: symbol.symbol,
            display: symbol.name,
            dataObject: symbol,
        });
    }

    category.data.push(subcategory as unknown as TSubCategoryDataItem);
    categorizedSymbols.push(category);

    return categorizedSymbols;
};
