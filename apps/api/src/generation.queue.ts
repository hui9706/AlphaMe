import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

@Injectable()
export class GenerationQueue implements OnModuleDestroy {
  private readonly queue: Queue;

  constructor(config: ConfigService) {
    this.queue = new Queue('alphame-generations', { connection: { url: config.get('REDIS_URL', 'redis://localhost:6379') } });
  }

  add(generationId: string) {
    return this.queue.add('generate-image', { generationId }, { jobId: generationId, attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  async onModuleDestroy() { await this.queue.close(); }
}
