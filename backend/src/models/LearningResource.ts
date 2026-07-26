export interface LearningResource {
    id: number;
    language: string;
    title: string;
    logo: string | null;
    link: string;
    description: string | null;
    created_at: Date;
}
