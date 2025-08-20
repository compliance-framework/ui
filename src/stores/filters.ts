import { type Filter } from '@/parsers/labelfilter.ts'
import type { Control } from '@/stores/catalogs.ts'

export interface Dashboard {
  id?: string
  uuid?: string
  name: string
  filter: Filter
  controls: Control[]
}

/** Used for creating a Dashboard: controls passed as an array of IDs */
export interface DashboardCreate extends Omit<Dashboard, 'controls'> {
  controls: string[];
}
