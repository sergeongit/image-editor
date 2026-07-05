import { nextTick, ref, watch } from 'vue'
import type { Ref } from 'vue'
import Cropper from 'cropperjs'
import type { ImageFilterState } from '@/types/image-editor'
import { createFilteredImageUrl, revokeObjectUrl } from '@/utils/imagePreview'

interface UseImageCropperOptions {
  imageUrl: Ref<string | null>
  filters: Ref<ImageFilterState>
  cropping: Ref<boolean>
}

export function useImageCropper(options: UseImageCropperOptions) {
  const { imageUrl, filters, cropping } = options

  const imgRef = ref<HTMLImageElement | null>(null)
  const imageSource = ref<string>('')

  let cropper: Cropper | null = null
  let activePreviewUrl: string | null = null
  let syncVersion = 0

  async function syncImageSource() {
    const currentSyncVersion = ++syncVersion
    const currentImageUrl = imageUrl.value
    const currentFilters = { ...filters.value }

    if (!currentImageUrl) {
      revokeObjectUrl(activePreviewUrl)
      activePreviewUrl = null
      imageSource.value = ''
      return
    }

    const baseImage = new Image()
    baseImage.src = currentImageUrl

    if (!baseImage.complete) {
      await new Promise<void>((resolve, reject) => {
        baseImage.onload = () => resolve()
        baseImage.onerror = () => reject(new Error('Failed to load image for preview'))
      })
    }

    const filteredUrl = await createFilteredImageUrl(baseImage, currentFilters)

    if (currentSyncVersion !== syncVersion) {
      revokeObjectUrl(filteredUrl)
      return
    }

    revokeObjectUrl(activePreviewUrl)
    activePreviewUrl = filteredUrl
    imageSource.value = filteredUrl || currentImageUrl
  }

  watch(
    () => imageUrl.value,
    () => {
      void syncImageSource()
    },
    { flush: 'post' },
  )

  watch(
    () => filters.value,
    () => {
      void syncImageSource()
    },
    { deep: true, flush: 'post' },
  )

  async function startCrop() {
    if (!imageUrl.value || !imgRef.value) return

    await syncImageSource()

    const img = imgRef.value
    if (!img.complete) {
      await new Promise<void>((resolve) => {
        const onLoad = () => {
          img.removeEventListener('load', onLoad)
          resolve()
        }
        img.addEventListener('load', onLoad)
      })
    }

    cropping.value = true
    await nextTick()

    cropper = new Cropper(img, {
      viewMode: 1,
      autoCropArea: 0.8,
      responsive: true,
      background: false,
      movable: false,
      zoomable: false,
      scalable: false,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    })
  }

  async function applyCrop() {
    if (!cropper || !imgRef.value) return null

    const canvas = cropper.getCroppedCanvas({ imageSmoothingEnabled: true })
    if (!canvas) return null

    const croppedImageUrl = canvas.toDataURL('image/png')

    cropper.destroy()
    cropper = null

    const img = imgRef.value
    img.src = croppedImageUrl
    revokeObjectUrl(activePreviewUrl)
    activePreviewUrl = null
    imageSource.value = croppedImageUrl
    cropping.value = false

    return croppedImageUrl
  }

  function cancelCrop() {
    if (cropper) {
      cropper.destroy()
      cropper = null
    }

    cropping.value = false
    void syncImageSource()
  }

  function cleanup() {
    if (cropper) {
      cropper.destroy()
      cropper = null
    }

    revokeObjectUrl(activePreviewUrl)
    activePreviewUrl = null
  }

  function getCroppedCanvas() {
    return cropper?.getCroppedCanvas() ?? null
  }

  return {
    imgRef,
    imageSource,
    startCrop,
    applyCrop,
    cancelCrop,
    cleanup,
    resetPreviewState: cleanup,
    getCroppedCanvas,
  }
}
