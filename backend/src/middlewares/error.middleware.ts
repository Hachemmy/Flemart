import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    console.error(err.stack);

    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors
        });
    }

    if (err.status && err.message) {
        return res.status(err.status).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error' });
}
