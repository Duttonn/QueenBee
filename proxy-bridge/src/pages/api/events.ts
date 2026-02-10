import type { NextApiRequest, NextApiResponse } from 'next';
import { EventLog, EventFilters } from '../../lib/EventLog';
import { withLogging } from '../../lib/api-utils';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectPath = req.query.projectPath as string;

  if (!projectPath) {
    return res.status(400).json({ error: 'projectPath is required' });
  }

  const eventLog = new EventLog(projectPath);

  if (req.method === 'GET') {
    try {
      const filters: EventFilters = {
        type: req.query.type as string,
        agentId: req.query.agentId as string,
        startTime: req.query.startTime as string,
        endTime: req.query.endTime as string,
      };
      const events = await eventLog.query(filters);
      return res.status(200).json(events);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to fetch events', details: error.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withLogging(handler);
