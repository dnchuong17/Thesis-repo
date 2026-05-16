import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    getClient(): Redis {
        return this.redis;
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
        if (ttlSeconds) {
            return this.redis.set(key, value, 'EX', ttlSeconds);
        }
        return this.redis.set(key, value);
    }

    async get(key: string): Promise<string | null> {
        return this.redis.get(key);
    }

    async del(key: string): Promise<number> {
        return this.redis.del(key);
    }

    async publish(channel: string, message: string): Promise<number> {
        return this.redis.publish(channel, message);
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }
}