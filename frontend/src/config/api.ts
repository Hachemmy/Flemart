export function getApiUrl(): string {
    // En production (Docker), Nginx sert le frontend ET proxifie /api vers le backend
    // sur la même origine : donc une URL relative suffit, quel que soit l'hôte/IP
    // utilisé par le client (localhost, IP LAN, nom de domaine...).
    // VITE_API_URL reste disponible pour un usage hors Docker (ex: dev sans proxy).
    return import.meta.env.VITE_API_URL || '';
}

// fetch avec token en header : déclenche un logout automatique si le token
// devient invalide (401) via l'événement 'auth:unauthorized'.
export async function authorizedFetch(
    url: string,
    token: string | null,
    options: RequestInit = {},
): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return res;
}
