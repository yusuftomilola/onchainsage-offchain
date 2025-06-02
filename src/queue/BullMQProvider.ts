import { Queue } from 'bullmq';

export const BullMQProvider = {
  provide: 'BULLMQ_QUEUE',
  useFactory: async () => {
    const queue = new Queue('job-queue', {
      connection: {
        host: 'localhost',
        port: 6379,
      },
    });
    return queue;
  },
};