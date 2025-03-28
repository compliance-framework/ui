import { defineStore } from 'pinia';
import { useConfigStore } from '@/stores/config.ts';
import { type Filter } from '@/parsers/labelfilter.ts';
import type {
  ControlReference, DataResponse,
  FindingStatus,
  Link,
  Origin,
  Property,
  RiskReference
} from '@/stores/types.ts'


export interface HeartbeatInterval {
  interval: string;
  count: number;
}

export const useHeartbeatsStore = defineStore('heartbeats', () => {
  const configStore = useConfigStore();

  async function overTime(): Promise<DataResponse<HeartbeatInterval[]>> {
    const config = await configStore.getConfig();
    const response = await fetch(`${config.API_URL}/api/heartbeat/over-time/`);
    return (await response.json()) as DataResponse<HeartbeatInterval[]>;
  }

  return {
    overTime: overTime,
  };
});
