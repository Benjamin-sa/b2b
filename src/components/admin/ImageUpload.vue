<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Product Images
            </label>

            <!-- Upload Area -->
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                :class="{ 'border-blue-500 bg-blue-50': isDragOver }" @drop.prevent="handleDrop"
                @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false">

                <div v-if="!uploading" class="space-y-2">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div class="text-sm text-gray-600">
                        <label for="file-upload"
                            class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload files</span>
                            <input id="file-upload" ref="fileInput" type="file" multiple accept="image/*"
                                class="sr-only" @change="handleFileSelect" />
                        </label>
                        <span class="pl-1">or drag and drop</span>
                    </div>
                    <p class="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                </div>

                <!-- Uploading State -->
                <div v-else class="space-y-4">
                    <svg class="animate-spin mx-auto h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    <p class="text-sm text-gray-600">Uploading images...</p>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            :style="{ width: uploadProgress + '%' }"></div>
                    </div>
                    <p class="text-xs text-gray-500">{{ uploadProgress }}% complete</p>
                </div>
            </div>
        </div>

        <!-- Image Preview Grid -->
        <div v-if="images.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="(image, index) in images" :key="index"
                class="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden">

                <img :src="image.url" :alt="`Product image ${index + 1}`" class="w-full h-full object-cover" />

                <!-- Delete Button -->
                <button @click="removeImage(index)"
                    class="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <!-- Primary Image Indicator -->
                <div v-if="index === 0"
                    class="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    Primary
                </div>

                <!-- Set as Primary Button -->
                <button v-else @click="setPrimaryImage(index)"
                    class="absolute bottom-2 left-2 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-900">
                    Set Primary
                </button>
            </div>
        </div>

        <!-- Error Messages -->
        <div v-if="errors.length > 0" class="space-y-2">
            <div v-for="error in errors" :key="error" class="bg-red-50 border border-red-200 rounded-md p-3">
                <p class="text-sm text-red-600">{{ error }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../../init/firebase'

interface ImageData {
    url: string
    path: string
    name: string
}

interface Props {
    modelValue?: string[]
    maxImages?: number
    maxFileSize?: number // in MB
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => [],
    maxImages: 5,
    maxFileSize: 10
})

const emit = defineEmits<{
    'update:modelValue': [urls: string[]]
}>()

const fileInput = ref<HTMLInputElement>()
const images = ref<ImageData[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const isDragOver = ref(false)
const errors = ref<string[]>([])

// Initialize images from modelValue
watch(() => props.modelValue, (newUrls) => {
    if (newUrls && newUrls.length > 0) {
        const newImages = newUrls.map((url, index) => ({
            url,
            path: '', // We don't have the path for existing images
            name: `image-${index + 1}`
        }))
        // Only update if the URLs are actually different to prevent recursive updates
        const currentUrls = images.value.map(img => img.url)
        if (JSON.stringify(currentUrls) !== JSON.stringify(newUrls)) {
            images.value = newImages
        }
    } else if (newUrls && newUrls.length === 0 && images.value.length > 0) {
        images.value = []
    }
}, { immediate: true })

// Emit changes when images change
watch(images, (newImages) => {
    const urls = newImages.map(img => img.url)
    // Only emit if the URLs have actually changed to prevent recursive updates
    const currentUrls = props.modelValue || []
    if (JSON.stringify(currentUrls) !== JSON.stringify(urls)) {
        emit('update:modelValue', urls)
    }
}, { deep: true })

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
        uploadFiles(Array.from(target.files))
    }
}

const handleDrop = (event: DragEvent) => {
    isDragOver.value = false
    if (event.dataTransfer?.files) {
        uploadFiles(Array.from(event.dataTransfer.files))
    }
}

const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const validFiles: File[] = []
    const fileErrors: string[] = []

    files.forEach(file => {
        // Check file type
        if (!file.type.startsWith('image/')) {
            fileErrors.push(`${file.name} is not an image file`)
            return
        }

        // Check file size
        if (file.size > props.maxFileSize * 1024 * 1024) {
            fileErrors.push(`${file.name} is too large (max ${props.maxFileSize}MB)`)
            return
        }

        // Check total image count
        if (images.value.length + validFiles.length >= props.maxImages) {
            fileErrors.push(`Maximum ${props.maxImages} images allowed`)
            return
        }

        validFiles.push(file)
    })

    return { valid: validFiles, errors: fileErrors }
}

const uploadFiles = async (files: File[]) => {
    errors.value = []

    const { valid: validFiles, errors: validationErrors } = validateFiles(files)
    errors.value = validationErrors

    if (validFiles.length === 0) return

    uploading.value = true
    uploadProgress.value = 0

    try {
        const uploadPromises = validFiles.map(async (file, index) => {
            const timestamp = Date.now()
            const fileName = `products/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const fileRef = storageRef(storage, fileName)

            // Upload file
            const snapshot = await uploadBytes(fileRef, file)

            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref)

            // Update progress
            uploadProgress.value = Math.round(((index + 1) / validFiles.length) * 100)

            return {
                url: downloadURL,
                path: fileName,
                name: file.name
            }
        })

        const uploadedImages = await Promise.all(uploadPromises)
        images.value.push(...uploadedImages)

    } catch (error) {
        console.error('Upload error:', error)
        errors.value.push('Failed to upload images. Please try again.')
    } finally {
        uploading.value = false
        uploadProgress.value = 0
        // Reset file input
        if (fileInput.value) {
            fileInput.value.value = ''
        }
    }
}

const removeImage = async (index: number) => {
    const image = images.value[index]

    try {
        // Delete from Firebase Storage if we have the path
        if (image.path) {
            const imageRef = storageRef(storage, image.path)
            await deleteObject(imageRef)
        }

        // Remove from local array
        images.value.splice(index, 1)

    } catch (error) {
        console.error('Error deleting image:', error)
        errors.value.push('Failed to delete image')
    }
}

const setPrimaryImage = (index: number) => {
    if (index > 0 && index < images.value.length) {
        const [primaryImage] = images.value.splice(index, 1)
        images.value.unshift(primaryImage)
    }
}

const triggerFileSelect = () => {
    fileInput.value?.click()
}

defineExpose({
    triggerFileSelect
})
</script>
