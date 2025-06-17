'use client'

import { useMemo } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'

interface DataChartsProps {
  data: any[][]
  columns: string[]
  title?: string
  className?: string
}

export function DataCharts({ data, columns, title, className = '' }: DataChartsProps) {
  // Analyze data to create charts
  const chartData = useMemo(() => {
    if (!data.length || !columns.length) return null

    // Find numeric columns
    const numericColumns = columns
      .map((col, index) => ({ name: col, index }))
      .filter(({ index }) => {
        return data.some(row => {
          const value = row[index]
          return !isNaN(Number(value)) && value !== null && value !== ''
        })
      })

    // Find categorical columns
    const categoricalColumns = columns
      .map((col, index) => ({ name: col, index }))
      .filter(({ index }) => {
        const uniqueValues = new Set(data.map(row => row[index]))
        return uniqueValues.size <= 20 && uniqueValues.size > 1
      })

    return { numericColumns, categoricalColumns }
  }, [data, columns])

  const createBarChart = (categoryIndex: number, valueIndex: number) => {
    const groupedData = data.reduce((acc, row) => {
      const category = row[categoryIndex]?.toString() || 'Unknown'
      const value = Number(row[valueIndex]) || 0
      acc[category] = (acc[category] || 0) + value
      return acc
    }, {} as Record<string, number>)

    const entries = Object.entries(groupedData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10

    const maxValue = Math.max(...entries.map(([,value]) => value))

    return (
      <div className="space-y-3">
        {entries.map(([category, value]) => (
          <div key={category} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/90 truncate">{category}</span>
              <span className="text-flyadeal-yellow font-medium">{value.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-flyadeal-yellow to-flyadeal-orange h-2 rounded-full transition-all duration-500"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const createMetricCard = (columnIndex: number) => {
    const values = data
      .map(row => Number(row[columnIndex]))
      .filter(value => !isNaN(value))

    if (values.length === 0) return null

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-flyadeal-yellow">
            {sum.toLocaleString()}
          </div>
          <div className="text-white/70 text-sm">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-flyadeal-light-blue">
            {avg.toFixed(2)}
          </div>
          <div className="text-white/70 text-sm">Average</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-flyadeal-green">
            {min.toLocaleString()}
          </div>
          <div className="text-white/70 text-sm">Min</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-flyadeal-red">
            {max.toLocaleString()}
          </div>
          <div className="text-white/70 text-sm">Max</div>
        </div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <GlassmorphismContainer className={`p-6 ${className}`}>
        <div className="text-center text-white/70">
          <p>No data available for visualization</p>
        </div>
      </GlassmorphismContainer>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold text-white font-raleway">
          {title}
        </h3>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chartData.numericColumns.slice(0, 3).map(({ name, index }) => (
          <GlassmorphismContainer key={name} className="p-4">
            <h4 className="text-lg font-medium text-white mb-4 font-raleway">
              {name}
            </h4>
            {createMetricCard(index)}
          </GlassmorphismContainer>
        ))}
      </div>

      {/* Bar Charts */}
      {chartData.categoricalColumns.length > 0 && chartData.numericColumns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {chartData.categoricalColumns.slice(0, 2).map((catCol) => 
            chartData.numericColumns.slice(0, 1).map((numCol) => (
              <GlassmorphismContainer key={`${catCol.name}-${numCol.name}`} className="p-6">
                <h4 className="text-lg font-medium text-white mb-4 font-raleway">
                  {numCol.name} by {catCol.name}
                </h4>
                {createBarChart(catCol.index, numCol.index)}
              </GlassmorphismContainer>
            ))
          )}
        </div>
      )}

      {/* Data Summary */}
      <GlassmorphismContainer className="p-6">
        <h4 className="text-lg font-medium text-white mb-4 font-raleway">
          Data Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-flyadeal-yellow">
              {data.length.toLocaleString()}
            </div>
            <div className="text-white/70 text-sm">Total Rows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-flyadeal-light-blue">
              {columns.length}
            </div>
            <div className="text-white/70 text-sm">Columns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-flyadeal-green">
              {chartData.numericColumns.length}
            </div>
            <div className="text-white/70 text-sm">Numeric</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-flyadeal-pink">
              {chartData.categoricalColumns.length}
            </div>
            <div className="text-white/70 text-sm">Categorical</div>
          </div>
        </div>
      </GlassmorphismContainer>
    </div>
  )
}