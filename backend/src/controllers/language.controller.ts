import { Request, Response } from 'express';
import pool from '../config/database';

const LANGUAGES = [
    { name: 'HTML', level: 1, icon: 'html', color: '#E34F26' },
    { name: 'CSS', level: 2, icon: 'css', color: '#1572B6' },
    { name: 'JavaScript', level: 3, icon: 'javascript', color: '#F7DF1E' },
    { name: 'Git', level: 4, icon: 'git', color: '#F05032' },
    { name: 'TypeScript', level: 5, icon: 'typescript', color: '#3178C6' },
    { name: 'Python', level: 6, icon: 'python', color: '#3776AB' },
    { name: 'React', level: 7, icon: 'react', color: '#61DAFB' },
    { name: 'Node.js', level: 8, icon: 'node', color: '#339933' },
    { name: 'SQL', level: 9, icon: 'sql', color: '#4479A1' },
    { name: 'Java', level: 10, icon: 'java', color: '#ED8B00' },
    { name: 'Go', level: 11, icon: 'go', color: '#00ADD8' },
    { name: 'Rust', level: 12, icon: 'rust', color: '#CE422B' },
];

function calculateXp(projects: any[]): { xp: number; level: number } {
    let xp = 0;
    for (const p of projects) {
        xp += 10;
        if (p.status === 'success') xp += 25;
        else if (p.status === 'abandoned') xp += 5;
    }
    const level = Math.min(Math.floor(xp / 20) + 1, 12);
    return { xp, level };
}

export async function getMyLanguages(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Not authenticated' });

        const [projects] = await pool.execute(
            'SELECT id, status FROM Projects WHERE user_id = ?',
            [userId]
        );
        const projectList = projects as any[];

        const { xp, level: maxLevel } = calculateXp(projectList);

        const languages = LANGUAGES.map((lang) => ({
            ...lang,
            unlocked: lang.level <= maxLevel,
            xp,
            maxXp: LANGUAGES.length * 20,
            nextUnlock: LANGUAGES.find((l) => l.level === maxLevel + 1) || null,
        }));

        res.json({ languages, xp, level: maxLevel, totalProjects: projectList.length });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
