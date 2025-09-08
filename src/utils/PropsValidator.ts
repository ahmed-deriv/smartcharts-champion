/* eslint-disable max-classes-per-file */

/**
 * Validation error class for props validation
 */
export class PropsValidationError extends Error {
    constructor(message: string, public propName: string) {
        super(message);
        this.name = 'PropsValidationError';
    }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: PropsValidationError[];
    warnings: string[];
}

/**
 * Props validator utility for SmartCharts standalone component
 */
export class PropsValidator {
    /**
     * Validate all required props for standalone operation
     */
    static validateRequiredProps(props: {
        getQuotes?: unknown;
        subscribeQuotes?: unknown;
        unsubscribeQuotes?: unknown;
        shouldGetQuotes?: unknown;
        isConnectionOpened?: unknown;
    }): ValidationResult {
        const errors: PropsValidationError[] = [];
        const warnings: string[] = [];

        // Validate getQuotes
        if (!props.getQuotes) {
            errors.push(new PropsValidationError(
                'getQuotes is required for standalone operation. Please provide a function that fetches historical data.',
                'getQuotes'
            ));
        } else if (typeof props.getQuotes !== 'function') {
            errors.push(new PropsValidationError(
                'getQuotes must be a function that returns a Promise<TGetQuotesResult>.',
                'getQuotes'
            ));
        }

        // Validate subscribeQuotes
        if (!props.subscribeQuotes) {
            errors.push(new PropsValidationError(
                'subscribeQuotes is required for standalone operation. Please provide a function that subscribes to real-time data.',
                'subscribeQuotes'
            ));
        } else if (typeof props.subscribeQuotes !== 'function') {
            errors.push(new PropsValidationError(
                'subscribeQuotes must be a function that returns an unsubscribe function.',
                'subscribeQuotes'
            ));
        }

        // Validate unsubscribeQuotes
        if (!props.unsubscribeQuotes) {
            errors.push(new PropsValidationError(
                'unsubscribeQuotes is required for standalone operation. Please provide a function that handles subscription cleanup.',
                'unsubscribeQuotes'
            ));
        } else if (typeof props.unsubscribeQuotes !== 'function') {
            errors.push(new PropsValidationError(
                'unsubscribeQuotes must be a function.',
                'unsubscribeQuotes'
            ));
        }

        // Validate shouldGetQuotes
        if (props.shouldGetQuotes === undefined || props.shouldGetQuotes === null) {
            errors.push(new PropsValidationError(
                'shouldGetQuotes is required and should be set to true for standalone operation.',
                'shouldGetQuotes'
            ));
        } else if (typeof props.shouldGetQuotes !== 'boolean') {
            errors.push(new PropsValidationError(
                'shouldGetQuotes must be a boolean value.',
                'shouldGetQuotes'
            ));
        } else if (props.shouldGetQuotes === false) {
            warnings.push('shouldGetQuotes is set to false. The chart may not fetch historical data.');
        }

        // Validate isConnectionOpened
        if (props.isConnectionOpened === undefined || props.isConnectionOpened === null) {
            errors.push(new PropsValidationError(
                'isConnectionOpened is required and should be set to true for standalone operation.',
                'isConnectionOpened'
            ));
        } else if (typeof props.isConnectionOpened !== 'boolean') {
            errors.push(new PropsValidationError(
                'isConnectionOpened must be a boolean value.',
                'isConnectionOpened'
            ));
        } else if (props.isConnectionOpened === false) {
            warnings.push('isConnectionOpened is set to false. The chart may not attempt to fetch data.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate getQuotes function response format
     */
    static validateGetQuotesResponse(response: unknown): ValidationResult {
        const errors: PropsValidationError[] = [];
        const warnings: string[] = [];

        if (!response || typeof response !== 'object') {
            errors.push(new PropsValidationError(
                'getQuotes response must be an object with candles or history property.',
                'getQuotes.response'
            ));
            return { isValid: false, errors, warnings };
        }

        const result = response as any;

        // Check if response has either candles or history
        if (!result.candles && !result.history) {
            errors.push(new PropsValidationError(
                'getQuotes response must contain either "candles" or "history" property.',
                'getQuotes.response'
            ));
        }

        // Validate candles format if present
        if (result.candles) {
            if (!Array.isArray(result.candles)) {
                errors.push(new PropsValidationError(
                    'getQuotes response "candles" must be an array.',
                    'getQuotes.response.candles'
                ));
            } else {
                // Validate candle structure
                result.candles.forEach((candle: any, index: number) => {
                    if (!candle || typeof candle !== 'object') {
                        errors.push(new PropsValidationError(
                            `Candle at index ${index} must be an object.`,
                            'getQuotes.response.candles'
                        ));
                        return;
                    }

                    const requiredFields = ['open', 'high', 'low', 'close', 'epoch'];
                    requiredFields.forEach(field => {
                        if (candle[field] === undefined || candle[field] === null) {
                            errors.push(new PropsValidationError(
                                `Candle at index ${index} is missing required field "${field}".`,
                                'getQuotes.response.candles'
                            ));
                        } else if (typeof candle[field] !== 'number') {
                            errors.push(new PropsValidationError(
                                `Candle at index ${index} field "${field}" must be a number.`,
                                'getQuotes.response.candles'
                            ));
                        }
                    });
                });
            }
        }

        // Validate history format if present
        if (result.history) {
            if (!result.history || typeof result.history !== 'object') {
                errors.push(new PropsValidationError(
                    'getQuotes response "history" must be an object.',
                    'getQuotes.response.history'
                ));
            } else {
                // Validate history structure
                if (!Array.isArray(result.history.prices)) {
                    errors.push(new PropsValidationError(
                        'getQuotes response "history.prices" must be an array of numbers.',
                        'getQuotes.response.history'
                    ));
                }

                if (!Array.isArray(result.history.times)) {
                    errors.push(new PropsValidationError(
                        'getQuotes response "history.times" must be an array of numbers.',
                        'getQuotes.response.history'
                    ));
                }

                if (Array.isArray(result.history.prices) && Array.isArray(result.history.times)) {
                    if (result.history.prices.length !== result.history.times.length) {
                        errors.push(new PropsValidationError(
                            'getQuotes response "history.prices" and "history.times" arrays must have the same length.',
                            'getQuotes.response.history'
                        ));
                    }

                    // Validate price values
                    result.history.prices.forEach((price: any, index: number) => {
                        if (typeof price !== 'number' || Number.isNaN(price)) {
                            errors.push(new PropsValidationError(
                                `Price at index ${index} must be a valid number.`,
                                'getQuotes.response.history.prices'
                            ));
                        }
                    });

                    // Validate time values
                    result.history.times.forEach((time: any, index: number) => {
                        if (typeof time !== 'number' || Number.isNaN(time)) {
                            errors.push(new PropsValidationError(
                                `Time at index ${index} must be a valid number (epoch timestamp).`,
                                'getQuotes.response.history.times'
                            ));
                        }
                    });
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Validate subscribeQuotes callback data format
     */
    static validateSubscribeQuotesCallback(quote: unknown): ValidationResult {
        const errors: PropsValidationError[] = [];
        const warnings: string[] = [];

        if (!quote || typeof quote !== 'object') {
            errors.push(new PropsValidationError(
                'subscribeQuotes callback data must be a TQuote object.',
                'subscribeQuotes.callback'
            ));
            return { isValid: false, errors, warnings };
        }

        const quoteObj = quote as any;

        // Validate required fields
        if (!quoteObj.Date || typeof quoteObj.Date !== 'string') {
            errors.push(new PropsValidationError(
                'Quote object must have a "Date" field as a string.',
                'subscribeQuotes.callback.Date'
            ));
        }

        if (quoteObj.Close === undefined || quoteObj.Close === null || typeof quoteObj.Close !== 'number') {
            errors.push(new PropsValidationError(
                'Quote object must have a "Close" field as a number.',
                'subscribeQuotes.callback.Close'
            ));
        }

        // Validate optional OHLC fields if present
        const ohlcFields = ['Open', 'High', 'Low'];
        ohlcFields.forEach(field => {
            if (quoteObj[field] !== undefined && typeof quoteObj[field] !== 'number') {
                errors.push(new PropsValidationError(
                    `Quote object "${field}" field must be a number if provided.`,
                    `subscribeQuotes.callback.${field}`
                ));
            }
        });

        // Validate tick data if present
        if (quoteObj.tick) {
            if (typeof quoteObj.tick !== 'object') {
                errors.push(new PropsValidationError(
                    'Quote object "tick" field must be an object if provided.',
                    'subscribeQuotes.callback.tick'
                ));
            } else {
                const requiredTickFields = ['epoch', 'quote', 'symbol'];
                requiredTickFields.forEach(field => {
                    if (quoteObj.tick[field] === undefined || quoteObj.tick[field] === null) {
                        errors.push(new PropsValidationError(
                            `Quote tick object is missing required field "${field}".`,
                            'subscribeQuotes.callback.tick'
                        ));
                    }
                });
            }
        }

        // Validate OHLC data if present
        if (quoteObj.ohlc) {
            if (typeof quoteObj.ohlc !== 'object') {
                errors.push(new PropsValidationError(
                    'Quote object "ohlc" field must be an object if provided.',
                    'subscribeQuotes.callback.ohlc'
                ));
            } else {
                const requiredOhlcFields = ['open', 'high', 'low', 'close', 'open_time', 'symbol'];
                requiredOhlcFields.forEach(field => {
                    if (quoteObj.ohlc[field] === undefined || quoteObj.ohlc[field] === null) {
                        errors.push(new PropsValidationError(
                            `Quote OHLC object is missing required field "${field}".`,
                            'subscribeQuotes.callback.ohlc'
                        ));
                    }
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Create helpful error messages for common validation failures
     */
    static createHelpfulErrorMessage(error: PropsValidationError): string {
        const helpfulMessages: Record<string, string> = {
            'getQuotes': `
Missing getQuotes function. Example implementation:

const getQuotes = async (params) => {
  const response = await fetch(\`/api/quotes?symbol=\${params.symbol}&granularity=\${params.granularity}\`);
  const data = await response.json();
  return {
    candles: data.candles, // For candlestick data
    history: data.history  // For tick data
  };
};
            `,
            'subscribeQuotes': `
Missing subscribeQuotes function. Example implementation:

const subscribeQuotes = (params, callback) => {
  const ws = new WebSocket('ws://your-server');
  ws.onmessage = (event) => {
    const quote = JSON.parse(event.data);
    callback(quote);
  };
  return () => ws.close(); // Return cleanup function
};
            `,
            'unsubscribeQuotes': `
Missing unsubscribeQuotes function. Example implementation:

const unsubscribeQuotes = (request, callback) => {
  // Clean up specific subscription or all subscriptions
  // Implementation depends on your subscription system
};
            `,
        };

        const baseMessage = error.message;
        const helpfulMessage = helpfulMessages[error.propName];

        return helpfulMessage ? `${baseMessage}\n\n${helpfulMessage.trim()}` : baseMessage;
    }

    /**
     * Validate props and throw detailed errors if validation fails
     */
    static validateAndThrow(props: any): void {
        const result = this.validateRequiredProps(props);
        
        if (!result.isValid) {
            const errorMessages = result.errors.map(error => 
                this.createHelpfulErrorMessage(error)
            ).join('\n\n');
            
            throw new Error(`SmartCharts Props Validation Failed:\n\n${errorMessages}`);
        }

        // Log warnings if any
        if (result.warnings.length > 0) {
            console.warn('SmartCharts Props Warnings:', result.warnings);
        }
    }
}

/**
 * Runtime prop validation decorator
 */
export function validateProps(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
        if (args[0]) {
            PropsValidator.validateAndThrow(args[0]);
        }
        return method.apply(this, args);
    };

    return descriptor;
}

/**
 * Utility function to create a props validator for testing
 */
export const createPropsValidator = () => {
    return {
        validate: PropsValidator.validateRequiredProps,
        validateResponse: PropsValidator.validateGetQuotesResponse,
        validateCallback: PropsValidator.validateSubscribeQuotesCallback,
        validateAndThrow: PropsValidator.validateAndThrow,
    };
};
