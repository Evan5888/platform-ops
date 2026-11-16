import afunMxn from './reports/afun-mx-mxn.csv?raw'
import afunUsd from './reports/afun-mx-usd.csv?raw'
import betroiaMxn from './reports/betroia-mxn.csv?raw'
import betroiaUsd from './reports/betroia-usd.csv?raw'
import { parseReports } from '../lib/reports'

export const reportBundle = parseReports([
  { platformId: 'afun-mx', currency: 'MXN', filename: 'afun-mx-mxn.csv', csv: afunMxn },
  { platformId: 'afun-mx', currency: 'USD', filename: 'afun-mx-usd.csv', csv: afunUsd },
  { platformId: 'betroia', currency: 'MXN', filename: 'betroia-mxn.csv', csv: betroiaMxn },
  { platformId: 'betroia', currency: 'USD', filename: 'betroia-usd.csv', csv: betroiaUsd },
])
