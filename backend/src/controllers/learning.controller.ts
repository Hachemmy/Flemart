import { Request, Response } from 'express';
import pool from '../config/database';
import * as cheerio from 'cheerio';

const YOUTUBE_CONSENT_COOKIES = 'CONSENT=PENDING+999; SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMxMTE0LjA3X3AxGgJlbiACGgYIgJnsBhAB';

export async function getLearningResources(req: Request, res: Response) {
    try {
        const { language } = req.query;
        let query = 'SELECT * FROM LearningResources';
        const values: any[] = [];

        if (language) {
            query += ' WHERE language = ?';
            values.push(language);
        }

        query += ' ORDER BY created_at DESC';

        const [resources] = await pool.execute(query, values);
        res.json({ resources });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getLearningResourceById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const [resources] = await pool.execute('SELECT * FROM LearningResources WHERE id = ?', [id]);
        const resource = (resources as any[])[0];

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        res.json({ resource });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

interface WebResult {
    title: string;
    url: string;
    snippet: string;
}

async function searchDuckDuckGo(query: string): Promise<WebResult[]> {
    const searchQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${searchQuery}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error('DuckDuckGo search failed');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: WebResult[] = [];

    $('.result').each((_, element) => {
        const titleEl = $(element).find('.result__title a');
        const snippetEl = $(element).find('.result__snippet');

        const title = titleEl.text().trim();
        let href = titleEl.attr('href') || '';
        const snippet = snippetEl.text().trim();

        // DuckDuckGo wraps URLs in a redirect, extract the actual URL
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) {
            href = decodeURIComponent(uddgMatch[1]);
        }

        if (title && href && snippet) {
            results.push({ title, url: href, snippet });
        }
    });

    return results.slice(0, 30);
}

async function searchBing(query: string): Promise<WebResult[]> {
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${searchQuery}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error('Bing search failed');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: WebResult[] = [];

    $('li.b_algo').each((_, element) => {
        const titleEl = $(element).find('h2 a');
        const snippetEl = $(element).find('.b_caption p');

        const title = titleEl.text().trim();
        let href = titleEl.attr('href') || '';
        const snippet = snippetEl.text().trim();

        // Bing wraps URLs in redirects, extract the actual URL from the 'u=' parameter
        const bingMatch = href.match(/u=([^&]+)/);
        if (bingMatch) {
            try {
                href = Buffer.from(bingMatch[1], 'base64').toString('utf-8');
            } catch {
                // If decode fails, use the original
            }
        }

        if (title && href && snippet && href.startsWith('http')) {
            results.push({ title, url: href, snippet });
        }
    });

    return results.slice(0, 30);
}

async function searchGoogle(query: string): Promise<WebResult[]> {
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.google.com/search?q=${searchQuery}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error('Google search failed');
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const results: WebResult[] = [];

    $('div.g').each((_, element) => {
        const titleEl = $(element).find('h3');
        const linkEl = $(element).find('a[href*="url?q="]');
        const snippetEl = $(element).find('div:nth-of-type(2)');

        const title = titleEl.text().trim();
        let href = linkEl.attr('href') || '';
        const snippet = snippetEl.text().trim();

        // Google wraps URLs in /url?q=URL&... format
        const urlMatch = href.match(/\/url\?q=([^&]+)/);
        if (urlMatch) {
            try {
                href = decodeURIComponent(urlMatch[1]);
            } catch {
                href = '';
            }
        }

        if (title && href && snippet && href.startsWith('http') && !href.includes('google.com')) {
            results.push({ title, url: href, snippet });
        }
    });

    return results.slice(0, 30);
}

interface VideoResult {
    title: string;
    url: string;
    videoId: string;
    thumbnail: string;
    channel: string;
    views: string;
    duration: string;
}

async function searchYouTube(query: string): Promise<VideoResult[]> {
    const searchQuery = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${searchQuery}`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Cookie': YOUTUBE_CONSENT_COOKIES,
        },
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const match = html.match(/var ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const videos: VideoResult[] = [];
    const seen = new Set<string>();

    const collectVideos = (node: any, depth: number) => {
        if (!node || typeof node !== 'object' || depth > 12 || videos.length >= 30) return;

        if (node.videoRenderer) {
            const v = node.videoRenderer;
            const videoId = v.videoId || '';
            if (videoId && !seen.has(videoId)) {
                seen.add(videoId);
                const lengthSeconds = v.lengthSeconds ? parseInt(v.lengthSeconds, 10) : 0;
                videos.push({
                    title: v.title?.runs?.[0]?.text || v.title?.simpleText || '',
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    videoId,
                    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
                    views: v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || '',
                    duration: lengthSeconds
                        ? formatDuration(lengthSeconds)
                        : (v.lengthText?.simpleText || ''),
                });
            }
        }

        for (const value of Object.values(node)) {
            if (videos.length >= 30) return;
            if (Array.isArray(value)) {
                for (const item of value) collectVideos(item, depth + 1);
            } else if (value && typeof value === 'object') {
                collectVideos(value, depth + 1);
            }
        }
    };

    collectVideos(data, 0);
    return videos;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

const PROGRAMMING_KEYWORDS = [
    'programmation', 'developpement', 'development',
    'javascript', 'python', 'typescript', 'php', 'ruby', 'kotlin',
    'react', 'angular', 'vuejs', 'nodejs', 'nextjs', 'nuxtjs', 'svelte',
    'html', 'css', 'sql', 'mysql', 'mongodb', 'postgres',
    'frontend', 'backend', 'fullstack',
    'github', 'docker', 'linux', 'terminal',
    'algorithme', 'algorithm', 'framework',
    'npm', 'webpack', 'vite', 'babel', 'eslint',
    'laravel', 'symfony', 'django', 'flask', 'spring', 'rails',
    'firebase', 'redis', 'graphql', 'ajax', 'restapi',
    'devops', 'scrum', 'agile',
    'figma', 'photoshop',
    'flutter', 'react native',
    'electron', 'blockchain', 'web3',
    'unity', 'unreal',
    'machine learning', 'deep learning', 'data science', 'artificial intelligence',
    'open source',
];

function isProgrammingRelated(text: string): boolean {
    const lower = text.toLowerCase();
    return PROGRAMMING_KEYWORDS.some(kw => lower.includes(kw));
}

function dedupeWeb(items: WebResult[]): WebResult[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = item.url.replace(/\/$/, '');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function dedupeVideos(items: VideoResult[]): VideoResult[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        if (!item.videoId || seen.has(item.videoId)) return false;
        seen.add(item.videoId);
        return true;
    });
}

export async function searchSolution(req: Request, res: Response) {
    try {
        const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        if (query.length > 200) {
            return res.status(400).json({ error: 'Query is too long' });
        }

        // Try DuckDuckGo first, then Bing, then Google.
        let allResults: WebResult[] = [];
        try {
            allResults = await searchDuckDuckGo(query);
        } catch (error) {
            console.warn('DuckDuckGo failed, trying Bing...');
            try {
                allResults = await searchBing(query);
            } catch (bingError) {
                console.warn('Bing failed, trying Google...');
                try {
                    allResults = await searchGoogle(query);
                } catch (googleError) {
                    console.warn('Google also failed:', googleError);
                }
            }
        }

        let allVideos: VideoResult[] = [];
        try {
            allVideos = await searchYouTube(query);
        } catch (error) {
            console.warn('YouTube search failed:', error);
        }

        // Only restrict to programming content when the query itself is about programming.
        const shouldFilterProgramming = isProgrammingRelated(query);
        const webPool = shouldFilterProgramming
            ? allResults.filter(r => isProgrammingRelated(r.title) || isProgrammingRelated(r.snippet))
            : allResults;
        const videoPool = shouldFilterProgramming
            ? allVideos.filter(v => isProgrammingRelated(v.title) || isProgrammingRelated(v.channel))
            : allVideos;

        // Aim for 10 links + 10 videos, filling with unfiltered results if needed.
        const results = dedupeWeb([...webPool, ...allResults]).slice(0, 10);
        const videos = dedupeVideos([...videoPool, ...allVideos]).slice(0, 10);

        res.json({ query, results, videos });
    } catch (error) {
        console.error('Web search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
}
