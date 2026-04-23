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
import { exec } from "child_process";

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
    const { appName, appUrl, mode = "debug" } = req.body || {};
    const safeName = sanitizeFileName(appName || "app");
    const apkPath = path.join(process.cwd(), "build-output.apk");

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

      await execAsync(`npm run apk:build:win -- -mode ${mode}`, {
        cwd: process.cwd(),
        timeout: 1000 * 60 * 15,
        maxBuffer: 1024 * 1024 * 10,
        env: {
          ...process.env,
          VITE_API_BASE_URL: appUrl || process.env.VITE_API_BASE_URL || "",
        },
      });
      console.log(`[BUILD] Build process finished successfully for ${safeName}`);
    } catch (cmdErr: any) {
      console.error(`[BUILD] Real build failed for ${safeName}. Error: ${cmdErr.message}`);
      throw cmdErr;
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


app.post("/api/build/ios", async (_req, res) => {
  const testflightUrl = process.env.TESTFLIGHT_URL || "https://testflight.apple.com/";
  const placeholderIpaPath = path.join(process.cwd(), "ios-download-link.txt");
  fs.writeFileSync(placeholderIpaPath, `Open this link to continue iOS install:\n${testflightUrl}\n`);
  res.download(placeholderIpaPath, "ios-download-link.txt");
});

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
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'GOOGLE_AUTH_SUCCESS', 
              token: '${token}', 
              user: ${JSON.stringify({ 
                email: user.email,
                isPro: user.isPro,
                proPlan: user.proPlan,
                proExpiresAt: user.proExpiresAt,
                createdAt: user.createdAt
              })} 
            }, '*');
            window.close();
          </script>
          <p>Authentication successful. You can close this window.</p>
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
      if (plan === 'extended') {
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
