import { type ChartData, type ChartDataset } from 'chart.js';
import type { ComplianceInterval } from '@/stores/findings.ts'

export interface DateDataPoint {
  interval: Date;
  count: number;
}

type RGB = {
  r: number;
  g: number;
  b: number;
};

function getStatusColour(status: string): RGB {
  let color: RGB = {
    r: 128,
    g: 128,
    b: 128,
  };
  if (status === 'not-satisfied') {
    color = {
      r: 253,
      g: 92,
      b: 110,
    };
  } else if (status === 'satisfied') {
    color = {
      r: 20,
      g: 184,
      b: 166,
    };
  }

  return color;
}

export function calculateComplianceOverTimeData(
  complianceData: ComplianceInterval[],
): ChartData<'line', DateDataPoint[]> {
  // First we need to build up the status map so we can then construct a data point set.

  const sortedComplianceData = complianceData
    .map((dataPoint) => {
      return {
        interval: new Date(dataPoint.interval),
        statuses: dataPoint.statuses,
      };
    })
    .sort((a, b) => {
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
    });

  // We want to split the data by the status names, so we can build different tracks for them.
  const datasets: { [key: string]: DateDataPoint[] } = {};

  for (const compliance of sortedComplianceData) {
    for (const status of compliance.statuses) {
      if (!datasets.hasOwnProperty(status.status)) {
        datasets[status.status] = [];
      }

      datasets[status.status].push({
        count: status.count,
        interval: compliance.interval,
      } as DateDataPoint);
    }
  }

  const finalDataset = [];
  for (const [status, data] of Object.entries(datasets)) {
    const color = getStatusColour(status);
    finalDataset.push({
      label: status,
      gradient: {
        backgroundColor: {
          axis: 'y',
          colors: {
              100: `rgba(${color.r},${color.g},${color.b}, .5)`,
              // 70: `rgba(${color.r},${color.g},${color.b}, .6)`,
              // 30: `rgba(${color.r},${color.g},${color.b}, .4)`,
              0: `rgba(${color.r},${color.g},${color.b}, 0)`,
          },
        },
      },
      borderColor: `rgba(${color.r},${color.g},${color.b}, 0.7)`,
      data: data,
      parsing: {
        xAxisKey: 'interval',
        yAxisKey: 'count',
      },
    });
  }

  finalDataset.sort((x, y) => {
    if (x.label > y.label) {
      return -1;
    }
    if (x.label < y.label) {
      return 1;
    }
    return 0;
  });

  return {
    datasets: finalDataset as ChartDataset<"line", DateDataPoint[]>[],
  };
}
