export interface User {
    id: number;
    email: string;
    password: string;
    username: string;
    photo: string | null;
    github_id: string | null;
    created_at: Date;
    updated_at: Date;
}
