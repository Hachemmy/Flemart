export type ProjectStatus = 'success' | 'in_progress' | 'archived' | 'abandoned';

export interface Project {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    github_link: string | null;
    status: ProjectStatus;
    readme: string | null;
    created_at: Date;
    updated_at: Date;
}
