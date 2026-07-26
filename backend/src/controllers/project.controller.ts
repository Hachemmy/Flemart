import { Request, Response } from 'express';
import pool from '../config/database';
import { z } from 'zod';

const projectSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    githubLink: z.string().url().optional(),
    status: z.enum(['success', 'in_progress', 'archived', 'abandoned']).optional(),
    readme: z.string().optional()
});

export async function getGitHubRepos(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [users] = await pool.execute('SELECT github_token FROM Users WHERE id = ?', [userId]);
        const user = (users as any[])[0];

        if (!user?.github_token) {
            return res.status(400).json({ error: 'GitHub account not linked' });
        }

        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: {
                Authorization: `Bearer ${user.github_token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to fetch GitHub repositories' });
        }

        const repos = await response.json() as any[];

        const formattedRepos = repos.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            updated_at: repo.updated_at,
            stargazers_count: repo.stargazers_count,
            fork: repo.fork,
        }));

        res.json({ repos: formattedRepos });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function importRepoAsProject(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const { name, description, html_url, status } = req.body;

        const [existing] = await pool.execute(
            'SELECT id FROM Projects WHERE user_id = ? AND github_link = ?',
            [userId, html_url]
        );
        if ((existing as any[]).length > 0) {
            return res.status(409).json({ error: 'Project already imported' });
        }

        let readmeContent: string | null = null;

        const [users] = await pool.execute('SELECT github_token FROM Users WHERE id = ?', [userId]);
        const user = (users as any[])[0];

        if (user?.github_token) {
            try {
                const match = html_url.match(/github\.com\/([^/]+)\/([^/]+)/);
                if (match) {
                    const [, owner, repo] = match;
                    const readmeRes = await fetch(
                        `https://api.github.com/repos/${owner}/${repo}/readme`,
                        {
                            headers: {
                                Authorization: `Bearer ${user.github_token}`,
                                Accept: 'application/vnd.github.v3.raw',
                            },
                        }
                    );
                    if (readmeRes.ok) {
                        const raw = await readmeRes.text();
                        if (raw && raw.trim().length > 40) {
                            readmeContent = raw;
                        }
                    }
                }
            } catch {}
        }

        if (!readmeContent || readmeContent.trim().length <= 40) {
            const parts: string[] = [];
            if (description) {
                parts.push(description);
            }
            parts.push(`Projet GitHub : ${name}`);
            readmeContent = parts.join('\n\n');
        }

        if (readmeContent.length > 10000) {
            readmeContent = readmeContent.substring(0, 10000) + '\n\n...(contenu tronque)';
        }

        const [result] = await pool.execute(
            'INSERT INTO Projects (user_id, title, description, github_link, status, readme) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, name, description ?? null, html_url, status || 'in_progress', readmeContent]
        );

        const projectId = (result as any).insertId;
        res.status(201).json({ message: 'Project imported successfully', projectId });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getProjects(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        const [projects] = await pool.execute('SELECT * FROM Projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getProjectById(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const [projects] = await pool.execute('SELECT * FROM Projects WHERE id = ?', [id]);
        const project = (projects as any[])[0];

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ project });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function createProject(req: Request, res: Response) {
    try {
        const { title, description, githubLink, status, readme } = projectSchema.parse(req.body);
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [result] = await pool.execute(
            'INSERT INTO Projects (user_id, title, description, github_link, status, readme) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, title, description ?? null, githubLink ?? null, status || 'in_progress', readme ?? null]
        );

        const projectId = (result as any).insertId;
        res.status(201).json({ message: 'Project created successfully', projectId });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function updateProject(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [existing] = await pool.execute('SELECT user_id FROM Projects WHERE id = ?', [id]);
        const project = (existing as any[])[0];
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const { title, description, githubLink, status, readme } = projectSchema.partial().parse(req.body);

        const updates: string[] = [];
        const values: any[] = [];

        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (githubLink) {
            updates.push('github_link = ?');
            values.push(githubLink);
        }
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }
        if (readme !== undefined) {
            updates.push('readme = ?');
            values.push(readme);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        const updateQuery = `UPDATE Projects SET ${updates.join(', ')} WHERE id = ?`;
        await pool.execute(updateQuery, values);

        if (status === 'success') {
            const [projRows] = await pool.execute('SELECT title FROM Projects WHERE id = ?', [id]);
            const proj = (projRows as any[])[0];
            if (proj) {
                const msgs = [
                    `Felicitations ! "${proj.title}" est termine. Tu as prouve que tu es capable de mener un projet a son terme. Sois fier de ce que tu as accompli.`,
                    `"${proj.title}" est une victoire. Chaque bug corrige, chaque fonctionnalite ajoutee etait un defi que tu as releve. Tu es un veritable developpeur.`,
                    `Le meilleur sentiment du monde, c'est de voir son projet aboutir. "${proj.title}" n'est plus un reve, c'est une realite. Et c'est grace a toi.`,
                    `Aujourd'hui, tu peux dire "j'ai fait ca". "${proj.title}" est la preuve de ta determination. Continue comme ca, le meilleur reste a venir.`,
                    `Tu as transforme une idee en quelque chose de concret avec "${proj.title}". C'est extraordinaire. Chaque projet reussi te rapproche de tes plus grands objectifs.`,
                    `"${proj.title}" est termine, mais ton parcours ne fait que commencer. Ce projet t'a appris des choses qu'aucun tutorial ne peut enseigner.`,
                    `Fier de toi ! "${proj.title}" montre que tu as ce qu'il faut pour reussir. Le code que tu ecris aujourd'hui construit ton demain.`,
                ];
                const msg = msgs[Math.floor(Math.random() * msgs.length)];
                await pool.execute(
                    'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
                    [userId, 'motivation', msg]
                );
            }
        }

        res.json({ message: 'Project updated successfully' });
    } catch (error: any) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation error', details: error.errors });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function deleteProject(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [existing] = await pool.execute('SELECT user_id FROM Projects WHERE id = ?', [id]);
        const project = (existing as any[])[0];
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        if (project.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const [result] = await pool.execute('DELETE FROM Projects WHERE id = ?', [id]);

        if ((result as any).affectedRows === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}

export async function getUserProjects(req: Request, res: Response) {
    try {
        const { userId } = req.params;
        const [projects] = await pool.execute('SELECT * FROM Projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
