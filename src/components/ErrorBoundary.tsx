import React from 'react';

interface State { hasError: boolean; error?: Error; }

interface Props {
  children: React.ReactNode;
  /** [Hardening-A · Block B] When set, fallback names this card. */
  cardName?: string;
  /** [Hardening-A · Block B] When set, fallback button calls this instead of window.location.reload(). */
  onReset?: () => void;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // [JWT] POST /api/logs/error
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      const { cardName, onReset } = this.props;
      const isCardLevel = !!cardName || !!onReset;
      const heading = cardName ? 'This card hit an error' : 'Something went wrong.';
      const subheading = cardName
        ? `${cardName} could not render. Other cards remain available.`
        : (this.state.error?.message ?? 'An unexpected error occurred.');
      const buttonLabel = isCardLevel ? 'Return to dashboard' : 'Refresh page';
      const handleClick = onReset ?? (() => window.location.reload());
      return (
        <div className={`flex flex-col items-center justify-center ${isCardLevel ? 'min-h-[40vh] p-8' : 'min-h-screen'} bg-background text-foreground gap-4`}>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            {subheading}
          </p>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={handleClick}
          >
            {buttonLabel}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
