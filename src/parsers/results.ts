import { type ComplianceBySearchResult, type Result } from '../stores/api'
import { type ChartData, type ChartDataset, type ChartPoint } from 'chart.js'

export function calculateComplianceChartData(results: Result[]): ChartData {
  const labels: string[] = []
  const findings: ChartDataset = {
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
    data: [],
  }
  const observations: ChartDataset = {
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
    data: [],
  }

  results.forEach((result) => {
    labels.push(result.start)
    findings.data?.push(result.findings.length)
    observations.data?.push(result.observations.length)
  })

  return {
    labels: labels,
    datasets: [findings, observations],
  } as ChartData
}

export function calculateComplianceOverTimeData(results: ComplianceBySearchResult[]): ChartData {
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

  const data = {
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
        data: [],
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
        data: [],
      },
    ],
  } as ChartData

  for (const interval in intervals) {
    data.datasets[0].data.push({
      x: new Date(interval),
      y: intervals[interval].findings,
    } as ChartPoint)
    data.datasets[1].data.push({
      x: new Date(interval),
      y: intervals[interval].findings,
    } as ChartPoint)
  }

  return data;
}

export function calculateComplianceRatioData(results: Result[]): ChartData {
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
  } as ChartData
}
