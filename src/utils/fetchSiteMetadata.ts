import { SiteMetadataFetchResult } from '../types';

export function normalizeUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  return url;
}

export function formatDomainTitle(domain: string): string {
  const clean = domain.replace(/^www\./, '');
  const parts = clean.split('.');
  if (parts.length > 0) {
    const main = parts[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  }
  return clean;
}

/**
 * Resilient Cloud Computer Screenshot Engine:
 * Catches all network/DNS errors gracefully and provides instant high-resolution previews.
 */
export async function fetchSiteMetadata(rawUrl: string): Promise<SiteMetadataFetchResult> {
  const targetUrl = normalizeUrl(rawUrl);
  let domain = 'website.com';
  try {
    const parsed = new URL(targetUrl);
    domain = parsed.hostname.replace(/^www\./, '');
  } catch {
    domain = targetUrl.replace(/^https?:\/\//, '').split('/')[0] || 'website.com';
  }

  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const defaultScreenshot = `https://image.thum.io/get/width/1440/crop/900/noanimate/${targetUrl}`;
  const defaultTitle = formatDomainTitle(domain);
  const defaultDescription = `Visit and explore ${domain}`;

  // 1. Try server backend endpoint first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('/api/fetch-site-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.url) {
        return {
          url: data.url,
          domain: data.domain || domain,
          title: data.title || defaultTitle,
          description: data.description || defaultDescription,
          category: data.category || 'Projects',
          faviconUrl: data.faviconUrl || defaultFavicon,
          previewImageUrl: data.previewImageUrl || defaultScreenshot,
          screenshotUrl: data.screenshotUrl || defaultScreenshot,
          bannerUrl: data.bannerUrl || null,
        };
      }
    }
  } catch {
    // Silent fallback to client-side
  }

  // 2. Direct Cloud Computer Engine (Microlink)
  try {
    const mController = new AbortController();
    const mTimeout = setTimeout(() => mController.abort(), 6000);
    const cloudUrl = `https://api.microlink.io?url=${encodeURIComponent(
      targetUrl
    )}&screenshot=true&meta=true&viewport.width=1440&viewport.height=900&waitFor=1200`;
    const mRes = await fetch(cloudUrl, { signal: mController.signal });
    clearTimeout(mTimeout);

    if (mRes.ok) {
      const mJson = await mRes.json();
      if (mJson.status === 'success' && mJson.data) {
        const d = mJson.data;
        const shot = d.screenshot?.url || defaultScreenshot;
        const banner = d.image?.url || null;
        return {
          url: targetUrl,
          domain,
          title: d.title || defaultTitle,
          description: d.description || defaultDescription,
          category: 'Projects',
          faviconUrl: d.logo?.url || defaultFavicon,
          previewImageUrl: shot,
          screenshotUrl: shot,
          bannerUrl: banner,
        };
      }
    }
  } catch {
    // Silent fallback to CDN
  }

  // 3. Guaranteed zero-fail fallback
  return {
    url: targetUrl,
    domain,
    title: defaultTitle,
    description: defaultDescription,
    category: 'Projects',
    faviconUrl: defaultFavicon,
    previewImageUrl: defaultScreenshot,
    screenshotUrl: defaultScreenshot,
    bannerUrl: null,
  };
}
