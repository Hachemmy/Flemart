export type NotificationType = 'activity' | 'motivation';

export interface Notification {
    id: number;
    user_id: number;
    actor_id: number | null;
    type: NotificationType;
    message: string;
    is_read: boolean;
    created_at: Date;
}
