import {Injectable, NestMiddleware, Scope} from '@nestjs/common';
import {NextFunction, Request, Response} from 'express';
import {randomUUID} from 'node:crypto';
import {requestContext} from './request-context';

@Injectable({scope: Scope.TRANSIENT})
export class Middleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const incoming = req.header('x-request-id');
        const traceId = incoming && incoming.length > 0 ? incoming : randomUUID();

        res.setHeader('x-request-id', traceId);

        requestContext.run(
            {
                traceId,
                path: req.originalUrl,
                method: req.method,
            },
            () => next(),
        );
    }
}