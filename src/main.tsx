import {StrictMode, Component, ErrorInfo} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

class AppErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-xl text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-slate-300 mb-3">An unexpected error occurred while loading the app.</p>
            <p className="text-slate-400 text-sm">{this.state.error?.message || 'Please refresh the page to try again.'}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </AppErrorBoundary>,
);
