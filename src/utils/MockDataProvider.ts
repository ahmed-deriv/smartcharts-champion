import { TGetQuotes, TSubscribeQuotes, TUnsubscribeQuotes, TGetQuotesResult, TQuote } from '../types/props.types';
import { TGranularity } from '../types/api-types';

/**
 * Configuration options for MockDataProvider
 */
export interface MockDataProviderConfig {
    /** Base price for generating mock data */
    basePrice?: number;
    /** Volatility factor for price movements (0-1) */
    volatility?: number;
    /** Delay in milliseconds for async operations */
    delay?: number;
    /** Whether to simulate network errors */
    simulateErrors?: boolean;
    /** Error probability (0-1) */
    errorProbability?: number;
    /** Real-time tick interval in milliseconds */
    tickInterval?: number;
}

/**
 * Mock data provider for testing SmartCharts standalone functionality.
 * Provides realistic historical and real-time data simulation.
 */
export class MockDataProvider {
    private config: Required<MockDataProviderConfig>;
    private subscriptions: Map<string, { 
        callback: (quote: TQuote) => void; 
        interval: NodeJS.Timeout;
        lastPrice: number;
        lastEpoch: number;
    }> = new Map();
    private priceHistory: Map<string, { prices: number[]; times: number[] }> = new Map();

    constructor(config: MockDataProviderConfig = {}) {
        this.config = {
            basePrice: config.basePrice || 100,
            volatility: config.volatility || 0.02,
            delay: config.delay || 100,
            simulateErrors: config.simulateErrors || false,
            errorProbability: config.errorProbability || 0.05,
            tickInterval: config.tickInterval || 1000,
        };
    }

    /**
     * Generate realistic mock historical data
     */
    private generateHistoricalData(
        symbol: string,
        granularity: number,
        count: number,
        start?: number,
        end?: number
    ): TGetQuotesResult {
        const now = Date.now();
        const endTime = end ? end * 1000 : now;
        const startTime = start ? start * 1000 : endTime - (count * granularity * 1000);
        
        if (granularity > 0) {
            // Generate candle data
            const candles = [];
            const basePrice = this.getBasePriceForSymbol(symbol);
            let currentPrice = basePrice;
            
            for (let time = startTime; time <= endTime; time += granularity * 1000) {
                const epoch = Math.floor(time / 1000);
                
                // Generate OHLC data with realistic price movements
                const open = currentPrice;
                const priceChange = (Math.random() - 0.5) * 2 * this.config.volatility * basePrice;
                const close = Math.max(0.01, open + priceChange);
                
                // Generate high and low within reasonable bounds
                const volatilityRange = this.config.volatility * basePrice * 0.5;
                const high = Math.max(open, close) + Math.random() * volatilityRange;
                const low = Math.min(open, close) - Math.random() * volatilityRange;
                
                candles.push({
                    open: Number(open.toFixed(5)),
                    high: Number(high.toFixed(5)),
                    low: Number(Math.max(0.01, low).toFixed(5)),
                    close: Number(close.toFixed(5)),
                    epoch,
                });
                
                currentPrice = close;
            }
            
            return { candles: candles.slice(-count) };
        }
        
        // Generate tick data
        const prices: number[] = [];
        const times: number[] = [];
        const basePrice = this.getBasePriceForSymbol(symbol);
        let currentPrice = basePrice;
        
        const tickInterval = 1000; // 1 second between ticks
        for (let time = startTime; time <= endTime; time += tickInterval) {
            const epoch = Math.floor(time / 1000);
            const priceChange = (Math.random() - 0.5) * 2 * this.config.volatility * basePrice;
            currentPrice = Math.max(0.01, currentPrice + priceChange);
            
            prices.push(Number(currentPrice.toFixed(5)));
            times.push(epoch);
        }
        
        // Store for potential real-time continuation
        this.priceHistory.set(symbol, { 
            prices: prices.slice(-100), // Keep last 100 prices
            times: times.slice(-100), 
        });
        
        return { 
            history: { 
                prices: prices.slice(-count), 
                times: times.slice(-count), 
            }, 
        };
    }

    /**
     * Get base price for a symbol (simulates different asset prices)
     */
    private getBasePriceForSymbol(symbol: string): number {
        const symbolPrices: Record<string, number> = {
            'R_50': 100,
            'R_75': 150,
            'R_100': 200,
            'EURUSD': 1.1000,
            'GBPUSD': 1.3000,
            'USDJPY': 110.00,
            'BTCUSD': 45000,
            'ETHUSD': 3000,
        };
        
        return symbolPrices[symbol] || this.config.basePrice;
    }

    /**
     * Simulate network delay
     */
    private async simulateDelay(): Promise<void> {
        if (this.config.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }
    }

    /**
     * Simulate network errors
     */
    private simulateError(): void {
        if (this.config.simulateErrors && Math.random() < this.config.errorProbability) {
            throw new Error('Mock network error: Failed to fetch data');
        }
    }

    /**
     * Generate subscription key
     */
    private getSubscriptionKey(symbol: string, granularity: TGranularity): string {
        return `${symbol}-${granularity}`;
    }

    /**
     * Implementation of TGetQuotes - fetch historical data
     */
    getQuotes: TGetQuotes = async (params) => {
        await this.simulateDelay();
        this.simulateError();

        const { symbol, granularity, count, start, end } = params;
        
        return this.generateHistoricalData(symbol, granularity, count, start, end);
    };

    /**
     * Implementation of TSubscribeQuotes - subscribe to real-time data
     */
    subscribeQuotes: TSubscribeQuotes = (params, callback) => {
        const { symbol, granularity } = params;
        const key = this.getSubscriptionKey(symbol, granularity);
        
        // Get starting price from history or use base price
        const history = this.priceHistory.get(symbol);
        const lastPrice = history?.prices[history.prices.length - 1] || this.getBasePriceForSymbol(symbol);
        const lastEpoch = history?.times[history.times.length - 1] || Math.floor(Date.now() / 1000);
        
        // Create real-time data simulation
        const interval = setInterval(() => {
            const subscription = this.subscriptions.get(key);
            if (!subscription) return;
            
            const now = Math.floor(Date.now() / 1000);
            const priceChange = (Math.random() - 0.5) * 2 * this.config.volatility * subscription.lastPrice;
            const newPrice = Math.max(0.01, subscription.lastPrice + priceChange);
            
            let quote: TQuote;
            
            if (granularity && granularity > 0) {
                // Generate OHLC data for candles
                const volatilityRange = this.config.volatility * newPrice * 0.3;
                const high = newPrice + Math.random() * volatilityRange;
                const low = Math.max(0.01, newPrice - Math.random() * volatilityRange);
                
                quote = {
                    Date: new Date(now * 1000).toISOString(),
                    Open: Number(subscription.lastPrice.toFixed(5)),
                    High: Number(high.toFixed(5)),
                    Low: Number(low.toFixed(5)),
                    Close: Number(newPrice.toFixed(5)),
                    ohlc: {
                        open: subscription.lastPrice.toString(),
                        high: high.toString(),
                        low: low.toString(),
                        close: newPrice.toString(),
                        open_time: now,
                        epoch: now,
                        granularity: granularity > 0 ? granularity : undefined,
                        symbol,
                        id: Math.random().toString(36).substr(2, 9),
                    },
                };
            } else {
                // Generate tick data
                quote = {
                    Date: new Date(now * 1000).toISOString(),
                    Close: Number(newPrice.toFixed(5)),
                    tick: {
                        epoch: now,
                        quote: newPrice,
                        symbol,
                        pip_size: 5,
                        id: Math.random().toString(36).substr(2, 9),
                    },
                };
            }
            
            // Update subscription state
            subscription.lastPrice = newPrice;
            subscription.lastEpoch = now;
            
            // Call the callback with new data
            callback(quote);
            
        }, this.config.tickInterval);
        
        // Store subscription
        this.subscriptions.set(key, {
            callback,
            interval,
            lastPrice,
            lastEpoch,
        });
        
        // Return unsubscribe function
        return () => {
            const subscription = this.subscriptions.get(key);
            if (subscription) {
                clearInterval(subscription.interval);
                this.subscriptions.delete(key);
            }
        };
    };

    /**
     * Implementation of TUnsubscribeQuotes - cleanup subscriptions
     */
    unsubscribeQuotes: TUnsubscribeQuotes = (params) => {
        const { symbol, granularity } = params;
        const key = this.getSubscriptionKey(symbol, granularity);
        
        const subscription = this.subscriptions.get(key);
        if (subscription) {
            clearInterval(subscription.interval);
            this.subscriptions.delete(key);
        }
    };

    /**
     * Get current subscription count (for testing)
     */
    getActiveSubscriptionCount(): number {
        return this.subscriptions.size;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<MockDataProviderConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Clear all data and subscriptions
     */
    cleanup(): void {
        this.subscriptions.forEach((subscription) => {
            clearInterval(subscription.interval);
        });
        this.subscriptions.clear();
        this.priceHistory.clear();
    }
}

/**
 * Create a pre-configured MockDataProvider for common use cases
 */
export const createMockDataProvider = (config?: MockDataProviderConfig): MockDataProvider => {
    return new MockDataProvider(config);
};

/**
 * Create MockDataProvider with error simulation enabled
 */
export const createMockDataProviderWithErrors = (errorProbability = 0.1): MockDataProvider => {
    return new MockDataProvider({
        simulateErrors: true,
        errorProbability,
        delay: 200, // Slower responses to simulate network issues
    });
};

/**
 * Create MockDataProvider with high-frequency data
 */
export const createHighFrequencyMockDataProvider = (): MockDataProvider => {
    return new MockDataProvider({
        tickInterval: 100, // 10 ticks per second
        volatility: 0.001, // Lower volatility for high frequency
        delay: 10, // Very fast responses
    });
};
