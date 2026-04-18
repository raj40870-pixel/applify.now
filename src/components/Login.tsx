import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, Loader2, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { authApi } from '../lib/api';

interface LoginProps {
  onBack?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<'none' | 'google_only' | 'not_found'>('none');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { login } = useAuth();

  // Reset error type and message when switching between login/signup
  React.useEffect(() => {
    setErrorType('none');
    setErrorMessage(null);
  }, [isLogin]);

  // Listen for Google Auth Success
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { token, user } = event.data;
        login(token, user);
        toast.success('Logged in with Google!');
        // Close browser if it was opened via Capacitor
        if ((window as any).Capacitor?.isNativePlatform()) {
          const { Browser } = await import('@capacitor/browser');
          await Browser.close();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [login]);

  const handleGoogleLogin = async () => {
    try {
      const response = await authApi.getGoogleUrl();
      const { url } = response.data;
      
      if ((window as any).Capacitor?.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url });
      } else {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        window.open(
          url,
          'google_login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
      }
    } catch (error) {
      toast.error('Failed to initialize Google Login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const payload = { email: normalizedEmail, password };
      
      const response = isLogin 
        ? await authApi.login(payload)
        : await authApi.signup(payload);

      const data = response.data;

      login(data.token, data.user);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Authentication failed';
      if (message.includes('Google')) {
        setErrorType('google_only');
      } else if (message.includes('Account not found')) {
        setErrorType('not_found');
      }
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute -top-12 left-0 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </button>
        )}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4 shadow-lg shadow-cyan-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              AppifyNow <span className="text-cyan-400">Secure</span>
            </h1>
            <p className="text-slate-400 text-sm">
              {isLogin ? 'Login to access your dashboard' : 'Create an account to start building'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && errorType === 'none' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-sm text-red-400 font-medium">
                  {errorMessage}
                </p>
              </motion.div>
            )}

            {errorType === 'google_only' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4"
              >
                <p className="text-sm text-cyan-400 font-medium mb-3">
                  This account was created with Google. Please use Google Login or set a password to use email login.
                </p>
                <div className="flex flex-col gap-2">
                  <Button 
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full h-10 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition-all text-xs"
                  >
                    Login with Google
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => { setIsLogin(false); setErrorType('none'); }}
                    className="w-full h-10 bg-white/5 border border-white/10 text-white font-bold rounded-lg hover:bg-white/10 transition-all text-xs"
                  >
                    Set Password (Sign Up)
                  </Button>
                </div>
              </motion.div>
            )}

            {errorType === 'not_found' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4"
              >
                <p className="text-sm text-red-400 font-medium mb-3">
                  Account not found. Would you like to create a new account?
                </p>
                <Button 
                  type="button"
                  onClick={() => { setIsLogin(false); setErrorType('none'); }}
                  className="w-full h-10 bg-red-500 text-white font-bold rounded-lg hover:bg-red-400 transition-all text-xs"
                >
                  Create Account Now
                </Button>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                    setErrorType('none');
                  }}
                  className="w-full h-14 bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                    setErrorType('none');
                  }}
                  className="w-full h-14 bg-black/50 border border-white/10 rounded-xl pl-12 pr-12 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-all mt-4"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <div className="flex items-center gap-2">
                  {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </div>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0f172a] px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button 
            onClick={handleGoogleLogin}
            className="w-full h-14 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </Button>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Simple Button component for Login page to avoid importing from App.tsx if it's not exported
const Button = ({ className, children, ...props }: any) => (
  <button 
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);
