/**
 * Display name utilities for symbols
 * Provides fallback display names for symbols, markets, and submarkets
 */

export interface DisplayNameParams {
    symbol: string;
    market: string;
    submarket: string;
    subgroup?: string;
}

export interface DisplayNames {
    symbolDisplayName: string;
    marketDisplayName: string;
    submarketDisplayName: string;
    subgroupDisplayName: string;
}

/**
 * Get cached display names for symbols
 * This is a simplified implementation that returns the original values
 * In a full implementation, this would handle localization and caching
 */
export function getCachedDisplayNames(params: DisplayNameParams): DisplayNames {
    return {
        symbolDisplayName: params.symbol,
        marketDisplayName: params.market,
        submarketDisplayName: params.submarket,
        subgroupDisplayName: params.subgroup || params.submarket,
    };
}
