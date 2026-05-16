import { DynamicModule, Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
    static forRoot(): DynamicModule {
        return {
            module: RedisModule,
            providers: [
                {
                    provide: REDIS_CLIENT,
                    useFactory: () => {
                        return new Redis({
                            host: process.env.REDIS_HOST,
                            port: Number(process.env.REDIS_PORT),
                            password: process.env.REDIS_PASSWORD,
                            db: Number(process.env.REDIS_DB),
                            maxRetriesPerRequest: null,
                        });
                    },
                },
                RedisService,
            ],
            exports: [RedisService, REDIS_CLIENT],
        };
    }
}

console.log(process.env.REDIS_PASSWORD)