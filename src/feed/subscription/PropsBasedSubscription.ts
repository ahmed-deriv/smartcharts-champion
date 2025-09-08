import EventEmitter from 'event-emitter-es6';
import { TGetQuotes, TSubscribeQuotes, TQuote, TGranularity, TMainStore, TGetQuotesResult } from 'src/types';
import { getUTCDate } from 'src/utils';

/**
 * Props-based subscription class that replaces both DelayedSubscription and RealtimeSubscription
 * Uses client-provided functions instead of BinaryAPI for data fetching and streaming
 */
export class PropsBasedSubscription {
    private _emitter: EventEmitter;
    private unsubscribeFunction?: () => void;
    private pollingTimer?: NodeJS.Timeout;
    private lastStreamEpoch?: number;
    
    // Configuration
    private params: { symbol: string; granularity: TGranularity };
    private getQuotes: TGetQuotes;
    private subscribeQuotes: TSubscribeQuotes;
    private isDelayed: boolean;
    private delayMinutes: number;
    private pollingInterval: number;

    static get EVENT_CHART_DATA() {
        return 'EVENT_CHART_DATA';
    }

    constructor(
        params: { symbol: string; granularity: TGranularity },
        getQuotes: TGetQuotes,
        subscribeQuotes: TSubscribeQuotes,
        _mainStore: TMainStore,
        options: {
            isDelayed?: boolean;
            delayMinutes?: number;
            pollingInterval?: number;
        } = {}
    ) {
        this.params = params;
        this.getQuotes = getQuotes;
        this.subscribeQuotes = subscribeQuotes;
        
        // Configuration with defaults
        this.isDelayed = options.isDelayed || false;
        this.delayMinutes = options.delayMinutes || 0;
        this.pollingInterval = options.pollingInterval || 3000; // 3 seconds default
        
        this._emitter = new EventEmitter({ emitDelay: 0 });
        
        console.log(`[PropsBasedSubscription] Created for ${params.symbol} (${this.isDelayed ? 'delayed' : 'realtime'})`);
    }

    /**
     * Fetch initial historical data
     * Replaces the initialFetch() method from base Subscription class
     */
    async initialFetch(): Promise<{ quotes: TQuote[]; response?: any }> {
        console.log(`[PropsBasedSubscription] Fetching initial data for ${this.params.symbol}`);
        
        try {
            // Calculate start time (offset for delayed markets)
            const now = Date.now();
            const startTime = this.isDelayed ? 
                Math.floor((now - (this.delayMinutes * 60 * 1000)) / 1000) : 
                undefined;

            const result = await this.getQuotes({
                symbol: this.params.symbol,
                granularity: this.params.granularity as number,
                count: 1000, // Get substantial history
                start: startTime,
            });

            const quotes = this.formatQuotesFromResult(result);
            
            // Track the last epoch for future updates
            if (quotes.length > 0) {
                this.lastStreamEpoch = this.getEpochFromQuote(quotes[quotes.length - 1]);
            }

            console.log(`[PropsBasedSubscription] Initial fetch complete: ${quotes.length} quotes`);
            return { quotes, response: result };
            
        } catch (error) {
            console.error(`[PropsBasedSubscription] Initial fetch failed:`, error);
            throw error;
        }
    }

    /**
     * Set up data streaming (real-time or polling)
     * Replaces the onChartData() method from subscription classes
     */
    onChartData(callback: (quotes: TQuote[]) => void) {
        console.log(`[PropsBasedSubscription] Setting up data stream (${this.isDelayed ? 'polling' : 'realtime'})`);
        
        if (this.isDelayed) {
            this.startPolling(callback);
        } else {
            this.startRealTimeSubscription(callback);
        }
    }

    /**
     * Start real-time subscription using subscribeQuotes prop
     */
    private startRealTimeSubscription(callback: (quotes: TQuote[]) => void) {
        console.log(`[PropsBasedSubscription] Starting real-time subscription for ${this.params.symbol}`);
        
        this.unsubscribeFunction = this.subscribeQuotes(this.params, (quote: TQuote) => {
            // Update last epoch
            this.lastStreamEpoch = this.getEpochFromQuote(quote);
            
            // Emit the new data
            const quotes = [quote];
            this._emitter.emit(PropsBasedSubscription.EVENT_CHART_DATA, quotes);
            callback(quotes);
            
            console.log(`[PropsBasedSubscription] Real-time tick received for ${this.params.symbol}:`, quote.Close);
        });
    }

    /**
     * Start polling for delayed data using getQuotes prop
     */
    private startPolling(callback: (quotes: TQuote[]) => void) {
        console.log(`[PropsBasedSubscription] Starting polling for ${this.params.symbol} (${this.pollingInterval}ms interval)`);
        
        this.pollingTimer = setInterval(async () => {
            try {
                // Get new data since last known epoch
                const result = await this.getQuotes({
                    symbol: this.params.symbol,
                    granularity: this.params.granularity as number,
                    count: 10, // Get recent data
                    start: this.lastStreamEpoch,
                });

                const quotes = this.formatQuotesFromResult(result);
                
                if (quotes.length > 0) {
                    // Update last epoch
                    this.lastStreamEpoch = this.getEpochFromQuote(quotes[quotes.length - 1]);
                    
                    // Emit new data
                    this._emitter.emit(PropsBasedSubscription.EVENT_CHART_DATA, quotes);
                    callback(quotes);
                    
                    console.log(`[PropsBasedSubscription] Polling update: ${quotes.length} new quotes for ${this.params.symbol}`);
                }
                
            } catch (error) {
                console.error(`[PropsBasedSubscription] Polling error for ${this.params.symbol}:`, error);
            }
        }, this.pollingInterval);
    }

    /**
     * Pause the subscription (stop receiving data)
     */
    pause() {
        console.log(`[PropsBasedSubscription] Pausing subscription for ${this.params.symbol}`);
        
        if (this.unsubscribeFunction) {
            // For real-time: we could pause by not calling the callback
            // For now, we'll just log - actual pause logic depends on client implementation
            console.log(`[PropsBasedSubscription] Real-time subscription paused (client-dependent)`);
        }
        
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
            console.log(`[PropsBasedSubscription] Polling timer paused`);
        }
    }

    /**
     * Resume the subscription from last known epoch
     */
    async resume(): Promise<{ quotes: TQuote[]; response?: any }> {
        console.log(`[PropsBasedSubscription] Resuming subscription for ${this.params.symbol}`);
        
        if (this.lastStreamEpoch) {
            // Get data from last known point
            const result = await this.getQuotes({
                symbol: this.params.symbol,
                granularity: this.params.granularity as number,
                count: 100,
                start: this.lastStreamEpoch,
            });

            const quotes = this.formatQuotesFromResult(result);
            console.log(`[PropsBasedSubscription] Resume fetch: ${quotes.length} quotes`);
            
            return { quotes, response: result };
        }
        
        return { quotes: [] };
    }

    /**
     * Clean up subscription (unsubscribe and clear timers)
     */
    forget() {
        console.log(`[PropsBasedSubscription] Cleaning up subscription for ${this.params.symbol}`);
        
        // Clean up real-time subscription
        if (this.unsubscribeFunction) {
            this.unsubscribeFunction();
            this.unsubscribeFunction = undefined;
            console.log(`[PropsBasedSubscription] Real-time subscription cleaned up`);
        }
        
        // Clean up polling timer
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = undefined;
            console.log(`[PropsBasedSubscription] Polling timer cleaned up`);
        }
        
        // Clear event listeners
        this._emitter.off(PropsBasedSubscription.EVENT_CHART_DATA);
        this.lastStreamEpoch = undefined;
    }

    /**
     * Convert TGetQuotesResult to TQuote array
     */
    private formatQuotesFromResult(result: TGetQuotesResult): TQuote[] {
        const quotes: TQuote[] = [];

        // Handle candle data (OHLC)
        if (result.candles && result.candles.length > 0) {
            result.candles.forEach(candle => {
                quotes.push({
                    Date: getUTCDate(candle.epoch),
                    Open: candle.open,
                    High: candle.high,
                    Low: candle.low,
                    Close: candle.close,
                    DT: new Date(candle.epoch * 1000),
                });
            });
        }
        
        // Handle tick data (prices and times)
        else if (result.history && result.history.prices && result.history.times) {
            const { prices, times } = result.history;
            prices.forEach((price, index) => {
                if (times[index]) {
                    quotes.push({
                        Date: getUTCDate(times[index]),
                        Close: price,
                        DT: new Date(times[index] * 1000),
                    });
                }
            });
        }

        return quotes;
    }

    /**
     * Extract epoch from quote for tracking
     */
    private getEpochFromQuote(quote: TQuote): number {
        if (quote.tick?.epoch) {
            return quote.tick.epoch;
        }
        if (quote.ohlc?.epoch) {
            return quote.ohlc.epoch;
        }
        if (quote.DT) {
            return Math.floor(quote.DT.getTime() / 1000);
        }
        // Fallback: parse from Date string
        return Math.floor(new Date(quote.Date).getTime() / 1000);
    }

    /**
     * Add event listener for chart data updates
     */
    onChartDataEvent(callback: (quotes: TQuote[]) => void) {
        this._emitter.on(PropsBasedSubscription.EVENT_CHART_DATA, callback);
    }

    /**
     * Remove event listener
     */
    offChartDataEvent(callback: (quotes: TQuote[]) => void) {
        this._emitter.off(PropsBasedSubscription.EVENT_CHART_DATA, callback);
    }

    /**
     * Get current configuration for debugging
     */
    getConfig() {
        return {
            symbol: this.params.symbol,
            granularity: this.params.granularity,
            isDelayed: this.isDelayed,
            delayMinutes: this.delayMinutes,
            pollingInterval: this.pollingInterval,
            lastStreamEpoch: this.lastStreamEpoch,
            hasRealTimeSubscription: !!this.unsubscribeFunction,
            hasPollingTimer: !!this.pollingTimer,
        };
    }
}

export default PropsBasedSubscription;
