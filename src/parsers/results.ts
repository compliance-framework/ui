import { type ComplianceBySearchResult, type Result } from '../stores/api'
import { Chart, type ChartData, type ChartDataset } from 'chart.js'

export interface DateDataPoint {
  date: Date
  value: number
}

export function calculateComplianceChartData(results: Result[]): ChartData<'line', number[]> {
  const labels: string[] = []
  const findings: number[] = []
  const observations: number[] = []

  results.forEach((result) => {
    labels.push(result.start)
    findings.push(result.findings.length)
    observations.push(result.observations.length)
  })

  return {
    labels: labels,
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
        data: findings,
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
        data: observations,
      },
    ],
  } as ChartData<'line', number[]>
}

export function calculateComplianceOverTimeData(
  results: ComplianceBySearchResult[],
): ChartData<'line', DateDataPoint[]> {
  const intervals: {
    [interval: string]: {
      findings: number
      observations: number
    }
  } = {}

  for (const result of results) {
    for (const record of result.records) {
      if (intervals.hasOwnProperty(record.interval)) {
        intervals[record.interval].findings = intervals[record.interval].findings + record.findings
        intervals[record.interval].observations =
          intervals[record.interval].observations + record.observations
      } else {
        intervals[record.interval] = {
          findings: record.findings,
          observations: record.observations,
        }
      }
    }
  }

  const findings: DateDataPoint[] = []
  const observations: DateDataPoint[] = []

  for (const interval in intervals) {
    findings.push({
      date: new Date(interval),
      value: intervals[interval].findings,
    })
    observations.push({
      date: new Date(interval),
      value: intervals[interval].observations,
    })
  }

  findings.sort((a, b) => {
    return a.date.valueOf() - b.date.valueOf()
  })
  observations.sort((a, b) => {
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
        data: findings,
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
              100: 'rgba(20,184,166, .4)',
              70: 'rgba(20,184,166, .3)',
              30: 'rgba(20,184,166, .1)',
              0: 'rgba(20,184,166, .0)',
            },
          },
        },
        borderColor: 'rgba(20,184,166, 0.7)',
        data: observations,
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
  const intervals: {
    [interval: string]: {
      uptime: number
    }
  } = {}

  for (const result of results) {
    for (const record of result.records) {
      if (intervals.hasOwnProperty(record.interval)) {
        intervals[record.interval].uptime =
          intervals[record.interval].uptime + (record.hasRecords ? 1 : 0)
      } else {
        intervals[record.interval] = {
          uptime: record.hasRecords ? 1 : 0,
        }
      }
    }
  }

  const dataList = []
  for (const interval in intervals) {
    dataList.push({
      date: new Date(interval),
      value: intervals[interval].uptime,
    })
  }

  dataList.sort((a, b) => {
    return a.date.valueOf() - b.date.valueOf()
  })

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
        data: dataList,
        parsing: {
          xAxisKey: 'date',
          yAxisKey: 'value',
        },
      },
    ],
  } as ChartData<'line', DateDataPoint[]>
}

export function calculateComplianceRatioData(results: Result[]): ChartData<'line', number[]> {
  let findings = 0
  let observations = 0
  for (const result of results) {
    findings += result.findings.length
    observations += result.observations.length
  }

  return {
    labels: ['Findings', 'Observations'],
    datasets: [
      {
        backgroundColor: ['rgb(253,92,110)', 'rgb(20,184,166)'],
        data: [findings, observations],
      },
    ],
  } as ChartData<'line', number[]>
}
