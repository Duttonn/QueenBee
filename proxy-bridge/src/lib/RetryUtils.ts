export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
  jitter: boolean;
  signal?: AbortSignal;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  factor: 2,
  jitter: true,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (opts.signal?.aborted) {
        throw new Error('Operation aborted');
      }
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === opts.maxRetries || opts.signal?.aborted) {
        break;
      }

      // Calculate next delay
      let actualDelay = delay;
      if (opts.jitter) {
        actualDelay = delay * (0.5 + Math.random());
      }

      console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${Math.round(actualDelay)}ms...`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, actualDelay);
        opts.signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Operation aborted'));
        }, { once: true });
      });

      delay = Math.min(delay * opts.factor, opts.maxDelayMs);
    }
  }

  throw lastError;
}
