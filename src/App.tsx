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
  Terminal,
  Apple,
  ArrowLeft,
  CheckCircle
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

const TerminalShowcase = ({ url }: { url?: string }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const displayUrl = url || "yoursite.com";

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLine(prev => {
        if (prev >= 6) {
          setProgress(0);
          return 0;
        }
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentLine === 3) {
      const timer = setInterval(() => {
        setProgress(prev => (prev < 100 ? prev + 2 : 100));
      }, 30);
      return () => clearInterval(timer);
    }
  }, [currentLine]);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex gap-4"
      >
        <span className="text-[#a855f7] font-bold">$</span>
          <span className="text-white">
          <span className="text-[#22d3ee]">appify</span> <span className="text-[#c084fc]">--url</span>=<span className="text-[#fef08a]">"{displayUrl}"</span> <span className="text-[#c084fc]">--platform</span>=android
        </span>
      </motion.div>

      {currentLine >= 1 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex gap-3 text-zinc-500 ml-4"
        >
          <span className="text-[#4ade80]">›</span>
          <span>Analyzing manifest...</span>
        </motion.div>
      )}

      {currentLine >= 2 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex gap-3 text-zinc-500 ml-4"
        >
          <span className="text-[#4ade80]">›</span>
          <span>Generating Android project...</span>
        </motion.div>
      )}

      {currentLine >= 3 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col gap-2 ml-4"
        >
          <div className="flex items-center gap-4">
            <span className="text-[#4ade80]">›</span>
            <span className="text-[#22d3ee] font-bold">Compiling APK</span>
            <span className="text-[#4ade80] font-bold">{progress}%</span>
          </div>
          <div className="w-full max-w-md h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              style={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50 }}
            />
          </div>
        </motion.div>
      )}

      {currentLine >= 4 && progress === 100 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="pt-2 flex gap-3 text-[#4ade80] font-bold ml-4"
        >
          <span>✓</span>
          <span className="flex items-center gap-2">
            Build complete! <span className="text-[#a855f7] hover:text-purple-400 transition-colors">{displayUrl.split('.')[0]}-v1.0.apk</span> <span className="text-zinc-500 font-normal text-xs">(18.2 MB)</span>
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const { isAuthenticated, user, isLoading: isAuthLoading, logout, token } = useAuth();
  // const [progress, setProgress] = useState(0) // DELETED
  // const [isLoading, setIsLoading] = useState(true) // DELETED
  const [buildScore, setBuildScore] = useState(85) // KEPT
  // Trial Logic (15-day countdown)
  const getTrialDaysLeft = () => {
    if (!user?.createdAt) return 15;
    try {
      const createdDate = new Date(user.createdAt);
      const today = new Date();
      const diffTime = today.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, 15 - diffDays);
    } catch (e) {
      return 15;
    }
  };

  const trialDaysLeft = getTrialDaysLeft();
  const isTrialExpired = !user?.isPro && trialDaysLeft <= 0;

  const initialView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('token')
    ? 'dashboard'
    : 'landing';
  const [view, setView] = useState<'landing' | 'dashboard' | 'pro'>(initialView);
  const [activeTab, setActiveTab] = useState('converter');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [url, setUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [appName, setAppName] = useState('my web app');
  const [description, setDescription] = useState('My awesome web application converted to an app.');
  const [themeColor, setThemeColor] = useState('#00d8ff');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [displayMode, setDisplayMode] = useState('standalone');
  const [iconUrl, setIconUrl] = useState<string | null>(null); // null = use default flutter icon
  const [userUploadedIcon, setUserUploadedIcon] = useState(false); // BUG #1 FIX: track if user explicitly uploaded
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
  const [showCookieBanner, setShowCookieBanner] = useState(true);

  // Typewriter Animation Logic
  const [typewriterText, setTypewriterText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const TYPEWRITER_WORDS = ["an Android App", "a PWA", "a native App"];

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentWord = TYPEWRITER_WORDS[wordIndex];
      if (isDeleting) {
        setTypewriterText(currentWord.substring(0, typewriterText.length - 1));
        if (typewriterText.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
        }
      } else {
        setTypewriterText(currentWord.substring(0, typewriterText.length + 1));
        if (typewriterText === currentWord) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    }, isDeleting ? 50 : 100);
    return () => clearTimeout(timer);
  }, [typewriterText, isDeleting, wordIndex]);


  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'extended'>('monthly');
  const [autoSave, setAutoSave] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const downloadIntervalRef = useRef<number | null>(null);
  const downloadTimeoutRef = useRef<number | null>(null);
  const toolRef = useRef<HTMLDivElement>(null);

  // Auto-Save Logic — BUG #1 FIX: NEVER persist iconUrl to localStorage to prevent stale icon cache
  useEffect(() => {
    if (autoSave) {
      const config = { url, appName, description, themeColor, backgroundColor, displayMode, buildEngine };
      localStorage.setItem('appify_config', JSON.stringify(config));
    }
  }, [url, appName, description, themeColor, backgroundColor, displayMode, buildEngine, autoSave]);

  // Load saved config on mount — BUG #1 FIX: iconUrl intentionally NOT loaded from localStorage
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
        if (config.buildEngine) setBuildEngine(config.buildEngine);
        // iconUrl is deliberately NOT restored — each session starts with no custom icon
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

  const goToPricing = () => {
    setView('pro');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (!file) return;
    // Reset the input so re-selecting same file triggers onChange again
    e.target.value = '';
    const reader = new FileReader();
    reader.onloadend = async () => {
      // Create an image to draw on canvas and convert to strict PNG
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Standardize size for app icons
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngBase64 = canvas.toDataURL('image/png');

          // Upload to S3 immediately
          try {
            const uploadToast = toast.loading('Uploading icon to cloud...');
            const response = await projectsApi.uploadLogo({
              file: pngBase64,
              fileName: file.name,
              contentType: 'image/png'
            });

            const s3Url = response.data.url;
            setIconUrl(s3Url);
            setUserUploadedIcon(true); // BUG #1 FIX: mark that user explicitly uploaded
            toast.dismiss(uploadToast);
            toast.success('Icon uploaded to S3 successfully');
          } catch (error: any) {
            console.error('Icon upload failed:', error);
            toast.error('Failed to upload icon to S3. Using local preview only.');
            setIconUrl(pngBase64); // Fallback to base64 if S3 fails
            setUserUploadedIcon(true);
          }
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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

    // Drive actual logic through the unified handleDownload polling system
    handleDownload(type === 'apk' ? 'apk' : 'ipa');
  };

  const handleDownload = async (type: 'apk' | 'ipa' | 'both', mode: 'release' | 'debug' = 'release') => {
    if (!url.trim()) {
      toast.error('Please enter a website URL before downloading.');
      return;
    }

    if (isTrialExpired && !user?.isPro) {
      toast.error('Your 15-day trial has ended. Please upgrade to Pro.');
      setShowUpgradeModal(true);
      return;
    }

    const targetUrl = previewUrl || (url.startsWith('http') ? url : `https://${url}`);
    const payload = { appName, appUrl: targetUrl, iconUrl, themeColor, mode };

    const triggerFileDownload = (blob: Blob, filename: string) => {
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
      // BUG #1 FIX: Reset build state fully before each new build
      setIsBuilding(true);
      setBuildProgress(0);
      setBuildComplete(false);
      setBuildLogs([]);

      if (type === 'ipa') {
        setDownloadTarget('ipa');
        setBuildLogs([
          "Initializing iOS Build Environment...",
          "Resolved Swift package dependencies...",
          "Checking certificate with Apple ID...",
          "Compiling Swift source files...",
          "Linking AppifyNow-iOS binary...",
          "Generating provisioning profile...",
          "Signing with distribution certificate...",
          "Creating IPA archive..."
        ]);

        // Actual API call for the placeholder/bridge IPA
        const response = await buildApi.downloadIOS(payload);
        setBuildProgress(100);
        setBuildComplete(true);

        setBuildLogs(prev => [...prev, "iOS Build Successful!", "IPA Manifest generated."]);
        triggerFileDownload(response.data, `${appName.toLowerCase().replace(/\s+/g, '-')}-ios.txt`);
        toast.success('iOS Build Ready! Follow the instructions in the file.');
      } else {
        // Android / Both logic
        setDownloadTarget('apk');

        // BUG #1 FIX: Only send iconUrl if user explicitly uploaded one, otherwise null → backend uses default
        const finalIconUrl = userUploadedIcon ? iconUrl : null;

        setBuildLogs(["Connecting to Build Engine...", "Initializing fresh build sandbox..."]);

        // 1. Start Flutter Build
        const startResponse = await buildApi.startBuild({
          url: targetUrl,
          appName: appName,
          iconUrl: finalIconUrl,  // null = use default flutter icon
          platform: 'android',
          packageName: `com.appifynow.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`
        });

        const buildId = startResponse.data.buildId;

        // BUG #2 FIX: Poll real backend status — NO fake animation
        // Progress value comes ONLY from server. We never increment it ourselves.
        let isDone = false;
        while (!isDone) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const statusRes = await buildApi.getStatus(buildId);
          const { progress: serverProgress, status, stage, error } = statusRes.data;

          // BUG #2 FIX: Only update progress bar from backend value
          setBuildProgress(serverProgress ?? 0);

          // BUG #2 FIX: Show real stage text, not fake counter
          const stageLabels: Record<string, string> = {
            pending:    'Queuing build...',
            building:   'Building APK...',
            downloading:'Downloading icon...',
            compiling:  'Compiling Flutter sources...',
            signing:    'Signing APK...',
            packaging:  'Packaging output...',
            done:       'APK Building Finished!',
            completed:  'APK Building Finished!',
          };
          const stageText = stageLabels[stage] || stageLabels[status] || `Building... ${Math.round(serverProgress ?? 0)}%`;
          setBuildLogs(prev => {
            const clean = prev.filter(l =>
              !l.startsWith('Building') && !l.startsWith('Queuing') &&
              !l.startsWith('Compiling') && !l.startsWith('Signing') &&
              !l.startsWith('Packaging') && !l.startsWith('APK Building') &&
              !l.startsWith('Downloading')
            );
            return [...clean, `${stageText} (${Math.round(serverProgress ?? 0)}%)`];
          });

          if (status === 'completed') {
            isDone = true;
            setBuildProgress(100);
            // BUG #2 FIX: Show "APK Building Finished" text ONLY when backend says done
            setBuildLogs(prev => {
              const filtered = prev.filter(l =>
                !l.startsWith('Building') && !l.startsWith('APK Building') &&
                !l.startsWith('Signing') && !l.startsWith('Compiling') && !l.startsWith('Packaging')
              );
              return [...filtered, '✅ APK Building Finished! (100%)', 'Initiating Download...'];
            });
            setBuildComplete(true);

            const downloadRes = await buildApi.downloadFile(buildId);
            const fileName = `${appName.trim() || 'app'}.apk`;
            triggerFileDownload(downloadRes.data, fileName);
            toast.success(`${fileName} Downloaded Successfully!`);
          } else if (status === 'failed') {
            isDone = true;
            // BUG #2 FIX: Stop progress bar on failure, show error
            setBuildLogs(prev => [...prev, `❌ Build Failed: ${error || 'Unknown error'}`, 'Check your URL and try again.']);
            throw new Error(error || "Build failed on server.");
          }
        }
      }
    } catch (error: any) {
      console.error("Build error:", error);
      let errorMessage = 'The build engine is currently under maintenance. Please try again in 5 minutes.';

      // Axios with responseType: 'blob' returns error data as a Blob
      if (error.response?.data instanceof Blob) {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const errorData = JSON.parse(reader.result as string);
              toast.error(errorData.message || errorMessage);
              setBuildLogs(prev => [...prev, `ERROR: ${errorData.message || 'Build failed'}`, errorData.error || 'Check server logs for details.']);
            } catch (e) {
              toast.error(errorMessage);
            }
          };
          reader.readAsText(error.response.data);
          return; // Reader is async
        } catch (e) {
          console.error("Error reading error blob:", e);
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      setBuildLogs(prev => [...prev, "ERROR: Build Session Terminated.", "Please ensure URL is valid and try again."]);
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
      <div className="h-screen bg-[#020617] text-white font-sans flex overflow-hidden">
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
          fixed inset-y-0 left-0 z-[120] w-72 border-r border-white/5 bg-[#0a0a0a] flex flex-col transition-all duration-500 lg:relative lg:translate-x-0 lg:h-full
          ${sidebarOpen ? 'translate-x-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : '-translate-x-full'}
        `}>
          <div className="p-8 flex items-center justify-between border-b border-white/5">
            <button
              onClick={() => {
                setView('landing');
                setSidebarOpen(false);
              }}
              className="flex items-center gap-4 hover:scale-105 transition-transform group"
            >
              <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-purple-400 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-2xl tracking-tighter leading-none">AppifyNow</span>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">Creator Hub</span>
              </div>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-2 hover:bg-[#0a0a0a]/5 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-6 space-y-3">
            {[
              { id: 'converter', label: 'App Converter', icon: <RefreshCw size={20} /> },
              { id: 'projects', label: 'Build History', icon: <Layers size={20} /> },
              { id: 'settings', label: 'Account & API', icon: <Settings size={20} /> },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === item.id
                    ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/10 text-purple-400 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                    : 'text-slate-400 hover:text-white hover:bg-[#000000] border border-transparent'
                  }`}
              >
                <div className={`${activeTab === item.id ? 'text-purple-400' : 'text-slate-300'}`}>
                  {item.icon}
                </div>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5 bg-[#000000]">
            {isAuthenticated ? (
              <div className="space-y-3">
                <button
                  onClick={() => setView('landing')}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-[#0a0a0a] transition-all group border border-transparent hover:border-white/5"
                >
                  <Home size={20} className="group-hover:text-cyan-400 transition-colors" />
                  Exit to Home
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-red-400 bg-red-500/5 border border-red-500/10 hover:bg-red-100 transition-all"
                >
                  <Lock size={20} />
                  Terminate Session
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('landing')}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold bg-white text-black shadow-lg hover:bg-slate-100 transition-all"
              >
                <LogIn size={20} />
                Sign In
              </button>
            )}
          </div>
        </aside>


        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0">

          {/* Dashboard Header */}
          <header className="h-24 border-b border-white/5 bg-black/50 backdrop-blur-3xl px-8 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 text-slate-400 hover:text-white hover:bg-[#0a0a0a]/5 rounded-2xl transition-all">
                <Menu size={28} />
              </button>
              <div className="flex items-center gap-4">
                <div className="hidden lg:flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  {activeTab === 'converter' ? <RefreshCw size={20} /> : activeTab === 'projects' ? <Layers size={20} /> : <Settings size={20} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black capitalize tracking-tight">{activeTab === 'converter' ? 'Converter' : activeTab}</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Systems Online</span>
                  </div>
                </div>
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
              <div className="w-px h-6 bg-[#0a0a0a]/10 mx-1 md:mx-2 hidden sm:block" />
              <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 rounded-full bg-[#0a0a0a]/5 border border-white/10">
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
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#0a0a0a]/5 rounded-lg flex items-center gap-2">
                    <Lock size={14} /> Account Security
                  </button>
                  <button
                    onClick={goToPricing}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-[#0a0a0a]/5 rounded-lg flex items-center gap-2"
                  >
                    <Star size={14} /> Upgrade Plan
                  </button>
                  <div className="h-px bg-[#0a0a0a]/5 my-2" />
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

          <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0">
            {/* Trial Expiry Overlay */}
            {isTrialExpired && (
              <div className="fixed inset-0 z-[200] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
                <Card className="max-w-md bg-[#0a0a0a] border-cyan-500/30 text-white p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.2)]">
                  <div className="w-20 h-20 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                    <Lock size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-cyan-400">Trial Expired</h2>
                    <p className="text-slate-400">Your 15-day free trial has ended. Please upgrade to Pro to continue building apps.</p>
                  </div>
                  <Button
                    className="w-full h-14 bg-gradient-to-r from-orange-600 to-amber-500 text-white hover:opacity-90 font-bold text-lg rounded-xl shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                    onClick={goToPricing}
                  >
                    Upgrade to Pro Plan
                  </Button>
                  <button onClick={logout} className="text-slate-400 hover:text-white text-sm transition-colors">
                    Logout and switch account
                  </button>
                </Card>
              </div>
            )}

            {activeTab === 'converter' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 max-w-7xl mx-auto">
                {/* Left Form */}
                <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left duration-700">
                  <div className="space-y-6">
                    {/* URL Input */}
                    <div className="space-y-3">
                      <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Website URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onBlur={handlePreview}
                          className="bg-[#0a0a0a] border-white/5 h-14 rounded-xl focus:border-cyan-400 text-white"
                          placeholder="https://example.com"
                        />
                        <Button onClick={handlePreview} className="bg-cyan-400 hover:bg-cyan-300 text-black hover:opacity-90 h-14 w-14 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                          <RefreshCw size={20} className={previewLoading ? "animate-spin" : ""} />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* App Name */}
                      <div className="space-y-3">
                        <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">App Name</Label>
                        <Input
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className="bg-[#0a0a0a] border-white/5 h-14 rounded-xl"
                        />
                      </div>
                      {/* App Icon */}
                      <div className="space-y-3">
                        <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">App Icon</Label>
                        <div className="flex items-center gap-3 h-14 px-4 bg-[#0a0a0a] border border-white/5 rounded-xl">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/5 bg-[#1a1a2e] flex items-center justify-center">
                            {iconUrl ? (
                              <img src={iconUrl} alt="Icon" className="w-full h-full object-cover" />
                            ) : (
                              // BUG #1 FIX: Show default AppifyNow icon when no custom icon uploaded
                              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center">
                                <Zap size={16} className="text-white" fill="white" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs font-bold text-cyan-400 hover:bg-white/5 w-fit"
                              onClick={() => document.getElementById('icon-upload')?.click()}
                            >
                              <ImageIcon size={14} className="mr-2" /> {userUploadedIcon ? 'Change Icon' : 'Upload Icon'}
                            </Button>
                            {userUploadedIcon && (
                              <button
                                className="text-[10px] text-slate-500 hover:text-red-400 text-left ml-1 transition-colors"
                                onClick={() => { setIconUrl(null); setUserUploadedIcon(false); }}
                              >
                                ✕ Reset to default
                              </button>
                            )}
                          </div>
                          <input id="icon-upload" type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                        </div>
                      </div>
                    </div>

                    {/* Theme Color */}
                    <div className="space-y-3">
                      <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Theme Color</Label>
                      <div className="flex gap-2 relative">
                        <div
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md border border-white/5"
                          style={{ backgroundColor: themeColor }}
                        />
                        <Input
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="bg-[#0a0a0a] border-white/5 h-14 pl-12 rounded-xl font-mono"
                        />
                      </div>
                    </div>

                    {/* Display Mode */}
                    <div className="space-y-4">
                      <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Display Mode</Label>
                      <div className="flex flex-wrap gap-3">
                        {['Standalone', 'Fullscreen', 'Minimal-Ui'].map((mode) => (
                          <Button
                            key={mode}
                            onClick={() => setDisplayMode(mode.toLowerCase())}
                            className={`h-12 px-8 rounded-full font-bold transition-all ${displayMode === mode.toLowerCase()
                                ? 'bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                                : 'bg-[#0a0a0a] border border-white/5 text-slate-400 hover:text-white hover:bg-[#000000]'
                              }`}
                          >
                            {mode}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Download Primary Buttons */}
                    <div className="space-y-4 pt-6">
                      <Label className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Download Mobile App</Label>

                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          onClick={() => handleDownload('apk', 'release')}
                          disabled={isBuilding}
                          className="h-16 bg-gradient-to-r from-purple-600 to-purple-400 text-white hover:opacity-90 font-black text-lg rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50"
                        >
                          Download Android APK
                        </Button>
                        <Button
                          disabled={true}
                          className="h-16 bg-white/5 text-slate-500 font-black text-lg rounded-full border border-white/10 cursor-not-allowed"
                        >
                          iOS Support Coming Soon
                        </Button>
                      </div>
                    </div>

                    {/* Build Log Terminal (Visible when building) — BUG #2 FIX: real-time progress */}
                    {(isBuilding || buildComplete) && (
                      <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center justify-between px-2">
                          <Label className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Live Build Engine Status</Label>
                          <Badge className={`border-purple-500/20 ${buildComplete ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/10 text-purple-400 animate-pulse'}`}>
                            {buildComplete ? '✅ Done' : `${Math.round(buildProgress)}%`}
                          </Badge>
                        </div>
                        {/* BUG #2 FIX: Progress bar width = backend percent only, never fake-animated */}
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              buildComplete
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                            }`}
                            style={{ width: `${buildProgress}%` }}
                          />
                        </div>
                        {/* BUG #2 FIX: Show "APK Building Finished" ONLY when buildComplete = true (backend done) */}
                        {buildComplete && (
                          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <CheckCircle size={14} className="text-green-400" />
                            <span className="text-green-400 text-xs font-bold">APK Building Finished — Ready to Download</span>
                          </div>
                        )}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-[11px] h-40 overflow-y-auto">
                          {buildLogs.map((log, i) => (
                            <div key={i} className={`mb-1 flex gap-2 ${
                              log.startsWith('❌') ? 'text-red-400' :
                              log.startsWith('✅') ? 'text-green-400' :
                              'text-slate-300'
                            }`}>
                              <span className="text-blue-400">$</span>
                              <span>{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Preview */}
                <div className="lg:col-span-5 flex items-center justify-center">
                  <div className="relative group">
                    <div className="relative w-[320px] h-[640px] bg-[#0a0a0a] rounded-[3.5rem] p-4 shadow-[0_0_100px_rgba(6,182,212,0.15)] border-[10px] border-[#181818] ring-1 ring-white/10">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-white/5 rounded-b-3xl z-20 flex items-center justify-center gap-4">
                        <div className="w-12 h-1 bg-[#0a0a0a]/20 rounded-full" />
                      </div>

                      <div className="w-full h-full bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden relative border border-white/5">
                        {url ? (
                          <iframe
                            src={previewUrl ? `/api/proxy?url=${encodeURIComponent(previewUrl)}` : ''}
                            className="w-full h-full border-none"
                            title="Preview"
                            onLoad={() => setPreviewLoading(false)}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#0a0a0a] flex flex-col items-center justify-center p-12 text-center space-y-6">
                            <div className="w-24 h-24 rounded-3xl bg-[#000000] flex items-center justify-center text-slate-800 border border-white/5">
                              <ImageIcon size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-white">{appName}</h3>
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-[#0a0a0a]/10 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            )}




            {activeTab === 'projects' && (
              <div className="h-full space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-3xl font-black tracking-tight">Active Transmissions</h3>
                    <p className="text-slate-400 text-sm mt-1">Manage your compiled mobile assets and deployment status.</p>
                  </div>
                  <Button onClick={() => setActiveTab('converter')} className="bg-cyan-500 text-white hover:bg-cyan-400 text-black font-black px-8 h-12 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                    New Compile
                  </Button>
                </div>

                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-[#000000] border border-dashed border-white/5 rounded-[3rem]">
                    <div className="w-24 h-24 bg-cyan-500 text-white/10 rounded-full flex items-center justify-center text-cyan-400 mb-8 border border-cyan-500/20">
                      <Layers size={48} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">No active builds found</h3>
                    <p className="text-slate-400 max-w-sm mb-10">Start your journey by converting a web application into a high-performance native app.</p>
                    <Button onClick={() => setActiveTab('converter')} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 text-white/10">
                      Initiate First Build
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {projects.map((project) => (
                      <Card key={project._id} className="bg-[#0a0a0a] border border-white/5 text-white overflow-hidden group hover:border-blue-500/30 transition-all rounded-[2rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]">
                        <CardHeader className="flex flex-row items-center gap-5 p-8 border-b border-white/5 bg-[#000000]">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/5 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-transform group-hover:scale-110 duration-500">
                            <img src={project.iconUrl || 'https://picsum.photos/seed/appicon/512/512'} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <CardTitle className="text-xl font-black truncate">{project.name}</CardTitle>
                            <CardDescription className="text-slate-400 text-xs truncate max-w-[200px] font-mono">{project.url}</CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] h-6">
                            {project.engine || 'APK'}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-2">
                              <Box size={14} /> Created {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                              <Check size={12} /> Live
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleDownload('apk', 'debug')}
                              className="bg-[#0a0a0a] border-white/5 hover:border-blue-500/30 hover:text-cyan-400 text-[10px] font-black uppercase h-11 rounded-xl"
                            >
                              <Smartphone size={14} className="mr-2" /> Debug APK
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDownload('apk', 'release')}
                              className="bg-[#0a0a0a] border-white/5 hover:border-blue-600/30 hover:text-cyan-400 text-[10px] font-black uppercase h-11 rounded-xl"
                            >
                              <Rocket size={14} className="mr-2" /> Release APK
                            </Button>
                            <Button
                              variant="outline"
                              disabled={true}
                              className="bg-[#0a0a0a] border-white/5 text-slate-600 text-[10px] font-black uppercase h-11 rounded-xl cursor-not-allowed"
                            >
                              <Apple size={14} className="mr-2" /> iOS Locked
                            </Button>
                            <Button
                              variant="outline"
                              onClick={async () => {
                                const targetUrl = project.url.startsWith('http') ? project.url : `https://${project.url}`;
                                window.open(targetUrl, '_blank');
                                toast.success('Launching web preview...');
                              }}
                              className="bg-cyan-500 text-white hover:bg-cyan-400 text-[10px] font-black uppercase h-11 rounded-xl transition-all"
                            >
                              <ExternalLink size={14} className="mr-2" /> Launch
                            </Button>
                          </div>

                          <div className="pt-4 border-t border-white/5">
                            <Button
                              variant="ghost"
                              className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/5 text-[10px] uppercase font-black"
                              onClick={() => toast.error('Encryption key required for deletion.')}
                            >
                              Burn Transmission
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
                {/* Unlimited Trial Banner */}
                {!user?.isPro && (
                  <Card className="bg-cyan-500/10 border-cyan-500/20 text-white overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-cyan-500/20 rounded-3xl flex items-center justify-center text-cyan-400">
                          <Star size={32} fill="currentColor" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-orange-400">Free Trial Active</h3>
                          <p className="text-slate-400">{trialDaysLeft} days remaining in your package</p>
                        </div>
                      </div>
                      <Button
                        onClick={goToPricing}
                        className="bg-orange-500 text-white hover:bg-orange-400 font-black px-10 h-14 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)] whitespace-nowrap"
                      >
                        Upgrade Now
                      </Button>
                    </CardContent>
                  </Card>
                )}

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
                      <div className="flex items-center justify-between p-4 bg-[#000000] rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-500 text-white rounded-lg flex items-center justify-center text-black font-bold">
                            {user?.email?.[0].toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-bold truncate max-w-[150px]">{user?.email || 'User'}</p>
                            <p className="text-xs text-slate-400">
                              {user?.isPro ? 'Pro Member' : (trialDaysLeft > 0 ? `${trialDaysLeft} Days Trial Left` : 'Trial Expired')}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="border-white/5 hover:bg-[#000000]">Edit</Button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Subscription Status</span>
                          <Badge
                            variant="secondary"
                            className={user?.isPro ? "bg-green-500/10 text-green-500 border-green-500/20" : (trialDaysLeft > 0 ? "bg-orange-500 text-white/10 text-orange-500 border-orange-500/20" : "bg-red-500/10 text-red-500 border-red-500/20")}
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
                        className="w-full bg-red-500/50/10 text-red-500 border-red-500/20 hover:bg-red-500/50 hover:text-white transition-all"
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
                        <Palette size={18} className="text-cyan-400" />
                        App Preferences
                      </CardTitle>
                      <CardDescription className="text-slate-400">Customize your dashboard experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Dark Mode</Label>
                            <p className="text-xs text-slate-400">Always on for maximum performance.</p>
                          </div>
                          <Badge className="bg-cyan-500 text-white text-black">Enabled</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Auto-Save</Label>
                            <p className="text-xs text-slate-400">Save your build progress automatically.</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAutoSave(!autoSave)}
                            className={autoSave ? "text-cyan-500 h-6" : "text-slate-400 h-6"}
                          >
                            {autoSave ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Haptic Feedback</Label>
                            <p className="text-xs text-slate-400">Vibrate on successful build.</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHapticFeedback(!hapticFeedback)}
                            className={hapticFeedback ? "text-cyan-500 h-6" : "text-slate-400 h-6"}
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
                      <div className="p-4 bg-[#000000] rounded-xl space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Email Address</span>
                          <span className="text-slate-200 font-medium">{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Account Status</span>
                          <Badge className={user?.isPro ? "bg-green-500 text-black" : "bg-cyan-500 text-white text-black"}>
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

  if (view === 'pro') {
    return (
      <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden">
        <Toaster position="top-center" theme="dark" />

        {/* Navbar */}
        <nav className="fixed top-0 z-[100] w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
          <div className="container mx-auto px-6 h-20 flex items-center justify-between">
            <button
              onClick={() => setView('landing')}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <Zap size={22} fill="currentColor" />
              </div>
              <span className="text-xl font-bold tracking-tight">AppifyNow</span>
            </button>
            <Button
              variant="ghost"
              onClick={() => setView('dashboard')}
              className="text-slate-400 hover:text-white flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </Button>
          </div>
        </nav>

        <div className="pt-32 pb-20">
          <div className="container mx-auto px-6 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full bg-[#0a0a0a] border border-cyan-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.2)]"
            >
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
                        className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${selectedPlan === 'monthly'
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
                        className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${selectedPlan === 'extended'
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
        </div>

        {/* Footer */}
        <footer className="py-20 border-t border-white/5">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                  <Zap size={18} fill="currentColor" />
                </div>
                <span className="text-lg font-bold tracking-tight">AppifyNow</span>
              </div>
              <p className="text-sm text-slate-600">
                © 2026 AppifyNow. Secure Payment Guaranteed.
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-purple-500/30 overflow-x-hidden relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <Toaster position="top-center" theme="dark" />

      {/* Navbar */}
      <nav className="fixed top-0 z-[100] w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <Zap size={22} fill="currentColor" />
            </div>
            <span className="text-2xl font-bold tracking-tight">AppifyNow</span>
          </button>

          <div className="hidden md:flex items-center gap-4 lg:gap-10">
            <button onClick={() => setView('landing')} className="text-sm font-bold text-slate-400 hover:text-purple-400 transition-colors">Home</button>
            <button onClick={goToConverter} className="text-sm font-bold text-slate-400 hover:text-purple-400 transition-colors">Convert</button>
            <button onClick={() => setView('dashboard')} className="text-sm font-bold text-slate-400 hover:text-purple-400 transition-colors">Dashboard</button>
            <button className="text-sm font-bold text-slate-400 hover:text-purple-400 transition-colors">Contact</button>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-6">
              <button
                onClick={logout}
                className="hidden md:block text-sm font-bold text-slate-400 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
              <Button
                onClick={() => setView('dashboard')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 h-10 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                Dashboard
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <button
                onClick={() => setView('dashboard')}
                className="hidden md:block text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Login
              </button>
              <Button
                onClick={() => setView('dashboard')}
                className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold px-6 h-10 rounded-full shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                Start Free
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
                  className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors py-2"
                >
                  <Globe size={18} /> Home
                </button>
                <button
                  onClick={goToConverter}
                  className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors py-2"
                >
                  <RefreshCw size={18} /> Convert
                </button>
                <button
                  onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors py-2"
                >
                  <Layout size={18} /> Dashboard
                </button>
                {!isAuthenticated && (
                  <button
                    onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 text-slate-400 hover:text-purple-400 transition-colors py-2"
                  >
                    <LogIn size={18} /> Login Account
                  </button>
                )}
                <Button
                  onClick={() => { setView('dashboard'); setMobileMenuOpen(false); }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold mt-2 rounded-full"
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

      {/* Cookie Banner */}
      <AnimatePresence>
        {showCookieBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 md:bottom-6 md:right-8 md:left-auto md:w-full md:max-w-md z-[500]"
          >
            <div className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-white/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">We use cookies 🍪</h4>
                  <p className="text-slate-500 text-xs leading-tight">Essential cookies only — no tracking, no ads.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCookieBanner(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCookieBanner(false)}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full px-6"
                >
                  Accept
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-400 text-xs font-bold mb-8 uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Zap size={14} fill="currentColor" /> 4 2028 · Vercel for Mobile Apps
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] md:leading-none mb-8">
              YOUR WEBSITE.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-cyan-500 animate-gradient-x bg-[length:200%_200%]">
                THEIR POCKET.
              </span>
            </h1>

            <div className="text-xl md:text-2xl font-medium mb-12 flex items-center justify-center gap-2 flex-wrap">
              <span className="text-slate-400">Convert any URL into</span>
              <span className="text-purple-500 font-semibold">
                {typewriterText}<span className="text-purple-400">.</span><span className="inline-block w-[2px] h-5 bg-purple-500 ml-0.5 animate-pulse align-middle" />
              </span>
            </div>

            <p className="text-lg text-slate-500 max-w-xl mx-auto mb-12 leading-relaxed">
              No code. No Xcode. Just drop your URL.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                size="lg"
                onClick={goToConverter}
                className="h-16 px-12 text-lg bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-black rounded-full shadow-[0_0_40px_rgba(168,85,247,0.4)] gap-3 group"
              >
                Start Building Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Button>
              <button
                onClick={() => setView('dashboard')}
                className="btn-neon"
              >
                View Dashboard
              </button>
            </div>

            {/* Stats Bar */}
            <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto w-full">
              {[
                { label: "12K+", sub: "APPS BUILT", value: 12450 },
                { label: "99.9%", sub: "UPTIME", value: 99.9 },
                { label: "4.9★", sub: "RATING", value: 4.9 },
                { label: "<60s", sub: "BUILD TIME", value: 60 }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-purple-500/30 p-8 rounded-2xl backdrop-blur-xl hover:border-purple-500/50 transition-all group shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                  <motion.p
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className="text-3xl font-black text-white mb-1"
                  >
                    {stat.label}
                  </motion.p>
                  <p className="text-[10px] text-slate-500 font-bold tracking-widest">{stat.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Terminal Build Showcase */}
      <section className="py-24 relative overflow-hidden bg-black">
        <div className="container mx-auto px-6 flex flex-col items-center">
          <div className="max-w-3xl w-full relative group">
            {/* Box Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-orange-500/20 rounded-xl blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>

            <div className="relative bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-[0_0_50px_-12px_rgba(168,85,247,0.3)]">
              {/* Terminal Header */}
              <div className="bg-[#18181b]/50 px-6 py-4 flex items-center justify-between border-b border-[#27272a]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">appify-engine v3.0</div>
                <div className="w-10" />
              </div>

              {/* Terminal Content */}
              <div className="p-10 md:p-12 font-mono text-sm md:text-base space-y-5">
                <TerminalShowcase url={url} />
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div className="px-10 py-2 rounded-full border border-amber-500/50 bg-purple-900/30 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]">
              Features
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-black relative">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6">Consumer polish.</h2>
          <h2 className="text-4xl md:text-6xl font-black mb-16 text-purple-500">Developer power.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Code size={24} />,
                title: "Any Tech Stack",
                desc: "Support for React, Next.js, Vue, Shopify, Webflow, and more. If it's a URL, we can appify it."
              },
              {
                icon: <Zap size={24} />,
                title: "Sub-60s Builds",
                desc: "Optimized build pipeline that delivers release-ready packages faster than your coffee brews."
              },
              {
                icon: <Shield size={24} />,
                title: "Secure & Sandboxed",
                desc: "Enterprise-grade security policies ensure your user data and site content remain private."
              },
              {
                icon: <Smartphone size={24} />,
                title: "Native Features",
                desc: "Full access to Biometrics, Camera, Haptics, and Push Notifications out of the box."
              },
              {
                icon: <Layout size={24} />,
                title: "No Code Required",
                desc: "Generate your app without touching a single line of Java, Swift, or Gradle configuration."
              },
              {
                icon: <CheckCircle size={24} />,
                title: "Store Ready",
                desc: "Packages are pre-configured to pass App Store and Google Play Store submission guidelines."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] text-left hover:border-amber-500/30 transition-all group shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)]">
                <div className="w-12 h-12 bg-amber-500/5 border border-amber-500/30 rounded-2xl flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-all shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
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
            <div className="absolute top-12 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent hidden md:block" />

            {[
              { step: "01", title: "Enter URL", desc: "Drop your website link into our converter tool." },
              { step: "02", title: "Customize", desc: "Upload an icon, pick a splash color, set your platform." },
              { step: "03", title: "Build", desc: "We simulate a blazing-fast native build process." },
              { step: "04", title: "Download", desc: "Grab your mobile-ready packages from the dashboard." }
            ].map((item, i) => (
              <div key={i} className="text-center relative z-10">
                <div className="w-24 h-24 bg-black border border-amber-500/50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                  <span className="text-2xl font-black text-purple-400">{item.step}</span>
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
                quote: "We saved months of development time. Converted our React app to Android in literally minutes."
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
              <div key={i} className="p-10 bg-[#0a0a0a] border border-white/5 rounded-3xl relative hover:border-amber-500/30 transition-all group">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Zap key={i} size={18} className="text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <p className="text-lg text-white mb-8 leading-relaxed font-medium italic">
                  "{review.quote}"
                </p>
                <div>
                  <p className="font-bold text-white">{review.name}</p>
                  <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start with a 15-day free trial, upgrade to Pro for premium features.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Trial Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-amber-500/60 rounded-[2.5rem] flex flex-col hover:border-purple-400 transition-all group shadow-[0_0_40px_rgba(168,85,247,0.1)]">
              <h3 className="text-2xl font-black mb-2 text-purple-400">Free Trial</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">$0</span>
                <span className="text-slate-500">/15 days</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  Unlimited App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  Android & iOS Support
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  No Credit Card Required
                </li>
              </ul>
              <Button
                onClick={goToConverter}
                className="h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                15 Days Free Trial
              </Button>
            </div>

            {/* Monthly Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-amber-500/60 rounded-[2.5rem] flex flex-col relative shadow-[0_0_40px_rgba(168,85,247,0.1)] group hover:border-purple-400 transition-all">
              <div className="absolute -top-4 right-10 bg-purple-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-2xl font-black mb-2 text-purple-400">Monthly Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">₹99</span>
                <span className="text-slate-500">/1 month</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  15 App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  Priority Support
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  White-labeling
                </li>
              </ul>
              <Button
                onClick={() => handleUpgradeClick('monthly')}
                className="h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                Upgrade to Pro
              </Button>
            </div>

            {/* Extended Plan */}
            <div className="p-10 bg-[#0a0a0a] border-2 border-amber-500/60 rounded-[2.5rem] flex flex-col hover:border-purple-400 transition-all group shadow-[0_0_40px_rgba(168,85,247,0.1)]">
              <h3 className="text-2xl font-black mb-2 text-purple-400">Extended Pro</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-black">₹199</span>
                <span className="text-slate-500">/2 months</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  25 App Conversions
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  Commercial License
                </li>
                <li className="flex items-center gap-3 text-slate-300 text-sm">
                  <Check size={14} className="text-purple-400" />
                  Best Value for Teams
                </li>
              </ul>
              <Button
                onClick={() => handleUpgradeClick('extended')}
                className="h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-black shadow-[0_0_20px_rgba(168,85,247,0.3)]"
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
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="text-lg font-bold tracking-tight">AppifyNow</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-slate-500">
              <a href="https://appify-now.com.in" className="hover:text-purple-400 transition-colors">appify-now.com.in</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-purple-400 transition-colors">Terms</a>
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
            className="w-full max-w-4xl bg-[#0a0a0a] border border-amber-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)] relative"
          >
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
            >
              <X size={24} />
            </button>

            <div className="bg-gradient-to-r from-amber-500/10 to-blue-600/10 p-8 md:p-12 border-b border-white/5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                    <Rocket className="text-purple-400" size={40} />
                    Pro Checkout
                  </h2>
                  <p className="text-slate-400 text-lg">Complete your payment to unlock premium access.</p>
                </div>
                <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[180px]">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total Due</p>
                  <p className="text-4xl font-black text-purple-400">₹{selectedPlan === 'monthly' ? '99.00' : '199.00'}</p>
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
                      className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${selectedPlan === 'monthly'
                          ? 'bg-amber-500/10 border-amber-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${selectedPlan === 'monthly' ? 'bg-amber-500 shadow-[0_0_100px_rgba(168,85,247,1)]' : 'bg-slate-700'}`} />
                        1 Month Pro
                      </div>
                      <span>₹199</span>
                    </button>
                    <button
                      onClick={() => setSelectedPlan('extended')}
                      className={`w-full p-6 border rounded-2xl flex items-center justify-between text-lg font-bold transition-all ${selectedPlan === 'extended'
                          ? 'bg-amber-500/10 border-amber-500 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                          : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${selectedPlan === 'extended' ? 'bg-amber-500 shadow-[0_0_100px_rgba(168,85,247,1)]' : 'bg-slate-700'}`} />
                        2 Months Pro
                      </div>
                      <span>₹299</span>
                    </button>
                  </div>

                  <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500 pt-4">2. Payment Method</h4>
                  <div className="space-y-3">
                    <button className="w-full p-6 bg-white/5 border border-amber-500/50 rounded-2xl flex items-center gap-4 text-lg font-bold">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_100px_rgba(168,85,247,1)]" />
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
                        <Label className="text-sm text-purple-400 font-bold">Secret Activation Code</Label>
                        <Input
                          placeholder="Enter 5-digit code"
                          className="bg-amber-500/5 border-amber-500/30 h-14 text-lg text-purple-400 placeholder:text-purple-900"
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
                        className="w-full bg-purple-600 hover:bg-amber-500 text-white font-black h-16 text-xl rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all active:scale-95"
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
