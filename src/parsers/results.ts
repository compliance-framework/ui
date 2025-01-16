import { type ComplianceBySearchResult, type Result } from '../stores/api'
import { Chart, type ChartData, type ChartDataset } from 'chart.js'

export interface DateDataPoint {
  date: Date
  value: number
}

export function calculateComplianceOverTimeData(
  results: ComplianceBySearchResult[],
): ChartData<'line', DateDataPoint[]> {
  const data = Object.values(results
    .flatMap((record) => record.records)
    .reduce((accumulator, record) => {
      accumulator[record.interval] = {
        date: new Date(record.interval),
        findings: record.findings + (accumulator.hasOwnProperty(record.interval) ? accumulator[record.interval].findings : 0),
        observations: record.observations + (accumulator[record.interval] ? accumulator[record.interval].observations :0),
      }
      return accumulator
    }, {})).sort((a, b) => {
    return a.date.valueOf() - b.date.valueOf()
  })
  return {
    datasets: [
      {
        label: 'Findings',
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
        data: data,
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'findings',
        },
      },
      {
        label: 'Observations',
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
        data: data,
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'observations',
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
        data: Object.values(results
          .flatMap((record) => record.records)
          .reduce((accumulator, record) => {
            accumulator[record.interval] = {
              date: new Date(record.interval),
              uptime: (record.hasRecords ? 1 : 0) + (accumulator[record.interval] ? accumulator[record.interval].uptime :0),
            }
            return accumulator
          }, {})).sort((a, b) => {
          return a.date.valueOf() - b.date.valueOf()
        }),
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'uptime',
        },
      },
    ],
  } as ChartData<'line', DateDataPoint[]>
}
