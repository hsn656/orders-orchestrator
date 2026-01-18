import { config } from 'src/shared/config/config.service';

export const defaultJobOptions = {
  attempts: config.getNumber('QUEUE_DEFAULT_ATTEMPTS'),
  backoff: {
    type: config.getString('QUEUE_DEFAULT_BACKOFF_TYPE') as
      | 'fixed'
      | 'exponential',
    delay: config.getNumber('QUEUE_DEFAULT_BACKOFF_MS'),
  },
};
