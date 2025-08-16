// Central place for env & defaults
export function connEnv() {
    return {
      redisURL : process.env.REDIS_URL  || 'redis://127.0.0.1:6379',
      rabbitURL: process.env.RABBIT_URL || 'amqp://user:pass@127.0.0.1:5672'
    };
  }
  