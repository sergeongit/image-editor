import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ImageFilterState } from '@/types/image-editor'
import { defaultFilters } from '@/utils/imageFilters'

export const imageEditorStore = defineStore('imageEditor', () => {
  const imageUrl = ref<string | null>(null)
  const croppedUrl = ref<string | null>(null)
  const filters = ref<ImageFilterState>({ ...defaultFilters })
  const cropping = ref(false)

  function resetFilters() {
    filters.value = { ...defaultFilters }
  }

  return {
    imageUrl,
    croppedUrl,
    filters,
    cropping,
    resetFilters,
  }
})
