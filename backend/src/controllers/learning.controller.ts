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

    return results.slice(0, 10);
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
    const tabs = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
    if (!tabs) return [];

    const videos: VideoResult[] = [];
    for (const item of tabs) {
        if (!item.videoRenderer) continue;
        const v = item.videoRenderer;
        const videoId = v.videoId || '';
        if (!videoId) continue;

        const title = v.title?.runs?.[0]?.text || '';
        const channel = v.ownerText?.runs?.[0]?.text || '';
        const viewCount = v.viewCountText?.simpleText || '';
        const lengthSeconds = v.lengthSeconds ? parseInt(v.lengthSeconds) : 0;

        videos.push({
            title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            videoId,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channel,
            views: viewCount,
            duration: lengthSeconds ? formatDuration(lengthSeconds) : '',
        });

        if (videos.length >= 10) break;
    }

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

export async function searchSolution(req: Request, res: Response) {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const [allResults, allVideos] = await Promise.all([
            searchDuckDuckGo(query),
            searchYouTube(query),
        ]);

        const results = allResults.filter(r =>
            isProgrammingRelated(r.title) || isProgrammingRelated(r.snippet)
        );
        const videos = allVideos.filter(v =>
            isProgrammingRelated(v.title) || isProgrammingRelated(v.channel)
        );

        res.json({ results, videos });
    } catch (error) {
        console.error('Web search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
}
