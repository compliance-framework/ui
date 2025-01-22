import {
  type ComplianceBySearchResult,
  type ComplianceBySearchResultRecord,
  type Result,
} from '../stores/api'
import { Chart, type ChartData, type ChartDataset } from 'chart.js'

export interface DateDataPoint {
  date: Date
  value: number
}

function intervalledReduce(records: ComplianceBySearchResultRecord[], valueKey: keyof ComplianceBySearchResultRecord) {
  return Object.values(records.reduce(
    (acc, rec) => {
      acc[rec.interval] = {
        date: new Date(rec.interval),
        value: rec[valueKey] as number + (acc.hasOwnProperty(rec.interval) ? acc[rec.interval].value : 0),
      }
      return acc
    },
    {} as { [interval: string]: DateDataPoint },
  ))
}

function sortByDate(a: DateDataPoint, b: DateDataPoint): number {
  return a.date.valueOf() - b.date.valueOf()
}

export function calculateComplianceOverTimeData(
  results: ComplianceBySearchResult[],
): ChartData<'line', DateDataPoint[]> {
  const records = results.flatMap((record) => record.records)

  return {
    datasets: [
      {
        label: 'Failed',
        gradient: {
          backgroundColor: {
            axis: 'y',
            colors: {
              100: 'rgba(253,92,110,0.4)',
              70: 'rgba(253,92,110, .3)',
              30: 'rgba(253,92,110, .1)',
              0: 'rgba(253,92,110, .0)',
            },
          },
        },
        borderColor: 'rgba(253,92,110, 0.7)',
        data: intervalledReduce(records, "findings_fail").sort(sortByDate),
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'value',
        },
      },
      {
        label: 'Passed',
        gradient: {
          backgroundColor: {
            axis: 'y',
            colors: {
              100: 'rgba(20,184,166,0.4)',
              70: 'rgba(20,184,166, .3)',
              30: 'rgba(20,184,166, .1)',
              0: 'rgba(20,184,166, .0)',
            },
          },
        },
        borderColor: 'rgba(20,184,166, 0.7)',
        data: intervalledReduce(records, "findings_pass").sort(sortByDate),
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'value',
        },
      },
      {
        label: 'Observations',
        gradient: {
          backgroundColor: {
            axis: 'y',
            colors: {
              100: 'rgba(30 64 175, .4)',
              70: 'rgba(30 64 175, .3)',
              30: 'rgba(30 64 175, .1)',
              0: 'rgba(30 64 175, .0)',
            },
          },
        },
        borderColor: 'rgba(30 64 175, 0.7)',
        data: intervalledReduce(records, "observations").sort(sortByDate),
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'value',
        },
      },
    ],
  }
}

export function calculateAgentUptimeData(
  results: ComplianceBySearchResult[],
): ChartData<'line', DateDataPoint[]> {
  return {
    datasets: [
      {
        label: 'HeartBeats',
        gradient: {
          backgroundColor: {
            axis: 'y',
            colors: {
              100: 'rgba(20,184,166, .4)',
              70: 'rgba(20,184,166, .3)',
              30: 'rgba(20,184,166, .1)',
              0: 'rgba(20,184,166, .0)',
            },
          },
        },
        borderColor: 'rgba(20,184,166, 0.7)',
        data: Object.values(results.flatMap((record) => record.records).reduce(
          (acc, rec) => {
            if (acc.hasOwnProperty(rec.interval)) {
              acc[rec.interval].value += rec.hasRecords ? 1 : 0
            } else {
              acc[rec.interval] = {
                date: new Date(rec.interval),
                value: rec.hasRecords ? 1 : 0,
              }
            }
            return acc
          },
          {} as { [interval: string]: DateDataPoint },
        )).sort(sortByDate),
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'value',
        },
      },
    ],
  }
}
