import { type ChartData } from 'chart.js';
import type { HeartbeatInterval } from '@/stores/heartbeats.ts'
import type { DateDataPoint } from '@/parsers/findings.ts'

export function calculateHeartbeatOverTimeData(
  data: HeartbeatInterval[],
): ChartData<'line', DateDataPoint[]> {
  // First we need to build up the status map so we can then construct a data point set.

  const finalData = data.map((dataPoint) => {
    return {
      interval: new Date(dataPoint.interval),
      count: dataPoint.count,
    } as DateDataPoint;
  }).sort((a, b) => {
    // Order results by their title for better UI consistency
    const x = a.interval;
    const y = b.interval;

    if (x > y) {
      return 1;
    }
    if (x < y) {
      return -1;
    }
    return 0;
  }) as DateDataPoint[];


  return {
    datasets: [
      {
        label: "",
        gradient: {
          backgroundColor: {
            axis: 'y',
            colors: {
              100: `rgba(20,184,166, .5)`,
              // 70: `rgba(${color.r},${color.g},${color.b}, .6)`,
              // 30: `rgba(${color.r},${color.g},${color.b}, .4)`,
              0: `rgba(20,184,166, 0)`,
            },
          },
        },
        borderColor: `rgba(20,184,166, 0.7)`,
        data: finalData,
        parsing: {
          xAxisKey: 'interval',
          yAxisKey: 'count',
        },
      }
    ],
  };
}
