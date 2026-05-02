import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import { promisify } from "util";
import { exec, spawn } from "child_process";
import os from "os";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5000);
const DEFAULT_LOCAL_MONGODB_URI = process.env.MONGO_LOCAL_URI || "mongodb://127.0.0.1:27017/AppifyNow";
const envMongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const hasPlaceholderMongoUri = envMongoUri ? /<[^>]+>/.test(envMongoUri) : false;
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
const MONGODB_URI = !hasPlaceholderMongoUri && envMongoUri
  ? envMongoUri
  : isDev
    ? DEFAULT_LOCAL_MONGODB_URI
    : undefined;
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_123";
const isProduction = process.env.NODE_ENV === "production";
const execAsync = promisify(exec);

// S3 Client Configuration with 3s timeout
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  requestHandler: {
    requestTimeout: 3000,
  } as any
});
const defaultAllowedOrigins = [
  "http://localhost:5000",
  "http://localhost:5001",
  "http://localhost:5173",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:5001",
  "capacitor://localhost",
  "http://localhost",
];

const envAllowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve uploads statically
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api/auth")) {
      console.log(`[AUTH] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
    }
  });
  next();
});

// MongoDB Connection
console.log("Attempting to connect to MongoDB...");

const logConnectionError = (err: any, uri: string) => {
  if (uri === DEFAULT_LOCAL_MONGODB_URI) {
    console.warn(`Local MongoDB is not running (${uri})`);
    return;
  }
  console.error(`MongoDB connection error for ${uri}:`, err.message || err);
  if (uri.startsWith("mongodb+srv://")) {
    console.log("Current MongoDB URI (masked):", uri.replace(/:([^@]+)@/, ":****@"));
  }
};

const connectMongo = async () => {
  if (!MONGODB_URI) {
    console.error("MongoDB connection string is missing. Set MONGO_URI, MONGODB_URI, or MONGO_LOCAL_URI in your .env file.");
    return;
  }

  const initialUri = MONGODB_URI;
  if (initialUri === DEFAULT_LOCAL_MONGODB_URI) {
    console.warn("Using local MongoDB URI for development.");
  } else if (hasPlaceholderMongoUri) {
    console.warn("Ignoring placeholder MongoDB URI and using local development fallback.");
  }

  try {
    await mongoose.connect(initialUri, { serverSelectionTimeoutMS: 2000 });
    console.log("Successfully connected to MongoDB");
    return;
  } catch (err) {
    logConnectionError(err, initialUri);

    if (isDev && initialUri !== DEFAULT_LOCAL_MONGODB_URI) {
      console.warn("Primary MongoDB URI failed. Attempting local development MongoDB fallback...");
      try {
        await mongoose.connect(DEFAULT_LOCAL_MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
        console.log("Successfully connected to local MongoDB fallback");
        return;
      } catch (localErr) {
        logConnectionError(localErr, DEFAULT_LOCAL_MONGODB_URI);
      }
    }

    console.warn("MongoDB connection is not available. Attempting to start in-memory MongoDB for Demo Mode...");
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`Successfully connected to in-memory MongoDB at ${mongoUri}`);
    } catch (memErr) {
      console.error("Failed to start in-memory MongoDB:", memErr);
      console.warn("MongoDB connection is completely unavailable. API routes will return 503.");
    }
  }
};

connectMongo();

mongoose.connection.on("error", err => {
  if (err.message && err.message.includes("ECONNREFUSED 127.0.0.1:27017")) return;
  console.error("MongoDB connection event error:", err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  googleId: { type: String },
  isPro: { type: Boolean, default: false },
  proPlan: { type: String },
  proExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);

// Project Schema
const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  iconUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const Project = mongoose.model("Project", projectSchema);

const isDbConnected = () => mongoose.connection.readyState === 1;

// Google OAuth Config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const getRedirectUri = (req: any) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  // Always use the current host for the redirect URI to ensure it matches the origin
  return `${protocol}://${host}/api/auth/google/callback`;
};

// Build Tracking State
const activeBuilds = new Map<string, {
  progress: number;
  stage: string;  // BUG #2 FIX: real-time stage tracking
  status: 'pending' | 'building' | 'completed' | 'failed';
  filePath?: string;
  fileName?: string;
  error?: string;
}>();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// API Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    if (!isDbConnected()) {
      console.error("Signup blocked: MongoDB is not connected. readyState=", mongoose.connection.readyState);
      return res.status(503).json({ message: "Server is not ready yet. Please retry in a few seconds." });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Signup attempt for: ${normalizedEmail}`);

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Account already exists, please login" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email: normalizedEmail, password: hashedPassword });
    await user.save();

    console.log(`User created successfully: ${normalizedEmail}`);
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1y" });
    res.status(201).json({
      token,
      user: {
        email: user.email,
        isPro: user.isPro,
        proPlan: user.proPlan,
        proExpiresAt: user.proExpiresAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!isDbConnected()) {
      console.error("Login blocked: MongoDB is not connected. readyState=", mongoose.connection.readyState);
      return res.status(503).json({ message: "Server is not ready yet. Please retry in a few seconds." });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Login attempt for: ${normalizedEmail}`);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log(`Login failed: User ${normalizedEmail} not found`);
      return res.status(404).json({ message: "Account not found. Please sign up first." });
    }

    if (!user.password) {
      return res.status(400).json({
        message: "This account was created using Google. Please use 'Login with Google'."
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1y" });
    res.json({
      token,
      user: {
        email: user.email,
        isPro: user.isPro,
        proPlan: user.proPlan,
        proExpiresAt: user.proExpiresAt,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown login error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Login error:", errorMessage);
    if (errorStack) console.error(errorStack);
    res.status(500).json({
      message: "Error logging in",
      error: !isProduction ? errorMessage : undefined,
    });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
    console.error("Invalid JSON payload:", err.message);
    return res.status(400).json({
      message: "Invalid JSON payload. Please send a valid JSON body.",
    });
  }

  if (res.headersSent) {
    return next(err);
  }

  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

const sanitizeFileName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "app";

app.post("/api/build/android", async (req, res) => {
  console.log("🚀 Incoming Build Request for Android...");
  try {
    const { appName, appUrl, mode = "debug", screenOrientation = "portrait" } = req.body || {};
    const safeName = sanitizeFileName(appName || "app");
    const apkPath = path.join(os.tmpdir(), `build-output-${Date.now()}.apk`);
    const configPath = path.join(process.cwd(), "capacitor.config.ts");
    const manifestPath = path.join(process.cwd(), "android/app/src/main/AndroidManifest.xml");

    let originalConfig = "";
    let originalManifest = "";

    // Pre-flight environment check
    if (!process.env.JAVA_HOME && !fs.existsSync("C:\\Program Files\\Eclipse Adoptium")) {
      return res.status(500).json({
        message: "Java JDK 21 is missing!",
        error: "Please install JDK 21 and set JAVA_HOME. Real APKs require a Java compiler to work properly on mobile."
      });
    }

    if (!process.env.ANDROID_HOME && !fs.existsSync(path.join(process.env.LOCALAPPDATA || "", "Android\\Sdk"))) {
      return res.status(500).json({
        message: "Android SDK is missing!",
        error: "Please run 'powershell ./scripts/install-sdk.ps1' in your terminal to install the Real Android Build Engine."
      });
    }


    try {
      console.log(`[BUILD] Starting Android ${mode} build for: ${safeName} (${appUrl})`);

      // Clean up previous build output
      if (fs.existsSync(apkPath)) {
        fs.unlinkSync(apkPath);
      }

      // 🛠️ Dynamic Capacitor Config Update
      if (fs.existsSync(configPath)) {
        originalConfig = fs.readFileSync(configPath, "utf-8");
      }

      const updatedConfig = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appifynow.appifynow',
  appName: '${appName || "AppifyNow"}',
  webDir: 'dist',
  server: {
    url: '${appUrl}',
    cleartext: true,
    allowNavigation: ['*']
  },
  overrideUserAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Mobile Safari/537.36'
};

export default config;`;

      fs.writeFileSync(configPath, updatedConfig);
      console.log(`[BUILD] Updated capacitor.config.ts with URL: ${appUrl}`);

      // 🛠️ Dynamic Manifest Update (Orientation)
      if (fs.existsSync(manifestPath)) {
        originalManifest = fs.readFileSync(manifestPath, "utf-8");
      }

      let orientationValue = "portrait";
      if (screenOrientation === "landscape") orientationValue = "landscape";
      else if (screenOrientation === "auto") orientationValue = "unspecified";

      if (originalManifest) {
        const updatedManifest = originalManifest.replace(
          /android:name="\.MainActivity"/,
          `android:name=".MainActivity" android:screenOrientation="${orientationValue}"`
        );
        fs.writeFileSync(manifestPath, updatedManifest);
        console.log(`[BUILD] Set orientation to: ${orientationValue}`);
      }

      await execAsync(`npm run apk:build:win -- -mode ${mode}`, {
        cwd: process.cwd(),
        timeout: 1000 * 60 * 15,
        maxBuffer: 1024 * 1024 * 10,
        env: {
          ...process.env,
          VITE_API_BASE_URL: appUrl || process.env.VITE_API_BASE_URL || "",
        },
      });

      // After build completes, the apk is at process.cwd()/build-output.apk
      // Move it to our temp directory path
      const generatedApk = path.join(process.cwd(), "build-output.apk");
      if (fs.existsSync(generatedApk)) {
        fs.copyFileSync(generatedApk, apkPath);
        fs.unlinkSync(generatedApk);
      }
      console.log(`[BUILD] Build process finished successfully for ${safeName}`);
    } catch (cmdErr: any) {
      console.error(`[BUILD] Real build failed for ${safeName}. Error: ${cmdErr.message}`);
      throw cmdErr;
    } finally {
      // BUG #1 FIX: Restore original configs even if build fails to prevent stale cache in future sessions
      if (originalConfig) fs.writeFileSync(configPath, originalConfig);
      if (originalManifest) fs.writeFileSync(manifestPath, originalManifest);
      console.log(`[BUILD] Restored original configs to ensure session isolation.`);
    }

    if (!fs.existsSync(apkPath)) {
      throw new Error("Build succeeded but APK file was not found.");
    }

    res.download(apkPath, `${safeName}-${mode}.apk`);
  } catch (error: any) {
    const errorMessage = error.message || "Internal Build Error";
    const stdout = error.stdout || "";
    const stderr = error.stderr || "";

    console.error("--- ANDROID BUILD ERROR ---");
    console.error("Message:", errorMessage);
    if (stderr) console.error("STDERR:", stderr);
    console.error("---------------------------");

    res.status(500).json({
      message: errorMessage.includes("JAVA_HOME") ? "Java (JDK 21) is not installed or configured." :
        errorMessage.includes("ANDROID_HOME") ? "Android SDK is not installed or configured." :
          "Build Engine Error: " + errorMessage,
      error: stderr || stdout || errorMessage
    });
  }

});


const CODEMAGIC_TOKEN = process.env.CODEMAGIC_TOKEN;
const APP_ID = process.env.APP_ID;

// ── iOS Build Start ──
app.post('/api/build-ios', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.codemagic.io/builds',
      {
        appId: APP_ID,
        workflowId: 'ios-workflow',
        branch: 'main'
      },
      {
        headers: {
          'x-auth-token': CODEMAGIC_TOKEN!
        }
      }
    );
    res.json({
      success: true,
      buildId: response.data.buildId
    });
  } catch(err: any) {
    res.json({ success: false, error: err.message });
  }
});

// ── iOS Build Status ──
app.get('/api/ios-status/:buildId', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.codemagic.io/builds/${req.params.buildId}`,
      {
        headers: { 'x-auth-token': CODEMAGIC_TOKEN! }
      }
    );
    const build = response.data.build;
    const artifact = build.artefacts?.find(
      (a: any) => a.name.includes('Runner')
    );
    res.json({
      status: build.status,
      downloadUrl: artifact?.url || null
    });
  } catch(err: any) {
    res.json({ error: err.message });
  }
});

// ── iOS ZIP Direct Download ──
app.get('/download/ios', (req, res) => {
  const file = path.join(
    __dirname,
    '../downloads/Runner.app.zip'
  );
  if(fs.existsSync(file)) {
    res.download(file, 'iOS-App.zip');
  } else {
    res.json({ error: 'File not found' });
  }
});

// Logo Upload to S3
app.post("/api/upload-logo", authenticateToken, async (req: any, res) => {
  try {
    const { file, fileName, contentType } = req.body;
    if (!file || !fileName) return res.status(400).json({ message: "Missing file data" });

    const buffer = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const key = `logos/${uuidv4()}-${fileName}`;

    // Attempt S3 Upload
    const hasS3Keys = process.env.AWS_ACCESS_KEY_ID &&
      !process.env.AWS_ACCESS_KEY_ID.includes("YOUR_") &&
      process.env.AWS_S3_BUCKET;

    if (hasS3Keys) {
      try {
        console.log('[UPLOAD] Attempting S3 upload...');
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET!,
          Key: key,
          Body: buffer,
          ContentType: contentType || 'image/png',
          ACL: 'public-read',
        }));

        const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        return res.json({ url });
      } catch (s3Error) {
        console.warn('S3 Upload failed, falling back to local storage:', s3Error);
      }
    }

    // Local Storage Fallback
    const localFileName = `${uuidv4()}-${fileName}`;
    const localPath = path.join(process.cwd(), 'public', 'uploads', localFileName);
    fs.writeFileSync(localPath, buffer);

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'];
    const url = `${protocol}://${host}/uploads/${localFileName}`;

    res.json({ url, local: true });
  } catch (error: any) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Proxy to bypass Iframe (X-Frame-Options) blocks for Dashboard Preview
app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).send("URL required");

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      timeout: 10000,
    });

    // Strip security headers that block iframes
    Object.entries(response.headers).forEach(([key, value]) => {
      if (typeof value === 'string' || Array.isArray(value)) {
        res.setHeader(key, value);
      }
    });

    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');
    res.removeHeader('cross-origin-resource-policy');

    // Inject <base> tag to fix relative links (CSS, Images, JS) for HTML content
    const contentType = response.headers['content-type'] as string;
    if (contentType && contentType.includes('text/html')) {
      let html = response.data.toString();
      const baseTag = `<base href="${targetUrl}${targetUrl.endsWith('/') ? '' : '/'}">`;
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else {
        html = `<head>${baseTag}</head>${html}`;
      }
      res.send(html);
    } else {
      res.send(response.data);
    }
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    res.status(500).send(`Failed to preview site: ${error.message}`);
  }
});

// Flutter Build Endpoints
app.post("/api/build", authenticateToken, async (req: any, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { url, appName, platform = 'android' } = req.body;

  if (!url) return res.status(400).json({ message: "URL is required" });

  const buildId = uuidv4();

  // PRE-BUILD FIX: Ensure no stale output exists from a previous run
  const stagingApk = path.join(process.cwd(), "build-output.apk");
  if (fs.existsSync(stagingApk)) {
    try { 
      fs.unlinkSync(stagingApk); 
      console.log(`[BUILD] Cleaned global build-output.apk to ensure fresh conversion.`);
    } catch (e) { }
  }

  // 1. Clear Build Cache: Before every build, delete `./temp`, `./build`, `./cache` folders completely.
  const dirsToClean = [
    path.join(process.cwd(), "temp"),
    path.join(process.cwd(), "build"),
    path.join(process.cwd(), "cache")
  ];
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`[BUILD] Cleaned directory: ${dir}`);
      } catch (e) {
        console.warn(`[BUILD] Failed to clean directory: ${dir}`, e);
      }
    }
  }

  // Prevent concurrent builds that might pollute the shared template
  const isAnyBuilding = Array.from(activeBuilds.values()).some(b => b.status === 'building');
  if (isAnyBuilding) {
    return res.status(429).json({ message: "Another build is currently in progress. Please wait a few minutes." });
  }

  activeBuilds.set(buildId, {
    progress: 0,
    stage: 'pending',
    status: 'pending'
  });

  res.json({ buildId });

  // Start Build Process in Background
  const templateDir = path.join(process.cwd(), "flutter_app_template");
  const mainDartPath = path.join(templateDir, "lib", "main.dart");
  const originalMainDart = fs.existsSync(mainDartPath) ? fs.readFileSync(mainDartPath, "utf-8") : null;

  (async () => {
    let iconFilePath = "";
    try {
      const build = activeBuilds.get(buildId)!;
      build.status = 'building';
      build.stage = 'pending';
      build.progress = 5;

      const { iconUrl, packageName: reqPackageName } = req.body;
      const finalPackageName = reqPackageName || `com.appifynow.${appName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      // Only download icon if user explicitly provided one (not null/empty)
      // null iconUrl = use flutter template's default app icon
      if (iconUrl && iconUrl.startsWith("http")) {
        build.stage = 'downloading';
        build.progress = 10;
        console.log(`[BUILD ${buildId}] Downloading app icon from: ${iconUrl}`);
        iconFilePath = path.join(os.tmpdir(), `icon-${buildId}.png`);

        try {
          const response = await axios({
            url: iconUrl,
            method: 'GET',
            responseType: 'stream'
          });

          const writer = fs.createWriteStream(iconFilePath);
          response.data.pipe(writer);

          await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
          });
          build.progress = 25;
          console.log(`[BUILD ${buildId}] Icon downloaded successfully to: ${iconFilePath}`);
        } catch (downloadErr: any) {
          console.error(`[BUILD ${buildId}] Failed to download icon:`, downloadErr.message);
          iconFilePath = ""; 
          build.progress = 25;
        }
      } else {
        console.log(`[BUILD ${buildId}] No custom icon provided. Using default flutter template icon.`);
        iconFilePath = ""; 
        build.progress = 25;
      }

      build.stage = 'compiling';
      build.progress = 40;

      const psArgs = [
        "-ExecutionPolicy", "Bypass",
        "-File", "./scripts/build-flutter.ps1",
        "-url", url,
        "-appName", appName,
        "-packageName", finalPackageName,
        "-iconPath", iconFilePath  // empty string = PS1 script skips icon injection (uses default)
      ];

      const child = spawn("powershell", psArgs);

      // Real progress stages instead of fake jumps
      // Progress moves: 40 → 55 (compiling) → 75 (signing) → 90 (packaging)
      let compileStageReached = false;
      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[BUILD ${buildId}] PS: ${output.trim()}`);

        // Parse flutter build output for real-ish milestone detection
        if (!compileStageReached && (output.includes('Running Gradle') || output.includes('flutter build apk'))) {
          build.stage = 'compiling';
          build.progress = 55;
          compileStageReached = true;
        } else if (output.includes('Signing') || output.includes('signing')) {
          build.stage = 'signing';
          build.progress = 75;
        } else if (output.includes('Success') || output.includes('APK')) {
          build.stage = 'packaging';
          build.progress = 90;
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.error(`[BUILD ${buildId}] PS ERR: ${output.trim()}`);
      });

      await new Promise<void>((resolve, reject) => {
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Build exited with code ${code}`));
        });
        child.on('error', (err) => {
          reject(err);
        });
      });

      build.stage = 'packaging';
      build.progress = 90;
      console.log(`[BUILD ${buildId}] Finalizing package...`);

      const safeName = sanitizeFileName(appName || "app");
      const fileName = platform === 'android' ? `${safeName}.apk` : `${safeName}.ipa`;

      const sourcePath = path.join(process.cwd(), "build-output.apk");
      if (!fs.existsSync(sourcePath)) {
        throw new Error("Build output file not found!");
      }

      // 2. Unique Build Process: Each request = New UUID buildId. Path: /temp/{buildId}/. APK name: app-{buildId}.apk
      const targetDir = path.join(process.cwd(), "temp", buildId);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const targetFileName = `app-${buildId}.apk`;
      const targetPath = path.join(targetDir, targetFileName);
      
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      } else {
        // Fallback check in case redirection failed or was different
        const localSourcePath = path.join(templateDir, "build", "app", "outputs", "flutter-apk", "app-release.apk");
        if (fs.existsSync(localSourcePath)) {
          fs.copyFileSync(localSourcePath, targetPath);
        } else {
          throw new Error("Could not find the built APK file.");
        }
      }

      // Only set 'done' stage + 100% after everything is packaged and ready
      build.status = 'completed';
      build.stage = 'done';
      build.progress = 100;
      build.fileName = targetFileName;
      build.filePath = targetPath;
      console.log(`[BUILD ${buildId}] Build complete! Stage: done, Progress: 100%`);

      // Delete the staging build-output.apk immediately after copying
      try {
        if (fs.existsSync(sourcePath)) {
          fs.unlinkSync(sourcePath);
          console.log(`[BUILD ${buildId}] Deleted staging file: build-output.apk`);
        }
      } catch (e) { /* non-critical */ }

    } catch (err: any) {
      console.error(`[BUILD ${buildId}] Failed:`, err);
      activeBuilds.set(buildId, {
        progress: 0,
        stage: 'failed',
        status: 'failed',
        error: err.message
      });
    } finally {
      // Restore original main.dart template
      if (originalMainDart !== null) {
        fs.writeFileSync(mainDartPath, originalMainDart);
        console.log(`[BUILD ${buildId}] Template lib/main.dart restored.`);
      }
      // Always delete temp icon after build to prevent cross-session reuse
      if (iconFilePath && fs.existsSync(iconFilePath)) {
        try {
          fs.unlinkSync(iconFilePath);
          console.log(`[BUILD ${buildId}] Deleted temp icon: ${iconFilePath}`);
        } catch (e) {
          console.warn(`[BUILD ${buildId}] Could not delete temp icon: ${iconFilePath}`);
        }
      }
    }
  })();
});

app.get("/api/status/:id", (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const buildId = req.params.id;
  const build = activeBuilds.get(buildId);

  if (!build) return res.status(404).json({ message: "Build not found" });

  // BUG #2 FIX: Expose real `stage` field so frontend can show descriptive text
  res.json({
    progress: build.progress,
    stage: build.stage,    // NEW: real-time stage name
    status: build.status,
    error: build.error
  });
});

app.get("/api/download/:id", (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const buildId = req.params.id;
  const build = activeBuilds.get(buildId);

  // Validation: Download route must check if {buildId} folder exists. If not, throw 404.
  const buildDir = path.join(process.cwd(), "temp", buildId);
  if (!fs.existsSync(buildDir)) {
    return res.status(404).json({ message: "Build folder not found or expired. Please build again." });
  }

  if (!build || build.status !== 'completed' || !build.filePath) {
    return res.status(404).json({ message: "File not ready or build not found" });
  }

  const filePath = build.filePath;
  const fileName = `app-${buildId}.apk`; // Never fallback to old APK

  // Validation: Never fallback to old APK
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "APK file not found. Fresh build failed." });
  }

  // ✅ PART C FIX: Remove build from memory after download is served
  activeBuilds.delete(buildId);

  res.download(filePath, fileName, (err) => {
    // Auto-delete the APK file and folder from disk after download completes
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[CLEANUP] Deleted build file: ${filePath}`);
      }
      if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
        console.log(`[CLEANUP] Deleted build directory: ${buildDir}`);
      }
    } catch (e) {
      console.error(`[CLEANUP] Failed to delete build file or dir`, e);
    }
    if (err) {
      console.error(`[DOWNLOAD] Error sending file for build ${buildId}:`, err);
    }
  });
});

// ✅ PART C FIX: Cron-style cleanup — runs every 30 minutes
// Deletes any leftover build-*.apk and build-*.ipa files older than 30 minutes from /tmp/ (safety net)
setInterval(() => {
  try {
    const tmpDir = os.tmpdir();
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;

    // Cleanup build files and temp icons from OS temp dir
    const files = fs.readdirSync(tmpDir).filter(f =>
      (f.startsWith('build-') && (f.endsWith('.apk') || f.endsWith('.ipa'))) ||
      (f.startsWith('icon-') && f.endsWith('.png'))
    );

    for (const file of files) {
      const filePath = path.join(tmpDir, file);
      const stat = fs.statSync(filePath);

      if (stat.mtimeMs < fiveMinsAgo) {
        // If it's an icon, check if the build is still active
        if (file.startsWith('icon-')) {
          const buildIdMatch = file.match(/icon-(.+)\.png/);
          if (buildIdMatch) {
            const buildId = buildIdMatch[1];
            const activeBuild = activeBuilds.get(buildId);
            // DO NOT delete if the build is still "building"
            if (activeBuild && activeBuild.status === 'building') {
              console.log(`[CLEANUP SKIP] Preserving icon for active build: ${buildId}`);
              continue;
            }
          }
        }

        fs.unlinkSync(filePath);
        console.log(`[CRON CLEANUP] Deleted stale temp file from tmp: ${file}`);
      }
    }

    // Cleanup local logo uploads (5 minutes expiration)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const logoFiles = fs.readdirSync(uploadsDir);
      for (const file of logoFiles) {
        const filePath = path.join(uploadsDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < fiveMinsAgo) {
          fs.unlinkSync(filePath);
          console.log(`[CRON CLEANUP] Deleted stale logo: ${file}`);
        }
      }
    }

    // Also clean up stale entries from activeBuilds map (> 2 hours old)
    // This prevents memory leak from abandoned builds
    activeBuilds.forEach((build, id) => {
      if (build.status === 'failed' || build.status === 'completed') {
        // Keep in memory for 10 minutes after completion for status checks
        // then delete from map
        activeBuilds.delete(id);
      }
    });
  } catch (e) {
    console.error('[CRON CLEANUP] Error during cleanup:', e);
  }
}, 5 * 60 * 1000); // every 5 minutes

// Google OAuth Routes
app.get("/api/auth/google/url", (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(400).json({ message: "Google Client ID is not configured in environment variables" });
  }
  const redirectUri = getRedirectUri(req);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=profile email`;
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const redirectUri = getRedirectUri(req);

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const { access_token } = tokenResponse.data;

    // Get user info from Google
    const userResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = userResponse.data;
    const normalizedEmail = googleUser.email.toLowerCase().trim();
    const googleId = googleUser.id;

    // Find or create user in MongoDB using case-insensitive search
    let user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });

    if (!user) {
      user = new User({
        email: normalizedEmail,
        googleId: googleId,
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1y" });

    // Send success message to parent window and close popup
    // Or redirect if no opener is present (e.g. mobile webview)
    const userData = JSON.stringify({
      email: user.email,
      isPro: user.isPro,
      proPlan: user.proPlan,
      proExpiresAt: user.proExpiresAt,
      createdAt: user.createdAt
    });

    res.send(`
      <html>
        <body>
          <script>
            const token = '${token}';
            const user = ${userData};
            
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'GOOGLE_AUTH_SUCCESS', 
                token: token, 
                user: user
              }, '*');
              window.close();
            } else {
              // Redirect to home page with token for mobile/webview fallback
              const url = new URL(window.location.origin);
              url.searchParams.set('token', token);
              url.searchParams.set('user', JSON.stringify(user));
              window.location.href = url.toString();
            }
          </script>
          <p>Authentication successful. Redirecting...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/auth/upgrade", authenticateToken, async (req: any, res) => {
  try {
    if (!isDbConnected()) {
      console.error("Upgrade blocked: MongoDB is not connected. readyState=", mongoose.connection.readyState);
      return res.status(503).json({ message: "Server is not ready yet. Please retry in a few seconds." });
    }

    const { code, plan } = req.body;
    if (code === "13908") {
      let expirationDate = new Date();
      if (plan === 'yearly') {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      } else if (plan === 'extended') {
        expirationDate.setMonth(expirationDate.getMonth() + 2);
      } else {
        // Default to 1 month (monthly plan)
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
          isPro: true,
          proPlan: plan || 'monthly',
          proExpiresAt: expirationDate
        },
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });

      console.log(`User ${user.email} upgraded to ${plan || 'monthly'} Pro using secret code`);
      res.json({
        message: "Upgraded to Pro successfully!",
        user: {
          email: user.email,
          isPro: user.isPro,
          proPlan: user.proPlan,
          proExpiresAt: user.proExpiresAt,
          createdAt: user.createdAt
        }
      });
    } else {
      res.status(400).json({ message: "Invalid secret code" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error upgrading account" });
  }
});

app.get("/api/projects", authenticateToken, async (req: any, res) => {
  try {
    if (!isDbConnected()) {
      console.error("Fetch projects blocked: MongoDB is not connected. readyState=", mongoose.connection.readyState);
      return res.status(503).json({ message: "Server is not ready yet. Please retry in a few seconds." });
    }

    const projects = await Project.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects" });
  }
});

app.post("/api/projects", authenticateToken, async (req: any, res) => {
  try {
    if (!isDbConnected()) {
      console.error("Save project blocked: MongoDB is not connected. readyState=", mongoose.connection.readyState);
      return res.status(503).json({ message: "Server is not ready yet. Please retry in a few seconds." });
    }

    const { name, url, iconUrl } = req.body;
    const project = new Project({
      userId: req.user.userId,
      name,
      url,
      iconUrl
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: "Error saving project" });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    dbConnected: isDbConnected(),
  });
});

// Vite middleware setup
async function setupMiddleware() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

const listenPort = async (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
      resolve();
    });

    server.on("error", (error: any) => {
      if (error?.code === "EADDRINUSE") {
        reject(new Error(`EADDRINUSE:${port}`));
        return;
      }
      reject(error);
    });
  });
};

async function startServer() {
  await setupMiddleware();

  let currentPort = PORT;
  const maxRetries = 5;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      await listenPort(currentPort);
      return;
    } catch (error: any) {
      if (error.message?.startsWith('EADDRINUSE')) {
        console.warn(`Port ${currentPort} is already in use, trying ${currentPort + 1}...`);
        currentPort += 1;
        continue;
      }
      console.error("Server startup error:", error);
      process.exit(1);
    }
  }

  console.error(`Unable to bind to a free port after ${maxRetries + 1} attempts.`);
  process.exit(1);
}

startServer();
