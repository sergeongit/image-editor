import type { ImageFilterState } from '@/types/image-editor'
import { buildFilterString } from '@/utils/imageFilters'

function getCanvasSize(source: HTMLCanvasElement | HTMLImageElement) {
  return {
    width: source instanceof HTMLCanvasElement ? source.width : source.naturalWidth,
    height: source instanceof HTMLCanvasElement ? source.height : source.naturalHeight,
  }
}

export function createCanvasFromSource(
  source: HTMLCanvasElement | HTMLImageElement,
  filters?: ImageFilterState,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const { width, height } = getCanvasSize(source)

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  if (filters) {
    ctx.filter = buildFilterString(filters)
  }

  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

export function createFilteredCanvas(
  source: HTMLCanvasElement | HTMLImageElement,
  filters: ImageFilterState,
): HTMLCanvasElement {
  return createCanvasFromSource(source, filters)
}

export async function createFilteredImageUrl(
  source: HTMLImageElement | HTMLCanvasElement,
  filters: ImageFilterState,
): Promise<string | null> {
  const canvas = createFilteredCanvas(source, filters)

  return new Promise<string | null>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null)
      resolve(URL.createObjectURL(blob))
    })
  })
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url) {
    URL.revokeObjectURL(url)
  }
}
