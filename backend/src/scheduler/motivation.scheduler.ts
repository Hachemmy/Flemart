import pool from '../config/database';

const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const INACTIVE_HOURS = 48;

const inactiveMessages = [
    'Ton projet "%s" t\'attend avec impatience. Chaque ligne de code que tu ecriras sera un pas de geant. Ne l\'oublie pas, les grandes choses commencent toujours par un petit effort.',
    'Le silence sur "%s" ne signifie pas la fin. Parfois, le repos est necessaire pour revenir plus fort. Tu as le talent, il ne manque que ta presence.',
    'Regarde combien tu as deja accompli sur "%s". Abandonner maintenant, c\'est laisser inacheve un chef-d\'oeuvre qui pourrait inspirer des milliers de personnes.',
    'Les plus grands projets ont connu des periodes de silence. "%s" n\'est pas abandonne, il dort. Reveille-le quand tu seras pret, il sera la pour toi.',
    'Tu as des mains qui peuvent construire des choses incroyables. "%s" en est la preuve. Ne laisse pas la routine etouffer ce feu qui brule en toi.',
    'Chaque projet est une aventure. "%s" est a mi-chemin. Ce serait dommage de ne pas decouvrir la fin de cette belle histoire.',
    'Le monde a besoin de ce que tu crées. "%s" est plus qu\'un projet, c\'est ton empreinte. Continue d\'ecrire cette histoire.',
    'On ne mesure pas la valeur d\'un projet a sa vitesse, mais a sa persistance. "%s" a besoin de toi, et toi, tu as besoin de ce defi.',
    'Les reves ne meurent pas, ils attendent. "%s" est l\'un des tiens. Reviens vers lui, il te reste tant de belles choses a construire.',
    'Quand le doute arrive, souviens-toi pourquoi tu as commence "%s". Cette premiere etincelle est toujours la, meme si la flamme s\'est tuee un moment.',
];

const successMessages = [
    'Felicitations ! "%s" est termine. Tu as prouve que tu es capable de mener un projet a son terme. Sois fier de ce que tu as accompli.',
    '"%s" est une victoire. Chaque bug corrige, chaque fonctionnalite ajoutee etait un defi que tu as releve. Tu es un veritable developpeur.',
    'Le meilleur sentiment du monde, c\'est de voir son projet aboutir. "%s" n\'est plus un dream, c\'est une realite. Et c\'est grace a toi.',
    'Aujourd\'hui, tu peux dire "j\'ai fait ca". "%s" est la preuve de ta determination. Continue comme ca, le meilleur reste a venir.',
    'Tu as transforme une idee en quelque chose de concret avec "%s". C\'est extraordinaire. Chaque projet reussi te rapproche de tes plus grands objectifs.',
    '"%s" est termine, mais ton parcours ne fait que commencer. Ce projet t\'a appris des choses qu\'aucun tutorial ne peut enseigner. Utilise ces lecons pour le prochain.',
    'Fier de toi ! "%s" montre que tu as ce qu\'il faut pour reussir. Le code que tu ecris aujourd\'hui construit ton demain.',
    'Peu de gens arrivent a mener un projet au bout. Toi, tu en fais partie. "%s" est la preuve que tu as la discipline et la passion pour reussir.',
];

export function startMotivationScheduler() {
    checkInactiveProjects();
    checkSuccessfulProjects();
    setInterval(checkInactiveProjects, CHECK_INTERVAL);
    setInterval(checkSuccessfulProjects, CHECK_INTERVAL);
}

async function checkInactiveProjects() {
    try {
        const [rows] = await pool.execute(`
            SELECT p.id, p.title, p.user_id
            FROM Projects p
            WHERE p.status = 'in_progress'
            AND p.updated_at <= DATE_SUB(NOW(), INTERVAL ${INACTIVE_HOURS} HOUR)
            AND NOT EXISTS (
                SELECT 1 FROM Notifications n
                WHERE n.user_id = p.user_id
                AND n.type = 'motivation'
                AND n.message LIKE CONCAT('%', p.title, '%')
                AND n.created_at >= DATE_SUB(NOW(), INTERVAL 72 HOUR)
            )
        `);

        const projects = rows as any[];
        for (const project of projects) {
            const msg = inactiveMessages[Math.floor(Math.random() * inactiveMessages.length)].replace(/%s/g, project.title);
            await pool.execute(
                'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
                [project.user_id, 'motivation', msg]
            );
        }

        if (projects.length > 0) {
            console.log(`[Motivation] Sent ${projects.length} encouragement notification(s) for inactive projects`);
        }
    } catch (error) {
        console.error('[Motivation] Error checking inactive projects:', error);
    }
}

async function checkSuccessfulProjects() {
    try {
        const [rows] = await pool.execute(`
            SELECT p.id, p.title, p.user_id
            FROM Projects p
            WHERE p.status = 'success'
            AND NOT EXISTS (
                SELECT 1 FROM Notifications n
                WHERE n.user_id = p.user_id
                AND n.type = 'motivation'
                AND n.message LIKE CONCAT('%', p.title, '%')
                AND n.created_at >= DATE_SUB(NOW(), INTERVAL 168 HOUR)
            )
        `);

        const projects = rows as any[];
        for (const project of projects) {
            const msg = successMessages[Math.floor(Math.random() * successMessages.length)].replace(/%s/g, project.title);
            await pool.execute(
                'INSERT INTO Notifications (user_id, type, message) VALUES (?, ?, ?)',
                [project.user_id, 'motivation', msg]
            );
        }

        if (projects.length > 0) {
            console.log(`[Motivation] Sent ${projects.length} celebration notification(s) for successful projects`);
        }
    } catch (error) {
        console.error('[Motivation] Error checking successful projects:', error);
    }
}
