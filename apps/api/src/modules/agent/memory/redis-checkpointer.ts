import { RedisSaver } from "@langchain/langgraph-checkpoint-redis";

/**
 * Factory function that creates a RedisSaver checkpointer for LangGraph.
 * Uses Redis Stack (RedisJSON + RediSearch) for state persistence.
 */
export async function createRedisCheckpointer(
  redisUrl: string,
): Promise<RedisSaver> {
  const checkpointer = RedisSaver.fromUrl(redisUrl);
  return checkpointer;
}
