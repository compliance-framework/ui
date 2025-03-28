import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  TimeScale,
  TimeSeriesScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import gradient from 'chartjs-plugin-gradient'
import 'chartjs-adapter-luxon';

export function useCharts() {
  // state encapsulated and managed by the composable
  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    Filler,
    PointElement,
    LineElement,
    CategoryScale,
    TimeScale,
    TimeSeriesScale,
    LinearScale,
    gradient,
  )

  ChartJS.defaults.set({
    plugins: {
      gradient,
      legend: {
        display: false,
      },
    },
    layout: {
      autoPadding: false,
      padding: {
        top: 4,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        radius: 0,
        hitRadius: 2,
        hoverRadius: 4,
      },
      line: {
        cubicInterpolationMode: 'monotone',
        borderWidth: 2,
        fill: true,
      },
    },
    scale: {
      grid: {
        drawBorder: false,
        display: false,
        drawOnChartArea: false,
        drawTicks: false,
      },
      border: {
        display: false,
      },
      ticks: {
        display: false,
      },
      suggestedMin: 0,
    }
  })
}
