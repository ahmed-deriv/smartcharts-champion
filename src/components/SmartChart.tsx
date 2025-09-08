import React from 'react';
import { useStores, getContext, initContext } from 'src/store';
import { TChartProps } from 'src/types';
import { PropsValidator } from 'src/utils/PropsValidator';
import Chart from './Chart';

// Error Boundary Component for Prop Validation Failures
class PropValidationErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('SmartChart Prop Validation Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className='smartcharts-error'
                    style={{
                        padding: '20px',
                        border: '2px solid #ff4444',
                        borderRadius: '8px',
                        backgroundColor: '#fff5f5',
                        color: '#cc0000',
                        fontFamily: 'monospace',
                    }}
                >
                    <h3>SmartChart Configuration Error</h3>
                    <p>
                        <strong>Error:</strong> {this.state.error?.message}
                    </p>
                    <p>
                        Please check your SmartChart props configuration. All data functions (getQuotes,
                        subscribeQuotes, etc.) are now required.
                    </p>
                    <details>
                        <summary>Error Details</summary>
                        <pre>{this.state.error?.stack}</pre>
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

const SmartChart = React.forwardRef<
    { hasPredictionIndicators(): boolean; triggerPopup(cancelCallback: () => void): void },
    TChartProps
>(({ children, ...props }, ref) => {
    // Validate props at component initialization
    React.useMemo(() => {
        try {
            PropsValidator.validateRequiredProps(props);
        } catch (error) {
            console.error('SmartChart prop validation failed:', error);
            throw error; // This will be caught by the error boundary
        }
    }, [props.getQuotes, props.subscribeQuotes, props.shouldGetQuotes, props.isConnectionOpened]);

    const is_context_intialized = React.useRef(false);
    if (!is_context_intialized.current) {
        initContext();
        is_context_intialized.current = true;
    }

    const store = useStores();
    const context = getContext();

    const Provider = context.Provider;

    // Apply default values for required props if not provided
    const validatedProps: TChartProps = {
        ...props,
        shouldGetQuotes: props.shouldGetQuotes ?? true,
        isConnectionOpened: props.isConnectionOpened ?? true,
    };

    return (
        <PropValidationErrorBoundary>
            <Provider value={store}>
                <Chart 
                    // eslint-disable-next-line react/jsx-props-no-spreading
                    {...validatedProps} 
                    ref={ref}
                >
                    {children}
                </Chart>
            </Provider>
        </PropValidationErrorBoundary>
    );
});

export default SmartChart;
