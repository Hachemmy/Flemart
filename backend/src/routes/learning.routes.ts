import { Router } from 'express';
import {
    getLearningResources,
    getLearningResourceById,
    searchSolution
} from '../controllers/learning.controller';


const router = Router();

router.get('/', getLearningResources);
router.get('/:id', getLearningResourceById);
router.post('/search', searchSolution);

export default router;
