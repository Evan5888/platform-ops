import * as echarts from 'echarts'
import { useEffect, useRef } from 'react'

export function Trend({ labels, series }: { labels: string[]; series: Array<{ name: string; data: Array<number | null> }> }) {
  const ref = useRef<HTMLDivElement>(null)
  const signature = JSON.stringify({ labels, series })
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const chart = echarts.init(node)
    const styles = getComputedStyle(document.documentElement)
    const ink = styles.getPropertyValue('--ink').trim()
    const muted = styles.getPropertyValue('--muted').trim()
    const line = styles.getPropertyValue('--line').trim()
    chart.setOption({
      color: ['#0f4c5c', '#c4492c', '#2a6f97'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: muted } },
      grid: { left: 56, right: 12, top: 16, bottom: 48 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: muted }, axisLine: { lineStyle: { color: line } } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: muted }, splitLine: { lineStyle: { color: line } } },
      series: series.map((item) => ({ type: 'line', smooth: false, showSymbol: labels.length < 3, name: item.name, data: item.data })),
      textStyle: { color: ink },
    })
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [signature, labels, series])
  return <div ref={ref} className="h-64 w-full" />
}
