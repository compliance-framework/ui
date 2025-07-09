import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import type { DataResponse } from '@/stores/types.ts';

export interface HeartbeatInterval {
  interval: string;
  total: number;
}

export const useHeartbeatsStore = defineStore('heartbeats', () => {
  const configStore = useConfigStore();

  async function overTime(): Promise<DataResponse<HeartbeatInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(
      `${config.API_URL}/api/agent/heartbeat/over-time`,
    );
    return (await response.json()) as DataResponse<HeartbeatInterval[]>;
  }

  return {
    overTime: overTime,
  };
});
