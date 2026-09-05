import React from 'react';
import { getLog, logEvent, logToText, formatTime } from './syncLog';

// En vit skärm säger ingenting. Kraschar appen ska du se vad som hände, kunna
// kopiera det, och kunna ladda om utan att stänga och öppna PWA:n.
// Klasskomponent, för det är det enda sättet att fånga renderingsfel i React.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error, copied: false };
  }

  componentDidCatch(error, info) {
    console.error('Appen kraschade:', error, info);
    try {
      logEvent('error', `Appen kraschade: ${error?.message || 'okänt fel'}`);
    } catch (_) {}
  }

  copy = async () => {
    const text = [
      `CHRELIN kraschrapport ${new Date().toISOString()}`,
      `Fel: ${this.state.error?.message || 'okänt'}`,
      this.state.error?.stack || '',
      '',
      logToText(),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
    } catch (_) {
      this.setState({ copied: false });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    let entries = [];
    try { entries = getLog().slice(0, 8); } catch (_) {}

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <h1 className="text-xl font-bold tracking-tight mb-2">Appen kraschade</h1>
          <p className="text-gray-400 text-sm mb-1">
            Din lista är kvar. Inget har raderats, och osparade ändringar ligger
            kvar på telefonen tills de kunnat sparas.
          </p>
          <p className="text-gray-500 text-xs mb-5 break-words">
            {this.state.error?.message || 'Okänt fel'}
          </p>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-green-600 hover:bg-green-500 active:scale-[0.99] text-white py-2.5 rounded-xl font-semibold transition-all"
            >
              Ladda om
            </button>
            <button
              onClick={this.copy}
              className="px-5 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl transition-colors"
            >
              {this.state.copied ? 'Kopierat' : 'Kopiera felet'}
            </button>
          </div>

          {entries.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 mb-2">Senaste händelserna</p>
              <ul className="space-y-1.5">
                {entries.map((e, i) => (
                  <li key={`${e.t}-${i}`} className="flex gap-3 text-xs">
                    <span className="text-gray-600 tabular-nums shrink-0">{formatTime(e.t)}</span>
                    <span className={e.level === 'error' ? 'text-red-300' : 'text-gray-400'}>{e.message}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }
}
