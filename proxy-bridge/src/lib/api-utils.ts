import { NextApiRequest, NextApiResponse } from 'next';
import { logContext, logger } from './logger';

export type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void | any>;

export function withLogging(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const requestId = (req.headers['x-request-id'] as string) || 'unknown';
    
    return logContext.run({ requestId }, async () => {
      try {
        return await handler(req, res);
      } catch (error: any) {
        logger.error(`Unhandled API Error: ${error.message}`, { stack: error.stack });
        if (!res.writableEnded) {
          res.status(500).json({ error: 'Internal Server Error', requestId });
        }
      }
    });
  };
}
