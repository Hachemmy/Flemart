import { Router } from 'express';
import {
    getProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getUserProjects,
    getGitHubRepos,
    importRepoAsProject
} from '../controllers/project.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getProjects);
router.post('/', authenticateToken, createProject);
router.get('/github/repos', authenticateToken, getGitHubRepos);
router.post('/github/import', authenticateToken, importRepoAsProject);
router.get('/user/:userId', authenticateToken, getUserProjects);
router.get('/:id', authenticateToken, getProjectById);
router.put('/:id', authenticateToken, updateProject);
router.delete('/:id', authenticateToken, deleteProject);

export default router;
