import type { ImageFilterState } from '@/types/image-editor'

export const defaultFilters: ImageFilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  opacity: 100,
}

const filterKeys = Object.keys(defaultFilters) as Array<keyof ImageFilterState>

export function buildFilterString(filters: ImageFilterState): string {
  return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) opacity(${filters.opacity}%)`
}

export function isFilterChanged(filters: ImageFilterState): boolean {
  return filterKeys.some((key) => filters[key] !== defaultFilters[key])
}
