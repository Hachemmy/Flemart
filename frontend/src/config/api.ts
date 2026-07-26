export function getApiUrl(): string {
    // En production (Docker), Nginx sert le frontend ET proxifie /api vers le backend
    // sur la même origine : donc une URL relative suffit, quel que soit l'hôte/IP
    // utilisé par le client (localhost, IP LAN, nom de domaine...).
    // VITE_API_URL reste disponible pour un usage hors Docker (ex: dev sans proxy).
    return import.meta.env.VITE_API_URL || '';
}
