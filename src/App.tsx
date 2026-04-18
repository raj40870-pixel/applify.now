import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu,
  X,
  Home,
  Smartphone, 
  Globe, 
  Settings, 
  Download, 
  Code, 
  Eye, 
  RefreshCw, 
  ExternalLink,
  LogIn,
  Loader2,
  Info,
  Check,
  Copy,
  Layout,
  Palette,
  Image as ImageIcon,
  Zap,
  Shield,
  MousePointer2,
  ArrowRight,
  Github,
  Twitter,
  ChevronDown,
  Star,
  Layers,
  Monitor,
  Lock,
  Rocket,
  Box,
  Cpu,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { authApi, projectsApi, buildApi } from './lib/api';

export default function App() {
  const { isAuthenticated, user, isLoading: isAuthLoading, logout, token } = useAuth();
  // const [progress, setProgress] = useState(0) // DELETED
  // const [isLoading, setIsLoading] = useState(true) // DELETED
  const [buildScore, setBuildScore] = useState(85) // KEPT
  // Trial Logic
  const getTrialDaysLeft = () => {
    if (!user?.createdAt) return 0;
    const createdDate = new Date(user.createdAt);
    const trialEndDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = trialEndDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const trialDaysLeft = getTrialDaysLeft();
  const isTrialExpired = trialDaysLeft <= 0 && isAuthenticated && !user?.isPro;

  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState('converter');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [url, setUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [appName, setAppName] = useState('My Web App');
  const [description, setDescription] = useState('My awesome web application converted to an app.');
  const [themeColor, setThemeColor] = useState('#00d8ff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [displayMode, setDisplayMode] = useState('standalone');
  const [iconUrl, setIconUrl] = useState('https://picsum.photos/seed/appicon/512/512');
  const [downloadStage, setDownloadStage] = useState<'idle' | 'building' | 'complete'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTarget, setDownloadTarget] = useState<'apk' | 'ipa' | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [buildEngine, setBuildEngine] = useState<'android' | 'ios' | 'both'>('android');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildComplete, setBuildComplete] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isServerConnecting, setIsServerConnecting] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const previewTimeoutRef = useRef<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);


  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'extended'>('monthly');
  const [autoSave, setAutoSave] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const downloadIntervalRef = useRef<number | null>(null);
  const downloadTimeoutRef = useRef<number | null>(null);
  const toolRef = useRef<HTMLDivElement>(null);

  // Auto-Save Logic
  useEffect(() => {
    if (autoSave) {
      const config = { url, appName, description, themeColor, backgroundColor, displayMode, iconUrl, buildEngine };
      localStorage.setItem('appify_config', JSON.stringify(config));
    }
  }, [url, appName, description, themeColor, backgroundColor, displayMode, iconUrl, buildEngine, autoSave]);

  // Load saved config on mount
  useEffect(() => {
    const saved = localStorage.getItem('appify_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.url) setUrl(config.url);
        if (config.appName) setAppName(config.appName);
        if (config.description) setDescription(config.description);
        if (config.themeColor) setThemeColor(config.themeColor);
        if (config.backgroundColor) setBackgroundColor(config.backgroundColor);
        if (config.displayMode) setDisplayMode(config.displayMode);
        if (config.iconUrl) setIconUrl(config.iconUrl);
        if (config.buildEngine) setBuildEngine(config.buildEngine);
      } catch (e) {
        console.error("Failed to load saved config", e);
      }
    }
  }, []);

  const handleUpgradeClick = (plan?: 'monthly' | 'extended') => {
    if (!isAuthenticated) {
      goToConverter();
      return;
    }
    if (plan) setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const response = await authApi.upgrade({ 
        code: secretCode,
        plan: selectedPlan 
      });

      const data = response.data;

      // Update local storage and context
      const updatedUser = data.user;
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      
      // Force a reload to refresh auth state (simplest way to sync)
      window.location.reload();
      toast.success('Account upgraded to Pro successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      if (!token) return;
      try {
        const response = await projectsApi.getAll();
        setProjects(response.data);
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };

    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    return () => {
      if (downloadIntervalRef.current) {
        window.clearInterval(downloadIntervalRef.current);
      }
      if (downloadTimeoutRef.current) {
        window.clearTimeout(downloadTimeoutRef.current);
      }
    };
  }, []);

  // Auto-update preview URL when url state changes
  useEffect(() => {
    if (!url.trim()) {
      setPreviewUrl('');
      setPreviewError(false);
      return;
    }
    const formattedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;
    if (formattedUrl !== previewUrl) {
      setPreviewUrl(formattedUrl);
      setPreviewError(false);
    }
  }, [url, previewUrl]);

  // Preview timeout effect
  useEffect(() => {
    if (!previewUrl) {
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
      return;
    }

    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
    }

    previewTimeoutRef.current = window.setTimeout(() => {
      setPreviewError(true);
      previewTimeoutRef.current = null;
    }, 4500);

    return () => {
      if (previewTimeoutRef.current) {
        window.clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = null;
      }
    };
  }, [previewUrl]);

  /* // DELETED
  useEffect(() => {
    if(progress < 100){
      const timer = setTimeout(() => setProgress(prev => prev + 1), 25)
      return () => clearTimeout(timer)
    } else {
      setIsLoading(false)
    }
  }, [progress])
  */ // DELETED

  /* // DELETED
  if (isLoading) return <div style={{height:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',background:'#0f0f0f',color:'white'}}><h1>Building Your App...</h1><h2>{progress}%</h2><div style={{width:'80%',maxWidth:'400px',height:'10px',background:'#333',borderRadius:'10px'}}> <div style={{width:`${progress}%`,height:'100%',background:'#00d8ff',borderRadius:'10px',transition:'width 0.1s'}}></div></div></div>
  */ // DELETED

  if (isAuthLoading) {

    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCw className="animate-spin text-cyan-500" size={32} />
      </div>
    );
  }

  if (!isAuthenticated && view === 'dashboard') {
    return <Login onBack={() => setView('landing')} />;
  }

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("To install: Open this site in Chrome/Safari and select 'Add to Home Screen'");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      toast.success('App installation started!');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToConverter = () => {
    setView('dashboard');
    setActiveTab('converter');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreview = () => {
    if (!url.trim()) {
      setPreviewUrl('');
      setPreviewError(false);
      return;
    }
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }
    setPreviewUrl(formattedUrl);
    setPreviewError(false);
  };



  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconUrl(reader.result as string);
        toast.success('Icon uploaded successfully');
      };
      reader.readAsDataURL(file);
    }
  };


  const triggerStaticDownload = (href: string, filename: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadButton = (type: 'apk' | 'ipa') => {
    if (!url.trim()) {
      toast.error('Please enter a website URL before downloading.');
      return;
    }

    if (downloadStage !== 'idle') {
      return;
    }

    setDownloadStage('building');
    setDownloadTarget(type);
    setDownloadProgress(0);

    downloadIntervalRef.current = window.setInterval(() => {
      setDownloadProgress((prev) => {
        const next = Math.min(100, prev + 25);

        if (next >= 100) {
          if (downloadIntervalRef.current) {
            window.clearInterval(downloadIntervalRef.current);
            downloadIntervalRef.current = null;
          }

          setDownloadStage('complete');
          downloadTimeoutRef.current = window.setTimeout(() => {
            if (type === 'apk') {
              const filename = `${appName.toLowerCase().replace(/\s+/g, '-') || 'app'}.apk`;
              triggerStaticDownload('/downloads/app.apk', filename);
            } else {
              alert('iOS Build is a Pro feature. Upgrade to download');
            }

            setDownloadStage('idle');
            setDownloadTarget(null);
            setDownloadProgress(0);
            downloadTimeoutRef.current = null;
          }, 1000);
        }

        return next;
      });
    }, 1000);
  };

  const handleDownload = async (type: 'apk' | 'ipa' | 'both') => {
    if (!url.trim()) {
      toast.error('Please enter a website URL before downloading.');
      return;
    }

    if (isTrialExpired && !user?.isPro) {
      toast.error('Your 15-day trial has expired. Please upgrade to Pro to download apps.');
      setShowUpgradeModal(true);
      return;
    }
    const targetUrl = previewUrl || (url ? (url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`) : '');
    const payload = { appName, appUrl: targetUrl, iconUrl, themeColor };

    const triggerDownload = (blob: Blob, filename: string) => {
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    };

    try {
      setIsBuilding(true);
      setBuildProgress(10);
      setBuildComplete(false);
      setBuildLogs(["Connecting to build server...", "Checking trial status...", "Preparing assets..."]);

      if (type === 'apk' || type === 'both') {
        setDownloadTarget('apk');
        setBuildLogs(prev => [...prev, "Starting Android build process...", "This may take a few minutes if first time..."]);
        const response = await buildApi.downloadAndroid(payload);
        setBuildLogs(prev => [...prev, "Android build successful!", "Generating download link..."]);
        const apkName = `${appName.toLowerCase().replace(/\s+/g, '-') || 'app'}.apk`;
        triggerDownload(response.data, apkName);
        toast.success('Android APK downloaded');
        if (type === 'both') setBuildProgress(50);
      }

      if (type === 'ipa' || type === 'both') {
        setDownloadTarget('ipa');
        setBuildLogs(prev => [...prev, "Starting iOS build process...", "Packaging IPA..."]);
        const response = await buildApi.downloadIOS(payload);
        setBuildLogs(prev => [...prev, "iOS build successful!", "Generating download link..."]);
        triggerDownload(response.data, `${appName.toLowerCase().replace(/\s+/g, '-') || 'app'}-ios.zip`);
        toast.success('iOS download started');
      }

      setBuildProgress(100);
      setBuildComplete(true);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Build failed. Please try again.';
      setBuildLogs(prev => [...prev, "ERROR: Build failed.", message]);
      toast.error(message);
      setBuildComplete(false);
    } finally {
      setIsBuilding(false);
      setDownloadTarget(null);
    }
  };

  const getLogs = () => {
    if (buildEngine === 'android') {
      return [
        "Initializing Android Build Environment...",
        "Fetching website metadata...",
        "Generating Android Project structure...",
        "Compiling Java source...",
        "Signing APK with debug key...",
        "Optimizing resources...",
        "Build Successful: app-release.apk generated."
      ];
    } else if (buildEngine === 'ios') {
      return [
        "Initializing iOS Build Environment...",
        "Generating Xcode Project...",
        "Configuring entitlements...",
        "Compiling Swift source...",
        "Signing IPA with development certificate...",
        "Build Successful: app-release.ipa generated."
      ];
    } else {
      return [
        "Initializing Multi-Platform Build Environment...",
        "Generating Android & iOS Projects...",
        "Compiling source code for both platforms...",
        "Signing packages...",
        "Build Successful: APK and IPA generated."
      ];
    }
  };

  const handleBuild = () => {
    if (!url.trim()) {
      toast.error('Please enter a website URL before building.');
      return;
    }

    if (isTrialExpired && !user?.isPro) {
      toast.error('Your 15-day trial has expired. Please upgrade to Pro to continue building apps.');
      setShowUpgradeModal(true);
      return;
    }

    const PLAN_LIMITS = {
      free: 1000000, // Unlimited for trial
      monthly: 15,
      extended: 25
    };

    const currentLimit = user?.isPro 
      ? (user.proPlan === 'extended' ? PLAN_LIMITS.extended : PLAN_LIMITS.monthly)
      : PLAN_LIMITS.free;

    if (projects.length >= currentLimit) {
      toast.error(`You have reached the limit of ${currentLimit} apps for your plan. Please upgrade for more.`);
      setShowUpgradeModal(true);
      return;
    }

    setIsBuilding(true);
    setBuildProgress(0);
    setBuildComplete(false);
    setBuildLogs([]);
    
    const logs = getLogs();
    let logIndex = 0;
    const interval = setInterval(() => {
      setBuildProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBuilding(false);
          setBuildComplete(true);
          
          // Save to MongoDB
          const saveProject = async () => {
            try {
              const response = await projectsApi.create({
                name: appName,
                url: url || window.location.hostname,
                iconUrl: iconUrl
              });
              const savedProject = response.data;
              setProjects(prev => [savedProject, ...prev]);
            } catch (error) {
              console.error("Error saving project:", error);
            }
          };
          
          saveProject();
          
          toast.success(`${buildEngine.toUpperCase()} Build Simulation Complete!`);
          return 100;
        }
        
        // Add logs based on progress
        const nextLogIndex = Math.floor((prev / 100) * logs.length);
        if (nextLogIndex > logIndex && nextLogIndex < logs.length) {
          setBuildLogs(prevLogs => [...prevLogs, logs[nextLogIndex]]);
          logIndex = nextLogIndex;
        }
        
        return prev + Math.random() * 8;
      });
    }, 300);
  };

  if (view === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#000000] text-white font-sans flex overflow-hidden">
        <Toaster position="top-center" theme="dark" />
        
        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-[120] w-64 border-r border-white/5 bg-[#050505] flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <button 
              onClick={() => {
                setView('landing');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="font-bold tracking-tight">AppifyNow</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {[
              { id: 'converter', label: 'Converter', icon: <RefreshCw size={18} /> },
              { id: 'projects', label: 'My Projects', icon: <Layers size={18} /> },
              { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5 space-y-2">
            {isAuthenticated && (
              <button 
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-all mb-2"
              >
                <Lock size={18} />
                Logout Account
              </button>
            )}
            <button 
              onClick={() => setView('landing')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 hover:bg-cyan-500/10 transition-all"
            >
              <Home size={18} />
              Go to Home
            </button>
            <button 
              onClick={() => setView('landing')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <ArrowRight className="rotate-180" size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Dashboard Header */}
          <header className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setView('landing')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-6 h-6 bg-cyan-500 rounded-md flex lg:hidden items-center justify-center text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                    <Zap size={14} fill="currentColor" />
                  </div>
                  <h2 className="text-xl font-bold capitalize hidden sm:block">{activeTab}</h2>
                </button>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5">Beta</Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setView('landing')}
                className="text-slate-400 hover:text-white hidden md:flex items-center gap-2"
              >
                <Home size={16} /> Home
              </Button>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hidden sm:flex">
                <Github size={20} />
              </Button>
              <div className="w-px h-6 bg-white/10 mx-1 md:mx-2 hidden sm:block" />
              <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600" />
                <span className="text-xs font-medium hidden xs:block">k69117842</span>
                <button className="text-slate-400 hover:text-white ml-1 md:ml-2">
                  <ChevronDown size={14} />
                </button>
              </div>
              {/* Three Dots Menu */}
              <div className="relative group">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <div className="flex flex-col gap-0.5">
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                    <div className="w-1 h-1 bg-current rounded-full" />
                  </div>
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <Lock size={14} /> Account Security
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg flex items-center gap-2">
                    <Star size={14} /> Upgrade Plan
                  </button>
                  <div className="h-px bg-white/5 my-2" />
                  <button 
                    onClick={() => setView('landing')}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
                  >
                    <Rocket size={14} className="rotate-180" /> Logout
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {/* Trial Expiry Overlay */}
            {isTrialExpired && (
              <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
                <Card className="max-w-md bg-[#0a0a0a] border-cyan-500/30 text-white p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto text-cyan-500">
                    <Lock size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-cyan-400">Trial Expired</h2>
                    <p className="text-slate-400">Your 15-day free trial has ended. Please upgrade to Pro to continue building apps.</p>
                  </div>
                  <Button 
                    className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    onClick={() => setShowUpgradeModal(true)}
                  >
                    Upgrade to Pro Plan
                  </Button>
                  <button onClick={logout} className="text-slate-500 hover:text-white text-sm transition-colors">
                    Logout and switch account
                  </button>
                </Card>
              </div>
            )}

            {activeTab === 'converter' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 max-w-7xl mx-auto">
                <div className="lg:col-span-5 space-y-6 md:space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-slate-400">Website URL</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={url} 
                          onChange={(e) => setUrl(e.target.value)}
                          onBlur={handlePreview}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handlePreview();
                            }
                          }}
                          className="bg-black border-white/10 h-12 focus:border-cyan-500"
                          placeholder="https://your-site.com"
                        />
                        <Button onClick={handlePreview} className="bg-cyan-500 hover:bg-cyan-400 text-black h-12">
                          <RefreshCw size={18} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-400">App Name</Label>
                        <Input value={appName} onChange={(e) => setAppName(e.target.value)} className="bg-black border-white/10 h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-400">App Icon</Label>
                        <div className="flex items-center gap-3 h-12 px-3 bg-black border border-white/10 rounded-md">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0">
                            <img src={iconUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-2"
                            onClick={() => document.getElementById('icon-upload')?.click()}
                          >
                            <ImageIcon size={14} className="mr-1.5" /> Upload
                          </Button>
                          <input 
                            id="icon-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleIconUpload}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-400">Theme Color</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-14 h-12 p-1 bg-black border-white/10" />
                        <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1 bg-black border-white/10 h-12" />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      <Label className="text-slate-400">Display Mode</Label>
                      <div className="flex flex-wrap gap-2">
                        {['standalone', 'fullscreen', 'minimal-ui'].map((mode) => (
                          <Button 
                            key={mode}
                            variant={displayMode === mode ? 'default' : 'outline'}
                            onClick={() => setDisplayMode(mode)}
                            className={`capitalize rounded-full px-6 ${displayMode === mode ? 'bg-cyan-500 text-black' : 'border-white/10 text-slate-400'}`}
                          >
                            {mode}
                          </Button>
                        ))}
                      </div>
                    </div>


                    <div className="space-y-4 pt-4">
                      <Label className="text-slate-400">Download Mobile App</Label>

                      {(isBuilding || buildComplete) && (
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${buildProgress}%` }}
                              className="h-full bg-[#00d8ff]"
                            />
                          </div>
                          <p className="text-sm text-slate-200">
                            {isBuilding
                              ? `Building Android APK... ${Math.round(buildProgress)}%`
                              : 'Build Complete! Your download should start shortly.'}
                          </p>
                        </div>
                      )}

                      {(downloadStage === 'building' || downloadStage === 'complete') && (
                        <div className="space-y-2">
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#00d8ff] transition-all duration-300"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-slate-200">
                            {downloadStage === 'building'
                              ? `Processing ${downloadTarget === 'apk' ? 'APK' : 'iOS App'}... ${downloadProgress}%`
                              : 'Ready!'}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleDownload('apk')}
                          disabled={isBuilding}
                          className="h-12 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBuilding && downloadTarget === 'apk'
                            ? `Building APK...`
                            : 'Download Android APK'}
                        </Button>
                        <Button
                          onClick={() => handleDownloadButton('ipa')}
                          className="h-12 bg-white text-black hover:bg-slate-200 font-bold rounded-full disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {downloadStage === 'building' && downloadTarget === 'ipa'
                            ? `Building iOS...`
                            : 'Download iOS App'}
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleDownload('both')}
                        disabled={isBuilding}
                        className="w-full h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black text-lg rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all animate-shimmer"
                      >
                        {isBuilding && (downloadTarget === 'apk' || downloadTarget === 'ipa')
                          ? `Building Multi-Platform...`
                          : 'Download Both (APK + iOS)'}
                      </Button>

                      {/* Build Process Terminal */}
                      {(isBuilding || buildComplete || downloadStage === 'building') && (
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Terminal size={14} className="text-cyan-500" /> Build Process
                            </Label>
                            <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400 animate-pulse">
                              {buildComplete ? 'Finished' : 'Running'}
                            </Badge>
                          </div>
                          <div className="bg-[#050505] border border-white/5 rounded-xl p-4 font-mono text-[10px] h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                            <div className="space-y-1.5">
                              {(buildLogs.length > 0 ? buildLogs : ["Waiting for process..."]).map((log, index) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -5 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  key={index} 
                                  className={`flex gap-2 ${log.startsWith('ERROR') ? 'text-red-400' : 'text-slate-400'}`}
                                >
                                  <span className="text-cyan-500 shrink-0">$</span>
                                  <span className="break-all">{log}</span>
                                </motion.div>
                              ))}
                              {isBuilding && (
                                <div className="flex items-center gap-2 text-cyan-500">
                                  <span className="animate-pulse">_</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col items-center py-8 lg:py-0">
                  <div className="relative scale-90 sm:scale-100">
                    {/* Device Frame */}
                    <div className="relative w-[280px] xs:w-[320px] h-[560px] xs:h-[640px] bg-black rounded-[3rem] xs:rounded-[3.5rem] p-3 xs:p-4 shadow-[0_0_100px_rgba(6,182,212,0.1)] border-[8px] xs:border-[10px] border-[#1a1a1a]">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 xs:w-36 h-6 xs:h-7 bg-[#1a1a1a] rounded-b-2xl xs:rounded-b-3xl z-20" />
                      <div className="w-full h-full bg-white rounded-[2rem] xs:rounded-[2.5rem] overflow-hidden relative">
                        {url ? (
                          previewError ? (
                            <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center">
                              <div className="text-slate-300 text-lg font-semibold mb-2">Preview unavailable</div>
                              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                                This website cannot be displayed in the mobile preview because it blocks iframe embedding or the connection was refused.
                              </p>
                              <Button
                                onClick={handlePreview}
                                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-full"
                              >
                                Retry Preview
                              </Button>
                            </div>
                          ) : (
                            <iframe
                              src={previewUrl}
                              className="w-full h-full border-none"
                              title="Preview"
                              onError={() => {
                                if (previewTimeoutRef.current) {
                                  window.clearTimeout(previewTimeoutRef.current);
                                  previewTimeoutRef.current = null;
                                }
                                setPreviewError(true);
                              }}
                              onLoad={() => {
                                if (previewTimeoutRef.current) {
                                  window.clearTimeout(previewTimeoutRef.current);
                                  previewTimeoutRef.current = null;
                                }
                                setPreviewError(false);
                              }}
                            />
                          )
                        ) : (
                          <div className="w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center">
                            <motion.div 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl mb-6 border-2 border-white/10"
                            >
                              <img src={iconUrl} alt="App Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </motion.div>
                            <motion.h3 
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-xl font-bold text-white mb-2"
                            >
                              {appName}
                            </motion.h3>
                            <motion.p 
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="text-xs text-slate-500"
                            >
                              Enter a URL to preview your app
                            </motion.p>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-2 xs:bottom-3 left-1/2 -translate-x-1/2 w-24 xs:w-28 h-1 xs:h-1.5 bg-[#1a1a1a] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="h-full">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                      <Layers size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-2">No projects yet</h3>
                      <p className="text-slate-400">Start by converting your first website into a mobile app.</p>
                    </div>
                    <Button onClick={() => setActiveTab('converter')} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                      Create New Project
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project._id} className="bg-[#0a0a0a] border-white/5 text-white overflow-hidden group hover:border-cyan-500/30 transition-all">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                    <img src={project.iconUrl || 'https://picsum.photos/seed/appicon/512/512'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription className="text-slate-500 text-xs truncate max-w-[150px]">{project.url}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-cyan-500/5 text-cyan-400 border-cyan-500/20 text-[10px] uppercase">
                    {project.engine || 'APK'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Built on {new Date(project.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 text-green-400">
                      <Check size={12} /> Ready
                    </span>
                  </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" className="border-white/10 text-[10px] px-1" onClick={() => handleDownload('apk')}>
                              <Download size={10} className="mr-1" /> APK
                            </Button>
                            <Button variant="outline" size="sm" className="border-white/10 text-[10px] px-1" onClick={() => handleDownload('ipa')}>
                              <Download size={10} className="mr-1" /> IPA
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-white/10 text-[10px] px-1 hover:text-cyan-400" 
                              onClick={async () => {
                                const targetUrl = project.url.startsWith('http') ? project.url : `https://${project.url}`;
                                if ((window as any).Capacitor?.isNativePlatform()) {
                                  const { Browser } = await import('@capacitor/browser');
                                  await Browser.open({ url: targetUrl });
                                } else {
                                  window.open(targetUrl, '_blank');
                                }
                                toast.success('Opening link...');
                              }}
                            >
                              <ExternalLink size={10} className="mr-1" /> Open
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-white/10 text-[10px] px-1 hover:text-slate-300" 
                              onClick={() => {
                                navigator.clipboard.writeText(project.url);
                                toast.success('URL copied!');
                              }}
                            >
                              <Copy size={10} className="mr-1" /> Copy
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account Card */}
                  <Card className="bg-[#0a0a0a] border-white/5 text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lock size={18} className="text-cyan-500" />
                        Account Settings
                      </CardTitle>
                      <CardDescription className="text-slate-400">Manage your profile and subscription.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-bold">
                            {user?.email?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold truncate max-w-[150px]">{user?.email || 'User'}</p>
                            <p className="text-xs text-slate-500">
                              {user?.isPro ? 'Pro Member' : (trialDaysLeft > 0 ? `${trialDaysLeft} Days Trial Left` : 'Trial Expired')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-white/10 hover:bg-white/5">Edit</Button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Subscription Status</span>
                          <Badge 
                            variant="secondary" 
                            className={user?.isPro ? "bg-green-500/10 text-green-500 border-green-500/20" : (trialDaysLeft > 0 ? "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}
                          >
                            {user?.isPro ? 'Pro Plan' : (trialDaysLeft > 0 ? 'Free Trial' : 'Expired')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Plan Details</span>
                          <span className={user?.isPro ? "text-green-400 font-bold" : (trialDaysLeft > 0 ? "text-slate-200" : "text-red-500 font-bold")}>
                            {user?.isPro 
                              ? `${user.proPlan === 'extended' ? '2 Months' : '1 Month'} Pro (${new Date(user.proExpiresAt || '').toLocaleDateString()})` 
                              : `${trialDaysLeft} Days Left`}
                          </span>
                        </div>
                      </div>

                      <Button 
                        variant="destructive" 
                        className="w-full bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                        onClick={() => {
                          if (confirm('Are you sure you want to reset your account data? This cannot be undone.')) {
                            toast.success('Account data reset successfully');
                          }
                        }}
                      >
                        Reset Account Data
                      </Button>
                    </CardContent>
                  </Card>

                  {/* App Preferences */}
                  <Card className="bg-[#0a0a0a] border-white/5 text-white">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette size={18} className="text-purple-500" />
                        App Preferences
                      </CardTitle>
                      <CardDescription className="text-slate-400">Customize your dashboard experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Dark Mode</Label>
                            <p className="text-xs text-slate-500">Always on for maximum performance.</p>
                          </div>
                          <Badge className="bg-cyan-500 text-black">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto-Save</Label>
                            <p className="text-xs text-slate-500">Save your build progress automatically.</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setAutoSave(!autoSave)}
                            className={autoSave ? "text-cyan-500 h-6" : "text-slate-500 h-6"}
                          >
                            {autoSave ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Haptic Feedback</Label>
                            <p className="text-xs text-slate-500">Vibrate on successful build.</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setHapticFeedback(!hapticFeedback)}
                            className={hapticFeedback ? "text-cyan-500 h-6" : "text-slate-500 h-6"}
                          >
                            {hapticFeedback ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Information */}
                  <Card className="bg-[#0a0a0a] border-white/5 text-white">
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">Account Settings</CardTitle>
                      <CardDescription>Manage your account preferences and subscription.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 bg-white/5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Email Address</span>
                          <span className="text-slate-200 font-medium">{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Account Status</span>
                          <Badge className={user?.isPro ? "bg-green-500 text-black" : "bg-cyan-500 text-black"}>
                            {user?.isPro ? 'PRO MEMBER' : 'FREE TRIAL'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Plan Details</span>
                          <span className={user?.isPro ? "text-green-400 font-bold" : (trialDaysLeft > 0 ? "text-slate-200" : "text-red-500 font-bold")}>
                            {user?.isPro 
                              ? `${user.proPlan === 'extended' ? '2 Months' : '1 Month'} Pro (${new Date(user.proExpiresAt || '').toLocaleDateString()})` 
                              : `${trialDaysLeft} Days Left`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {user?.isPro && (
                    <Card className="bg-green-500/5 border-green-500/20 text-white md:col-span-2">
                      <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                          <Check size={32} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-black">Pro Plan Active</h3>
                          <p className="text-slate-400">You have lifetime access to all premium features. Happy building!</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <Toaster position="top-center" theme="dark" />
      
      {/* Navbar */}
      <nav className="fixed top-0 z-[100] w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={scrollToTop}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Zap size={22} fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight">AppifyNow</span>
          </button>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={scrollToTop} className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
              <Globe size={16} /> Home
            </button>
            <button onClick={goToConverter} className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
              <RefreshCw size={16} /> Convert
            </button>
            <button onClick={() => setView('dashboard')} className="text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-2">
              <Layout size={16} /> Dashboard
            </button>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden md:flex text-slate-400 hover:text-red-400"
                  onClick={logout}
                >
                  <Lock size={16} className="mr-2" /> Logout
                </Button>
                <Button onClick={() => setView('dashboard')} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  Dashboard
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden md:flex text-slate-400 hover:text-cyan-400"
                  onClick={() => setView('dashboard')}
                >
                  <LogIn size={16} className="mr-2" /> Login
                </Button>
                <Button onClick={() => setView('dashboard')} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  Start Building
                </Button>
              </div>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-black/95 border-b border-white/5 overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                <button 
                  onClick={() => { scrollToTop(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors py-2"
                >
                  <Globe size={18} /> Home
                </button>
                <button 
                  onClick={goToConverter}
                  className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors py-2"
                >
                  <RefreshCw size={18} /> Convert
                </button>
                <button 
                  onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors py-2"
                >
                  <Layout size={18} /> Dashboard
                </button>
                {!isAuthenticated && (
                  <button 
                    onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors py-2"
                  >
                    <LogIn size={18} /> Login Account
                  </button>
                )}
                <Button 
                  onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold mt-2"
                >
                  {isAuthenticated ? 'Go to Dashboard' : 'Start Building'}
                </Button>
                {isAuthenticated && (
                  <Button 
                    variant="ghost" 
                    onClick={logout}
                    className="w-full text-red-400 hover:bg-red-500/10 border border-red-500/20"
                  >
                    <Lock size={18} className="mr-2" /> Logout Account
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="container mx-auto px-6 text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-bold mb-8 uppercase tracking-widest">
              <Zap size={14} fill="currentColor" /> Vercel for Mobile Apps
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-8">
              Turn your website into a <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">mobile app</span> in seconds.
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              The slickest, fastest way to convert any web application into a native iOS and Android experience. No coding, no complicated setup. Just drop your URL.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                size="lg" 
                onClick={goToConverter} 
                className="h-16 px-10 text-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] gap-2 group"
              >
                Start Converting <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-16 px-10 text-lg rounded-xl border-white/10 hover:bg-white/5 text-white font-bold"
                onClick={() => setView('dashboard')}
              >
                View Dashboard
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 bg-[#050505]">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
              Consumer-grade polish. <br />
              Developer-grade power.
            </h2>
            <p className="text-lg text-slate-400">
              Everything you need to deliver a premium native experience without touching Swift or Kotlin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Globe className="text-cyan-400" />,
                title: "Any Tech Stack",
                desc: "React, Vue, Next.js, or plain HTML. If it runs in a browser, it runs in AppifyNow."
              },
              {
                icon: <Zap className="text-cyan-400" />,
                title: "Lightning Fast",
                desc: "Our simulated conversion engine optimizes your assets and builds the packages in seconds."
              },
              {
                icon: <Shield className="text-cyan-400" />,
                title: "Secure & Sandboxed",
                desc: "Enterprise-grade isolation. Your app runs in a highly optimized native webview."
              },
              {
                icon: <Smartphone className="text-cyan-400" />,
                title: "Native Features",
                desc: "Splash screens, custom icons, and status bar controls out of the box."
              },
              {
                icon: <Code className="text-cyan-400" />,
                title: "No Code Required",
                desc: "Skip the massive learning curve. We handle the native tooling completely."
              },
              {
                icon: <Check className="text-cyan-400" />,
                title: "Publish Ready",
                desc: "Get highly optimized IPA and APK files ready for App Store and Play Store submission."
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="p-10 bg-[#0a0a0a] border border-white/5 rounded-3xl hover:border-cyan-500/30 transition-all group"
              >
                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 relative">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-black text-center mb-24">How it works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
            {/* Connecting Line */}
            <div className="absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent hidden md:block" />
            
            {[
              { step: "01", title: "Enter URL", desc: "Drop your website link into our converter tool." },
              { step: "02", title: "Customize", desc: "Upload an icon, pick a splash color, set your platform." },
              { step: "03", title: "Build", desc: "We simulate a blazing-fast native build process." },
              { step: "04", title: "Download", desc: "Grab your mobile-ready packages from the dashboard." }
            ].map((item, i) => (
              <div key={i} className="text-center relative z-10">
                <div className="w-24 h-24 bg-black border border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <span className="text-2xl font-black text-cyan-400">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-[#050505]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Trusted by modern teams</h2>
            <p className="text-slate-400">See what other developers are saying about AppifyNow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Jenkins",
                role: "CTO, TechStart",
                quote: "We saved months of development time. Converted our React app to iOS and Android in literally minutes."
              },
              {
                name: "Marcus Rossi",
                role: "Solo Founder",
                quote: "The most seamless web-to-app converter I've ever used. The UI is incredibly polished."
              },
              {
                name: "Elena Chen",
                role: "Indie Developer",
                quote: "AppifyNow feels like magic. It just works, every single time. A must-have for indie hackers."
              }
            ].map((review, i) => (
              <div key={i} className="p-10 bg-[#0a0a0a] border border-white/5 rounded-3xl relative">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className="text-cyan-400 fill-cyan-400" />
                  ))}
                </div>
                <p className="text-lg text-white mb-8 leading-relaxed font-medium italic">
                  "{review.quote}"
                </p>
                <div>
                  <p className="font-bold text-white">{review.name}</p>
                  <p className="text-sm text-slate-500">{review.role}</p>
                </div>
                <div className="absolute top-10 right-10 text-slate-800">
                  <Copy size={40} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start with a 15-day free trial, upgrade to Pro for premium features.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Trial Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-cyan-500/60 rounded-[2.5rem] flex flex-col hover:border-cyan-400 transition-all group shadow-[0_0_40px_rgba(6,182,212,0.1)]">
              <h3 className="text-2xl font-black mb-2 text-cyan-400">Free Trial</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">$0</span>
                <span className="text-slate-500">/15 days</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  Unlimited App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  Android & iOS Support
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  No Credit Card Required
                </li>
              </ul>
              <Button 
                onClick={goToConverter}
                className="h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                15 Days Free Trial
              </Button>
            </div>

            {/* Monthly Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-cyan-500/60 rounded-[2.5rem] flex flex-col relative shadow-[0_0_40px_rgba(6,182,212,0.1)] group hover:border-cyan-400 transition-all">
              <div className="absolute -top-4 right-10 bg-cyan-500 text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-2xl font-black mb-2 text-cyan-400">Monthly Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">₹199</span>
                <span className="text-slate-500">/1 month</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  15 App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  Priority Support
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  White-labeling
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgradeClick('monthly')}
                className="h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Upgrade to Pro
              </Button>
            </div>

            {/* Extended Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-cyan-500/60 rounded-[2.5rem] flex flex-col hover:border-cyan-400 transition-all group shadow-[0_0_40px_rgba(6,182,212,0.1)]">
              <h3 className="text-2xl font-black mb-2 text-cyan-400">Extended Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">₹299</span>
                <span className="text-slate-500">/2 months</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  25 App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  Commercial License
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-cyan-400" />
                  Best Value for Teams
                </li>
              </ul>
              <Button 
                onClick={() => handleUpgradeClick('extended')}
                className="h-12 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-black">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="text-lg font-bold tracking-tight">AppifyNow</span>
            </div>
            
            <div className="flex gap-8 text-sm text-slate-500">
              <a href="https://appify-now.com.in" className="hover:text-cyan-400 transition-colors">appify-now.com.in</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
            </div>

            <p className="text-sm text-slate-600">
              © 2026 AppifyNow. Built for the modern web.
            </p>
          </div>
        </div>
      </footer>
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl bg-[#0a0a0a] border border-cyan-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)] relative"
          >
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
              <X size={24} />
            </button>

            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 p-8 md:p-12 border-b border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                    <Rocket className="text-cyan-400" size={40} />
                    Pro Checkout
                  </h2>
                  <p className="text-slate-400 text-lg">Complete your payment to unlock premium access.</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[180px]">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total Due</p>
                  <p className="text-4xl font-black text-cyan-400">₹{selectedPlan === 'monthly' ? '199.00' : '299.00'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 md:p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500">1. Select Plan</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setSelectedPlan('monthly')}
                      className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${
                        selectedPlan === 'monthly' 
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${selectedPlan === 'monthly' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]' : 'bg-slate-700'}`} />
                        1 Month Pro
                      </div>
                      <span>₹199</span>
                    </button>
                    <button 
                      onClick={() => setSelectedPlan('extended')}
                      className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${
                        selectedPlan === 'extended' 
                        ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${selectedPlan === 'extended' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]' : 'bg-slate-700'}`} />
                        2 Months Pro
                      </div>
                      <span>₹299</span>
                    </button>
                  </div>

                  <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500 pt-4">2. Payment Method</h4>
                  <div className="space-y-3">
                    <button className="w-full p-6 bg-white/5 border border-cyan-500/50 rounded-2xl flex items-center gap-4 text-lg font-bold">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
                      Credit / Debit Card
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500">3. Payment Details</h4>
                  <div className="p-8 bg-white/5 border border-white/10 rounded-3xl space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-3">
                        <Label className="text-sm">Card Number</Label>
                        <Input 
                          placeholder="0000 0000 0000 0000" 
                          className="bg-black border-white/10 h-14 text-lg" 
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm">Expiry</Label>
                        <Input 
                          placeholder="MM/YY" 
                          className="bg-black border-white/10 h-14 text-lg" 
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm">CVC</Label>
                        <Input 
                          placeholder="***" 
                          className="bg-black border-white/10 h-14 text-lg" 
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-3 pt-4 border-t border-white/5">
                        <Label className="text-sm text-cyan-400 font-bold">Secret Activation Code</Label>
                        <Input 
                          placeholder="Enter 5-digit code" 
                          className="bg-cyan-500/5 border-cyan-500/30 h-14 text-lg text-cyan-400 placeholder:text-cyan-900" 
                          value={secretCode}
                          onChange={(e) => setSecretCode(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Enter "13908" to bypass payment for testing</p>
                      </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/5">
                      <Button 
                        onClick={handleUpgrade}
                        disabled={isUpgrading}
                        className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black h-16 text-xl rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                      >
                        {isUpgrading ? <Loader2 className="animate-spin" /> : 'Pay & Activate Now'}
                      </Button>
                      <p className="text-[10px] text-slate-500 text-center mt-4 uppercase tracking-widest">
                        Secure 256-bit SSL Encrypted Payment
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
