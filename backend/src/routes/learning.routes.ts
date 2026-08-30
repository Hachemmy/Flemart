import { Router } from 'express';
import {
    getLearningResources,
    getLearningResourceById,
    searchSolution
} from '../controllers/learning.controller';


const router = Router();

router.post('/search', searchSolution);
router.get('/', getLearningResources);
router.get('/:id', getLearningResourceById);

export default router;
