import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '2515';

app.use(express.json());

// Initialize data storage directory and file
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'sites.json');
const MIRROR_FILE = path.join(DATA_DIR, 'sites_mirror.json');
const BACKUP_FILE = path.join(DATA_DIR, 'backup_sites.json');
const SCREENSHOTS_DIR = path.join(DATA_DIR, 'screenshots');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_FILE)) {
  fs.writeFileSync(BACKUP_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
}
if (!fs.existsSync(MIRROR_FILE)) {
  fs.writeFileSync(MIRROR_FILE, JSON.stringify([], null, 2), 'utf-8');
}

app.use('/api/screenshots', express.static(SCREENSHOTS_DIR));

export interface SiteItem {
  id: string;
  url: string;
  title: string;
  description: string;
  category: string;
  faviconUrl: string;
  previewImageUrl: string;
  createdAt: number;
  visitCount?: number;
  displayOrder?: number;
}

function getStoredSites(): SiteItem[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Fallback to mirror backup if main file was empty or corrupted
    if (fs.existsSync(MIRROR_FILE)) {
      const content = fs.readFileSync(MIRROR_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error reading sites:', error);
    try {
      if (fs.existsSync(MIRROR_FILE)) {
        const content = fs.readFileSync(MIRROR_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

function saveStoredSites(sites: SiteItem[]) {
  try {
    const jsonStr = JSON.stringify(sites, null, 2);
    fs.writeFileSync(DATA_FILE, jsonStr, 'utf-8');
    // Always write mirror copy synchronously to guarantee dual-copy persistence
    fs.writeFileSync(MIRROR_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Error saving sites to disk:', err);
  }
}

// Initialize Gemini client if API key is configured
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (e) {
    console.warn('Could not initialize GoogleGenAI:', e);
  }
}

// In-memory brute force protection for PIN verification
interface AttemptRecord {
  failedCount: number;
  lockoutUntil: number;
}
const pinAttempts = new Map<string, AttemptRecord>();

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'client';
}

const adminTokens = new Map<string, number>();

// Middleware to check Admin PIN or Session Token with Brute Force Protection
function verifyPin(req: Request, res: Response, next: () => void) {
  const token = (req.headers['x-admin-token'] || req.body?.token) as string | undefined;
  if (token && adminTokens.has(token)) {
    const expiresAt = adminTokens.get(token)!;
    if (Date.now() < expiresAt) {
      return next();
    }
    adminTokens.delete(token);
  }

  const clientKey = getClientIdentifier(req);
  const now = Date.now();
  const record = pinAttempts.get(clientKey) || { failedCount: 0, lockoutUntil: 0 };

  if (record.lockoutUntil > now) {
    const remainingSecs = Math.ceil((record.lockoutUntil - now) / 1000);
    return res.status(429).json({
      error: `Security Lockout: Too many failed passcode attempts. Please wait ${remainingSecs} seconds.`,
      lockedOut: true,
      remainingSecs,
    });
  }

  const pin = req.headers['x-admin-pin'] || req.body?.pin;
  if (pin === ADMIN_PIN) {
    pinAttempts.delete(clientKey);
    return next();
  }

  record.failedCount += 1;
  if (record.failedCount >= 5) {
    record.lockoutUntil = now + 60 * 1000;
  }
  pinAttempts.set(clientKey, record);

  return res.status(401).json({
    error: record.lockoutUntil > now
      ? 'Security Lockout: Maximum attempts exceeded. Locked for 60 seconds.'
      : 'Invalid security passcode. Access denied.',
    attemptsRemaining: Math.max(0, 5 - record.failedCount),
  });
}

// Verify PIN endpoint with Brute Force Rate Limiting and Token Issuance
app.post('/api/verify-pin', (req: Request, res: Response) => {
  const clientKey = getClientIdentifier(req);
  const now = Date.now();
  const record = pinAttempts.get(clientKey) || { failedCount: 0, lockoutUntil: 0 };

  if (record.lockoutUntil > now) {
    const remainingSecs = Math.ceil((record.lockoutUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      error: `Security Lockout: Too many failed passcode attempts. Locked for ${remainingSecs}s.`,
      lockedOut: true,
      remainingSecs,
    });
  }

  const { pin } = req.body;
  if (pin === ADMIN_PIN) {
    pinAttempts.delete(clientKey);
    // Issue secure ephemeral token valid for 20 minutes
    const token = 'hmhs_sec_' + Date.now() + '_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    adminTokens.set(token, now + 20 * 60 * 1000);
    return res.json({
      success: true,
      token,
      message: 'Owner passcode verified successfully'
    });
  }

  record.failedCount += 1;
  if (record.failedCount >= 5) {
    record.lockoutUntil = now + 60 * 1000;
  }
  pinAttempts.set(clientKey, record);

  const remaining = Math.max(0, 5 - record.failedCount);
  return res.status(401).json({
    success: false,
    error: record.lockoutUntil > now
      ? 'Security Lockout: Maximum attempts exceeded. Locked for 60 seconds.'
      : `Incorrect security passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    attemptsRemaining: remaining,
  });
});

// GET all sites
app.get('/api/sites', (_req: Request, res: Response) => {
  const sites = getStoredSites();
  // Sort by displayOrder if available, else newest first
  sites.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || b.createdAt - a.createdAt);
  res.json({ sites });
});

// Incremental visit count tracking for quick access
app.post('/api/sites/:id/visit', (req: Request, res: Response) => {
  const { id } = req.params;
  const sites = getStoredSites();
  const index = sites.findIndex((s) => s.id === id);
  if (index !== -1) {
    sites[index].visitCount = (sites[index].visitCount || 0) + 1;
    saveStoredSites(sites);
    return res.json({ success: true, visitCount: sites[index].visitCount });
  }
  res.status(404).json({ error: 'Site not found' });
});

// Helper to normalize URLs
function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

// Extract meta tags from HTML
function extractMetadataFromHtml(html: string, pageUrl: string) {
  let title = '';
  let description = '';
  let ogImage = '';
  let favicon = '';

  try {
    const parsedUrl = new URL(pageUrl);
    const origin = parsedUrl.origin;

    // Title extraction
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = ogTitleMatch?.[1] || titleMatch?.[1] || parsedUrl.hostname;

    // Clean up title
    title = title.replace(/\s+/g, ' ').trim();

    // Description extraction
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    description = ogDescMatch?.[1] || descMatch?.[1] || '';
    description = description.replace(/\s+/g, ' ').trim();

    // OG Image
    const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImgMatch?.[1]) {
      ogImage = ogImgMatch[1];
      if (ogImage.startsWith('//')) {
        ogImage = 'https:' + ogImage;
      } else if (ogImage.startsWith('/')) {
        ogImage = origin + ogImage;
      }
    }

    // Favicon
    const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i) ||
                      html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    if (iconMatch?.[1]) {
      favicon = iconMatch[1];
      if (favicon.startsWith('//')) {
        favicon = 'https:' + favicon;
      } else if (favicon.startsWith('/')) {
        favicon = origin + favicon;
      }
    } else {
      favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`;
    }
  } catch (err) {
    console.error('Metadata parse error:', err);
  }

  return { title, description, ogImage, favicon };
}

// POST /api/fetch-site-info: Auto-fetch website details and generate live homepage preview pic
app.post('/api/fetch-site-info', async (req: Request, res: Response) => {
  const { url: rawUrl } = req.body;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const targetUrl = normalizeUrl(rawUrl);
    const parsed = new URL(targetUrl);
    const domain = parsed.hostname.replace(/^www\./, '');

    // 1. High-resolution live homepage screenshot URL
    // WordPress mshots renders live desktop screenshots of any accessible website
    const screenshotUrl = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1280`;
    // Thum.io alternative screenshot URL
    const altScreenshotUrl = `https://image.thum.io/get/width/1200/crop/750/noanimate/${targetUrl}`;
    const defaultFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;

    let fetchedTitle = domain;
    let fetchedDescription = '';
    let ogImage = '';
    let fetchedFavicon = defaultFavicon;
    let microlinkScreenshot = '';
    let microlinkImage = '';

    // 1. Fetch Microlink high-resolution headless screenshot and metadata
    try {
      const microlinkController = new AbortController();
      const mTimeout = setTimeout(() => microlinkController.abort(), 7000);
      const microlinkRes = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=true`,
        { signal: microlinkController.signal }
      );
      clearTimeout(mTimeout);

      if (microlinkRes.ok) {
        const mData = await microlinkRes.json();
        if (mData.status === 'success' && mData.data) {
          if (mData.data.title) fetchedTitle = mData.data.title;
          if (mData.data.description) fetchedDescription = mData.data.description;
          if (mData.data.screenshot?.url) microlinkScreenshot = mData.data.screenshot.url;
          if (mData.data.image?.url) microlinkImage = mData.data.image.url;
          if (mData.data.logo?.url) fetchedFavicon = mData.data.logo.url;
        }
      }
    } catch (mErr) {
      console.warn('Microlink fetch fallback:', mErr);
    }

    // 2. Fetch site direct HTML if needed for meta tags & favicon
    if (!ogImage || !fetchedDescription || fetchedTitle === domain) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const html = await response.text();
          const meta = extractMetadataFromHtml(html, targetUrl);
          if (meta.title && fetchedTitle === domain) fetchedTitle = meta.title;
          if (meta.description && !fetchedDescription) fetchedDescription = meta.description;
          if (meta.ogImage) ogImage = meta.ogImage;
          if (meta.favicon && fetchedFavicon === defaultFavicon) fetchedFavicon = meta.favicon;
        }
      } catch {
        // Silent fallback
      }
    }

    // High quality screenshot fallbacks
    const thumIoScreenshot = `https://image.thum.io/get/width/1440/crop/900/noanimate/${targetUrl}`;
    const wpMshots = `https://s0.wp.com/mshots/v1/${encodeURIComponent(targetUrl)}?w=1440`;

    // Download & persist the cloud computer screenshot locally to avoid broken links
    let localScreenshotUrl = '';
    const remoteShot = microlinkScreenshot || thumIoScreenshot;
    if (remoteShot) {
      try {
        const imgRes = await fetch(remoteShot);
        if (imgRes.ok && imgRes.headers.get('content-type')?.includes('image')) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const filename = `cloud_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
          const filepath = path.join(SCREENSHOTS_DIR, filename);
          fs.writeFileSync(filepath, buffer);
          localScreenshotUrl = `/api/screenshots/${filename}`;
        }
      } catch (saveErr) {
        console.warn('Could not save cloud computer screenshot locally:', saveErr);
      }
    }

    // Pick best preview image
    const bestScreenshot = localScreenshotUrl || microlinkScreenshot || thumIoScreenshot || wpMshots;
    const bestBanner = microlinkImage || ogImage || null;
    const previewImageUrl = bestScreenshot || bestBanner || thumIoScreenshot;

    // AI Refinement & Categorization via Gemini 3.8 Flash if available
    let aiSummary = fetchedDescription;
    let aiCategory = 'Projects';
    let aiCleanTitle = fetchedTitle;

    if (aiClient) {
      try {
        const prompt = `Analyze this website information:
URL: ${targetUrl}
Domain: ${domain}
Extracted Title: ${fetchedTitle}
Extracted Description: ${fetchedDescription}

Provide a JSON object with:
- "cleanTitle": concise, natural, elegant brand/site title (maximum 40 chars, no SEO keyword stuffing or pipe clutter).
- "cleanSummary": a clear, attractive 1-sentence description in English or Urdu-friendly plain language explaining what this site is (maximum 120 chars).
- "category": one clean single-word category from [Portfolio, Projects, Apps, Tools, Business, Media, Blog, Other].

Return strictly valid JSON only.`;

        const geminiRes = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const textOutput = geminiRes.text?.trim();
        if (textOutput) {
          const aiData = JSON.parse(textOutput);
          if (aiData.cleanTitle) aiCleanTitle = aiData.cleanTitle;
          if (aiData.cleanSummary) aiSummary = aiData.cleanSummary;
          if (aiData.category) aiCategory = aiData.category;
        }
      } catch {
        // Silent fallback on Gemini quota or rate limit
      }
    }

    return res.json({
      url: targetUrl,
      domain,
      title: aiCleanTitle || domain,
      description: aiSummary || `Explore ${domain}`,
      category: aiCategory || 'Projects',
      faviconUrl: fetchedFavicon || defaultFavicon,
      previewImageUrl,
      screenshotUrl: bestScreenshot,
      bannerUrl: bestBanner,
      thumIoScreenshot,
      wpMshots,
    });
  } catch (error: any) {
    return res.status(400).json({
      error: 'Invalid URL provided',
      details: error?.message || 'Failed to process website URL',
    });
  }
});

// POST /api/sites/sync: Bidirectional sync between client localStorage and server
app.post('/api/sites/sync', (req: Request, res: Response) => {
  const { sites: clientSites } = req.body;
  const serverSites = getStoredSites();

  const map = new Map<string, SiteItem>();
  // 1. Index server sites
  for (const s of serverSites) {
    if (s && s.url) {
      map.set(s.url.toLowerCase().trim(), s);
    }
  }
  // 2. Merge client sites
  if (Array.isArray(clientSites)) {
    for (const c of clientSites) {
      if (c && c.url) {
        const key = c.url.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, c);
        } else {
          const existing = map.get(key)!;
          map.set(key, {
            ...c,
            ...existing,
            visitCount: Math.max(existing.visitCount || 0, c.visitCount || 0),
          });
        }
      }
    }
  }

  const merged = Array.from(map.values()).sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || b.createdAt - a.createdAt
  );
  saveStoredSites(merged);
  return res.json({ success: true, sites: merged });
});

// POST /api/sites: Add or update site (Protected by PIN 2515)
app.post('/api/sites', verifyPin, (req: Request, res: Response) => {
  const { url, title, description, category, faviconUrl, previewImageUrl } = req.body;

  if (!url || !title) {
    return res.status(400).json({ error: 'URL and title are required' });
  }

  if (!previewImageUrl || typeof previewImageUrl !== 'string' || previewImageUrl.trim().length < 8) {
    return res.status(400).json({ error: 'A valid picture URL or screenshot is required to publish.' });
  }

  const normalized = normalizeUrl(url);
  const sites = getStoredSites();

  // If already exists, update and return success (idempotent)
  const existingIndex = sites.findIndex((s) => s.url.toLowerCase() === normalized.toLowerCase());
  if (existingIndex !== -1) {
    sites[existingIndex].title = String(title).trim();
    if (description) sites[existingIndex].description = String(description).trim();
    if (category) sites[existingIndex].category = String(category).trim();
    if (previewImageUrl) sites[existingIndex].previewImageUrl = String(previewImageUrl).trim();
    if (faviconUrl) sites[existingIndex].faviconUrl = String(faviconUrl).trim();
    saveStoredSites(sites);
    return res.json({
      success: true,
      message: 'Site updated successfully!',
      site: sites[existingIndex],
    });
  }

  const newSite: SiteItem = {
    id: 'site_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    url: normalized,
    title: String(title).trim(),
    description: String(description || '').trim(),
    category: String(category || 'Projects').trim(),
    faviconUrl: faviconUrl || `https://www.google.com/s2/favicons?domain=${new URL(normalized).hostname}&sz=128`,
    previewImageUrl: previewImageUrl || `https://image.thum.io/get/width/1440/crop/900/noanimate/${normalized}`,
    createdAt: Date.now(),
    visitCount: 0,
    displayOrder: sites.length,
  };

  sites.push(newSite);
  saveStoredSites(sites);

  return res.status(201).json({
    success: true,
    message: 'Site added successfully!',
    site: newSite,
  });
});

// DELETE /api/sites/:id: Delete site (Protected by PIN 2515)
app.delete('/api/sites/:id', verifyPin, (req: Request, res: Response) => {
  const { id } = req.params;
  const sites = getStoredSites();
  const targetSite = sites.find((s) => s.id === id);
  const filtered = sites.filter((s) => s.id !== id);

  if (filtered.length === sites.length) {
    return res.status(404).json({ error: 'Site not found' });
  }

  saveStoredSites(filtered);

  // Permanently archive deleted site in backup file
  try {
    if (targetSite) {
      const backups = fs.existsSync(BACKUP_FILE) ? JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8')) : [];
      backups.push({ ...targetSite, deletedAt: Date.now() });
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(backups, null, 2), 'utf-8');
    }
  } catch (e) {
    console.warn('Backup error:', e);
  }

  return res.json({ success: true, message: 'Site deleted successfully and archived in backup' });
});

// PUT /api/sites/:id: Edit site details (Protected by PIN 2515)
app.put('/api/sites/:id', verifyPin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, category, previewImageUrl } = req.body;
  const sites = getStoredSites();
  const index = sites.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Site not found' });
  }

  if (title) sites[index].title = String(title).trim();
  if (description !== undefined) sites[index].description = String(description).trim();
  if (category) sites[index].category = String(category).trim();
  if (previewImageUrl !== undefined) {
    if (!previewImageUrl || typeof previewImageUrl !== 'string' || previewImageUrl.trim().length < 8) {
      return res.status(400).json({ error: 'A valid picture URL or screenshot is required.' });
    }
    sites[index].previewImageUrl = String(previewImageUrl).trim();
  }

  saveStoredSites(sites);
  return res.json({ success: true, site: sites[index] });
});

// Mount Vite or serve static files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
