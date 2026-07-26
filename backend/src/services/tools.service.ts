import OpenAI from 'openai';
import pool from '../config/database';

// --- Pure DB functions (extracted from controllers) ---

async function fetchProjectsByUserId(userId: number) {
    const [rows] = await pool.execute(
        'SELECT id, title, description, github_link, status, readme, created_at, updated_at FROM Projects WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
    );
    return rows;
}

const LANGUAGES = [
    { name: 'HTML', level: 1 },
    { name: 'CSS', level: 2 },
    { name: 'JavaScript', level: 3 },
    { name: 'Git', level: 4 },
    { name: 'TypeScript', level: 5 },
    { name: 'Python', level: 6 },
    { name: 'React', level: 7 },
    { name: 'Node.js', level: 8 },
    { name: 'SQL', level: 9 },
    { name: 'Java', level: 10 },
    { name: 'Go', level: 11 },
    { name: 'Rust', level: 12 },
];

function calculateXp(projects: { status: string }[]): { xp: number; level: number } {
    let xp = 0;
    for (const p of projects) {
        xp += 10;
        if (p.status === 'success') xp += 25;
        else if (p.status === 'abandoned') xp += 5;
    }
    const level = Math.min(Math.floor(xp / 20) + 1, 12);
    return { xp, level };
}

async function fetchLanguagesByUserId(userId: number) {
    const [projects] = await pool.execute(
        'SELECT id, status FROM Projects WHERE user_id = ?',
        [userId],
    );
    const projectList = projects as { status: string }[];
    const { xp, level: maxLevel } = calculateXp(projectList);
    const languages = LANGUAGES.map((lang) => ({
        ...lang,
        unlocked: lang.level <= maxLevel,
        xp,
        maxXp: LANGUAGES.length * 20,
        nextUnlock: LANGUAGES.find((l) => l.level === maxLevel + 1) || null,
    }));
    return { languages, xp, level: maxLevel, totalProjects: projectList.length };
}

async function fetchQuizProgressByUserId(userId: number) {
    const [rows] = await pool.execute(
        'SELECT language, current_level, completed_levels, total_xp_earned FROM QuizProgress WHERE user_id = ?',
        [userId],
    );
    return rows;
}

async function fetchLearningResources(language?: string) {
    let query = 'SELECT id, language, title, logo, link, description, created_at FROM LearningResources';
    const values: string[] = [];
    if (language) {
        query += ' WHERE language = ?';
        values.push(language);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, values);
    return rows;
}

async function fetchNotificationsByUserId(userId: number) {
    const [rows] = await pool.execute(
        `SELECT n.id, n.user_id, n.type, n.message, n.is_read, n.created_at,
                u.username as actor_username, u.photo as actor_photo
         FROM Notifications n
         LEFT JOIN Users u ON n.actor_id = u.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC`,
        [userId],
    );
    return rows;
}

// --- Tool registry ---

const toolRegistry: Record<string, (userId: number, args?: Record<string, unknown>) => Promise<unknown>> = {
    getMyProjects: (userId) => fetchProjectsByUserId(userId),
    getMyLanguages: (userId) => fetchLanguagesByUserId(userId),
    getQuizProgress: (userId) => fetchQuizProgressByUserId(userId),
    getLearningResources: (_userId, args) => fetchLearningResources(args?.language as string | undefined),
    getMyNotifications: (userId) => fetchNotificationsByUserId(userId),
};

export const tools: OpenAI.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'getMyProjects',
            description: "Récupère la liste des projets de l'utilisateur connecté (titre, description, statut, dates).",
            parameters: { type: 'object' as const, properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getMyLanguages',
            description: "Récupère les langages, le niveau, l'XP et les langages débloqués de l'utilisateur.",
            parameters: { type: 'object' as const, properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getQuizProgress',
            description: "Récupère la progression de l'utilisateur aux quiz par langage (niveau actuel, niveaux complétés, XP).",
            parameters: { type: 'object' as const, properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getLearningResources',
            description: "Récupère les ressources d'apprentissage disponibles, optionnellement filtrées par langage.",
            parameters: {
                type: 'object' as const,
                properties: {
                    language: {
                        type: 'string' as const,
                        description: 'Filtrer par langage (ex: JavaScript, Python)',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'getMyNotifications',
            description: "Récupère les notifications de l'utilisateur (messages, statut de lecture, dates).",
            parameters: { type: 'object' as const, properties: {}, required: [] },
        },
    },
];

export async function executeTool(name: string, userId: number, args?: Record<string, unknown>): Promise<string> {
    const fn = toolRegistry[name];
    if (!fn) return JSON.stringify({ error: `Outil inconnu : ${name}` });
    const result = await fn(userId, args);
    return JSON.stringify(result);
}
