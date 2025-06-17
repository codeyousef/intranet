import axios from 'axios'

interface PowerBIConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  username: string
  password: string
}

interface PowerBIToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface PowerBIDashboard {
  id: string
  displayName: string
  embedUrl: string
  isReadOnly: boolean
}

interface PowerBIReport {
  id: string
  reportType: string
  name: string
  webUrl: string
  embedUrl: string
  isOwnedByMe: boolean
  datasetId: string
}

interface PowerBIDataset {
  id: string
  name: string
  tables: PowerBITable[]
}

interface PowerBITable {
  name: string
  columns: PowerBIColumn[]
}

interface PowerBIColumn {
  name: string
  dataType: string
}

interface PowerBIQueryResult {
  results: Array<{
    tables: Array<{
      rows: any[][]
    }>
  }>
}

class PowerBIService {
  private config: PowerBIConfig
  private accessToken: string | null = null

  constructor() {
    this.config = {
      clientId: process.env.POWERBI_CLIENT_ID!,
      clientSecret: process.env.POWERBI_CLIENT_SECRET!,
      tenantId: process.env.POWERBI_TENANT_ID!,
      username: '', // Not needed for service principal
      password: '', // Not needed for service principal
    }
  }

  async getAccessToken(userToken?: string): Promise<string> {
    // If we have a user token from NextAuth, use that for delegated access
    if (userToken) {
      return userToken
    }

    if (this.accessToken) {
      return this.accessToken
    }

    const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`
    
    // Use client credentials flow as fallback
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    })

    try {
      const response = await axios.post<PowerBIToken>(tokenUrl, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      this.accessToken = response.data.access_token
      
      // Set token expiration timer
      setTimeout(() => {
        this.accessToken = null
      }, (response.data.expires_in - 300) * 1000) // Refresh 5 minutes before expiry

      return this.accessToken
    } catch (error) {
      console.error('Error getting Power BI access token:', error)
      if (axios.isAxiosError(error) && error.response) {
        console.error('Response data:', error.response.data)
        console.error('Response status:', error.response.status)
      }
      throw new Error('Failed to authenticate with Power BI')
    }
  }

  async getDashboards(): Promise<PowerBIDashboard[]> {
    const token = await this.getAccessToken()
    
    try {
      const response = await axios.get('https://api.powerbi.com/v1.0/myorg/dashboards', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return response.data.value
    } catch (error) {
      console.error('Error fetching dashboards:', error)
      throw new Error('Failed to fetch dashboards')
    }
  }

  async getReports(userToken?: string): Promise<PowerBIReport[]> {
    const token = await this.getAccessToken(userToken)
    
    try {
      // Try user's personal reports first
      const response = await axios.get('https://api.powerbi.com/v1.0/me/reports', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return response.data.value
    } catch (error) {
      console.error('Error fetching personal reports, trying organization reports:', error)
      
      // Fallback to organization reports
      try {
        const response = await axios.get('https://api.powerbi.com/v1.0/myorg/reports', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        return response.data.value
      } catch (orgError) {
        console.error('Error fetching organization reports:', orgError)
        throw new Error('Failed to fetch reports')
      }
    }
  }

  async getReport(reportId: string, userToken?: string): Promise<PowerBIReport | null> {
    const token = await this.getAccessToken(userToken)
    
    try {
      // Try organization reports first (this is where shared reports often appear)
      try {
        const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/reports/${reportId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        console.log('Found report at organization level')
        return response.data
      } catch (orgError) {
        console.log('Report not found at organization level, trying workspaces...')
      }

      // Then try workspaces
      const workspacesResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const workspaces = workspacesResponse.data.value || []
      console.log(`Found ${workspaces.length} accessible workspaces`)

      // Try to find the report in each workspace
      for (const workspace of workspaces) {
        try {
          const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/reports/${reportId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          console.log(`Found report in workspace: ${workspace.name}`)
          return response.data
        } catch (workspaceError) {
          // Report not in this workspace, continue searching
        }
      }

      // Finally try personal reports
      try {
        const response = await axios.get(`https://api.powerbi.com/v1.0/me/reports/${reportId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        console.log('Found report in personal reports')
        return response.data
      } catch (personalError) {
        console.error('Report not found in personal reports either')
      }

      return null
    } catch (error) {
      console.error('Error fetching report:', error)
      return null
    }
  }

  async getEmbedToken(reportId: string, datasetId: string): Promise<string> {
    const token = await this.getAccessToken()
    
    const requestBody = {
      reports: [{ id: reportId }],
      datasets: [{ id: datasetId }],
    }

    try {
      const response = await axios.post(
        'https://api.powerbi.com/v1.0/myorg/GenerateToken',
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data.token
    } catch (error) {
      console.error('Error getting embed token:', error)
      throw new Error('Failed to get embed token')
    }
  }

  async getDataset(datasetId: string): Promise<PowerBIDataset> {
    const token = await this.getAccessToken()
    
    try {
      const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return response.data
    } catch (error) {
      console.error('Error fetching dataset:', error)
      throw new Error('Failed to fetch dataset')
    }
  }

  async getDatasetTables(datasetId: string, userToken?: string): Promise<PowerBITable[]> {
    const token = await this.getAccessToken(userToken)
    
    try {
      // First try to find the dataset in workspaces
      const workspacesResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const workspaces = workspacesResponse.data.value || []
      
      // Try to find the dataset in each workspace
      for (const workspace of workspaces) {
        try {
          const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/datasets/${datasetId}/tables`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          console.log(`Found dataset tables in workspace: ${workspace.name}`)
          return response.data.value
        } catch (workspaceError) {
          // Dataset not in this workspace, continue searching
        }
      }

      // If not found in workspaces, try personal datasets
      const response = await axios.get(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/tables`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      return response.data.value
    } catch (error) {
      console.error('Error fetching dataset tables:', error)
      throw new Error('Failed to fetch dataset tables')
    }
  }

  async executeQuery(datasetId: string, daxQuery: string, userToken?: string, workspaceId?: string): Promise<PowerBIQueryResult> {
    const token = await this.getAccessToken(userToken)
    
    const requestBody = {
      queries: [
        {
          query: daxQuery
        }
      ]
    }

    try {
      // If we have a workspace ID, use it directly
      if (workspaceId) {
        const response = await axios.post(
          `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/executeQueries`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        return response.data
      }

      // Otherwise, try to find the dataset in workspaces
      const workspacesResponse = await axios.get('https://api.powerbi.com/v1.0/myorg/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const workspaces = workspacesResponse.data.value || []
      
      // Try to execute query in each workspace
      for (const workspace of workspaces) {
        try {
          const response = await axios.post(
            `https://api.powerbi.com/v1.0/myorg/groups/${workspace.id}/datasets/${datasetId}/executeQueries`,
            requestBody,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )
          console.log(`Query executed in workspace: ${workspace.name}`)
          return response.data
        } catch (workspaceError) {
          // Dataset not in this workspace, continue searching
        }
      }

      // If not found in workspaces, try organization level
      const response = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/executeQueries`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data
    } catch (error) {
      console.error('Error executing query:', error)
      throw new Error('Failed to execute query')
    }
  }

  async getReportData(reportId: string, tableName?: string, userToken?: string): Promise<any[]> {
    try {
      // First get the report to find its dataset
      const report = await this.getReport(reportId, userToken)
      if (!report) {
        throw new Error('Report not found')
      }

      // Get dataset tables
      const tables = await this.getDatasetTables(report.datasetId, userToken)
      
      if (tableName) {
        // Query specific table
        const daxQuery = `EVALUATE ${tableName}`
        const result = await this.executeQuery(report.datasetId, daxQuery, userToken)
        return this.parseQueryResult(result)
      } else {
        // Get data from the first table
        const firstTable = tables[0]
        if (firstTable) {
          const daxQuery = `EVALUATE ${firstTable.name}`
          const result = await this.executeQuery(report.datasetId, daxQuery, userToken)
          return this.parseQueryResult(result)
        }
      }

      return []
    } catch (error) {
      console.error('Error getting report data:', error)
      throw new Error('Failed to get report data')
    }
  }

  private parseQueryResult(result: PowerBIQueryResult): any[] {
    try {
      if (result.results && result.results.length > 0) {
        const firstResult = result.results[0]
        if (firstResult.tables && firstResult.tables.length > 0) {
          return firstResult.tables[0].rows || []
        }
      }
      return []
    } catch (error) {
      console.error('Error parsing query result:', error)
      return []
    }
  }

  async getReportSummaryData(reportId: string, userToken?: string): Promise<{
    totalRows: number
    tables: string[]
    sampleData: any[]
    columns: string[]
  }> {
    try {
      const report = await this.getReport(reportId, userToken)
      if (!report) {
        throw new Error('Report not found')
      }

      const tables = await this.getDatasetTables(report.datasetId, userToken)
      const tableNames = tables.map(t => t.name)
      
      // Get sample data from first table
      let sampleData: any[] = []
      let columns: string[] = []
      let totalRows = 0

      if (tables.length > 0) {
        const firstTable = tables[0]
        columns = firstTable.columns?.map(c => c.name) || []
        
        // Get first 10 rows as sample
        const daxQuery = `EVALUATE TOPN(10, ${firstTable.name})`
        try {
          const result = await this.executeQuery(report.datasetId, daxQuery, userToken)
          sampleData = this.parseQueryResult(result)
        } catch (error) {
          console.log('Could not get sample data, trying alternative query')
        }

        // Try to get row count
        try {
          const countQuery = `EVALUATE ROW("Count", COUNTROWS(${firstTable.name}))`
          const countResult = await this.executeQuery(report.datasetId, countQuery, userToken)
          const countData = this.parseQueryResult(countResult)
          if (countData.length > 0 && countData[0].length > 0) {
            totalRows = countData[0][0] || 0
          }
        } catch (error) {
          console.log('Could not get row count')
        }
      }

      return {
        totalRows,
        tables: tableNames,
        sampleData,
        columns
      }
    } catch (error) {
      console.error('Error getting report summary:', error)
      throw new Error('Failed to get report summary')
    }
  }
}

export default PowerBIService