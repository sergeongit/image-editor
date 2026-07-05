<script setup lang="ts">
import { onUnmounted, computed } from 'vue'
import { imageEditorStore } from './stores/imageEditor'
import 'cropperjs/dist/cropper.css'
import { isFilterChanged } from '@/utils/imageFilters'
import { useImageCropper } from '@/composables/useImageCropper'
import { createCanvasFromSource, revokeObjectUrl } from '@/utils/imagePreview'

const store = imageEditorStore()

const {
  imgRef,
  imageSource,
  startCrop,
  applyCrop,
  cancelCrop: cancelCropper,
  cleanup,
  getCroppedCanvas: getCropperCanvas,
} = useImageCropper({
  imageUrl: computed(() => store.imageUrl),
  filters: computed(() => store.filters),
  cropping: computed({
    get: () => store.cropping,
    set: (value) => {
      store.cropping = value
    },
  }),
})

const filtersDisabled = computed(() => !store.imageUrl || store.cropping)
const hasUnsavedFilterChanges = computed(() => isFilterChanged(store.filters))

let currentObjectUrl: string | null = null

function clearCropped() {
  if (store.croppedUrl) {
    URL.revokeObjectURL(store.croppedUrl)
    store.croppedUrl = null
  }
}

function revokeCurrentObjectUrl() {
  revokeObjectUrl(currentObjectUrl)
  currentObjectUrl = null
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  revokeCurrentObjectUrl()
  clearCropped()
  store.resetFilters()
  store.cropping = false

  currentObjectUrl = URL.createObjectURL(file)
  store.imageUrl = currentObjectUrl
}

async function startCropHandler() {
  if (store.cropping) {
    const croppedImageUrl = await applyCrop()
    if (croppedImageUrl) {
      store.imageUrl = croppedImageUrl
      store.resetFilters()
    }
    return
  }

  await startCrop()
}

function cancelChanges() {
  cancelCropper()
  store.resetFilters()
}

function exitCropMode() {
  cancelCropper()
}

function downloadBlob(blob: Blob, filename = 'edited-image.png') {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

function saveImage() {
  if (store.cropping && imgRef.value) {
    const croppedCanvas = getCropperCanvas()
    if (!croppedCanvas) return

    croppedCanvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob(blob)
      clearCropped()
      const url = URL.createObjectURL(blob)
      store.croppedUrl = url
    })
    cancelChanges()
    return
  }

  if (store.croppedUrl) {
    const link = document.createElement('a')
    link.href = store.croppedUrl
    link.download = 'edited-image.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return
  }

  if (!store.imageUrl || !imgRef.value) return

  const outputCanvas = createCanvasFromSource(imgRef.value)
  outputCanvas.toBlob((blob) => {
    if (!blob) return
    downloadBlob(blob)
    clearCropped()
    const url = URL.createObjectURL(blob)
    store.croppedUrl = url
  })
}

onUnmounted(() => {
  revokeCurrentObjectUrl()
  cleanup()
  clearCropped()
})
</script>

<template>
  <header>
    <h2>Upload image 📥</h2>
  </header>

  <main class="general-container">
    <!-- File input -->
    <div class="upload-box">
      <input type="file" accept="image/*" @change="onFileChange" />
    </div>

    <!-- Preview / Crop area -->
    <div class="preview">
      <h3>Preview</h3>
      <div v-if="store.imageUrl" class="cropper-box">
        <div class="cropper-host">
          <div class="cropper-preview">
            <img ref="imgRef" :src="imageSource" alt="preview" />
          </div>
        </div>
      </div>
    </div>

    <!-- Image settings -->
    <div class="controls">
      <v-card>
        <v-card-item>
          <v-card-title>Brightness</v-card-title>
          <v-slider
            v-model="store.filters.brightness"
            min="50"
            max="150"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <v-card-title>Contrast</v-card-title>
          <v-slider
            v-model="store.filters.contrast"
            min="50"
            max="150"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <v-card-title>Saturation</v-card-title>
          <v-slider
            v-model="store.filters.saturation"
            min="50"
            max="150"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <v-card-title>Grayscale</v-card-title>
          <v-slider
            v-model="store.filters.grayscale"
            min="0"
            max="100"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <v-card-title>Sepia</v-card-title>
          <v-slider
            v-model="store.filters.sepia"
            min="0"
            max="100"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <v-card-title>Opacity</v-card-title>
          <v-slider
            v-model="store.filters.opacity"
            min="0"
            max="100"
            step="1"
            :disabled="filtersDisabled"
          />
        </v-card-item>

        <v-card-item>
          <!-- Crop controls -->
          <v-row class="flex-nowrap gap-2">
            <v-btn
              class="flex-grow-1"
              variant="outlined"
              @click="startCropHandler"
              :disabled="!store.imageUrl"
              >{{ store.cropping ? 'Apply crop' : 'Crop ✂️' }}</v-btn
            >
            <v-btn
              v-if="store.cropping"
              class="flex-grow-1"
              variant="outlined"
              @click="exitCropMode"
              >Exit crop</v-btn
            >
          </v-row>
        </v-card-item>

        <v-card-item class="controls-buttons">
          <v-row>
            <v-btn
              class="cancel"
              variant="outlined"
              @click="cancelChanges"
              :disabled="!store.cropping && !hasUnsavedFilterChanges"
              >Cancel</v-btn
            >
            <v-btn class="save" variant="outlined" @click="saveImage" :disabled="!store.imageUrl"
              >Save</v-btn
            >
          </v-row>
        </v-card-item>
      </v-card>
    </div>
  </main>
</template>

<style scoped>
.general-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
}
.upload-box {
  grid-column: 1/5;
}
.preview {
  grid-column: 1/4;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  position: relative;
  max-height: 740px;
  border: 4px solid white;
  h3 {
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
}
.controls {
  grid-column: 4/5;
}
.controls-buttons {
  display: flex;
  justify-content: flex-end;
  margin: 16px 0 0 auto;
  button {
    flex: 1;
  }
}
button.crop {
  width: 100%;
}
button.cancel {
  background-color: #910707;
}
button.save {
  background-color: #6d9b2c;
}
/* cropper window */
.cropper-box {
  width: 100%;
}
.cropper-host {
  width: 100%;
  max-width: 100%;
}
.cropper-host {
  width: 100%;
  max-width: 100%;
}
.cropper-preview {
  width: 100%;
  max-width: 900px;
  max-height: 732px;
  overflow: hidden;
}
.cropper-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: 900px;
  max-height: 732px;
}
</style>
