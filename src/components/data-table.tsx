'use client'

import { useState } from 'react'
import { GlassmorphismContainer } from './glassmorphism-container'
import { Button } from './ui/button'
import { ChevronLeft, ChevronRight, Search, Download } from 'lucide-react'

interface DataTableProps {
  data: any[][]
  columns: string[]
  title?: string
  className?: string
}

export function DataTable({ data, columns, title, className = '' }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage] = useState(10)

  // Filter data based on search term
  const filteredData = data.filter(row => 
    row.some(cell => 
      cell?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  const handleExport = () => {
    const csv = [
      columns.join(','),
      ...filteredData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'data'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <GlassmorphismContainer className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {title && (
            <h3 className="text-xl font-semibold text-white mb-2 font-raleway">
              {title}
            </h3>
          )}
          <p className="text-white/70 text-sm">
            {filteredData.length} rows {searchTerm && `(filtered from ${data.length})`}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-flyadeal-yellow focus:ring-1 focus:ring-flyadeal-yellow"
            />
          </div>
          
          {/* Export Button */}
          <Button
            onClick={handleExport}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/20">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="text-left py-3 px-4 text-white font-semibold font-raleway"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="py-3 px-4 text-white/90"
                  >
                    {cell?.toString() || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
          <p className="text-white/70 text-sm">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
          </p>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <span className="text-white/90 text-sm px-3">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </GlassmorphismContainer>
  )
}