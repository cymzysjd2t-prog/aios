import { Queue } from "bullmq";
import IORedis from "ioredis";

export const AGENT_RUN_QUEUE = "agent-runs";

export interface AgentRunJobData {
  agentInstanceId: string;
  goal: string;
  trigger: "user_message" | "agent_delegation" | "cron" | "webhook";
}

let connection: IORedis | null = null;
let queue: Queue<AgentRunJobData> | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL manquante — impossible de se connecter à la file d'attente.");
    connection = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getAgentRunQueue(): Queue<AgentRunJobData> {
  if (!queue) {
    queue = new Queue<AgentRunJobData>(AGENT_RUN_QUEUE, { connection: getConnection() });
  }
  return queue;
}

export { getConnection as getQueueConnection };
