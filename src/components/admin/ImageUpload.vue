<template>
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Images
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
                    <p class="text-xs text-gray-500">PNG, JPG, GIF up to {{ maxFileSize }}MB</p>
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
                    <p class="text-sm text-gray-600">Uploading...</p>
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
                    Set as Primary
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
import { ref, watch } from 'vue'

interface ImageData {
    url: string // Dit is de publieke R2 URL
    path: string // Het pad in de R2 bucket
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

// Haal de Worker URL op uit de environment variables
const workerUrl = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
if (!workerUrl) {
    console.error("VITE_CLOUDFLARE_WORKER_URL is not defined in .env file!");
}


// Initialiseer de component met bestaande afbeeldingen
watch(() => props.modelValue, (newUrls) => {
    if (newUrls && JSON.stringify(newUrls) !== JSON.stringify(images.value.map(img => img.url))) {
        images.value = newUrls.map(url => ({
            url,
            path: new URL(url).pathname.substring(1),
            name: url.substring(url.lastIndexOf('/') + 1)
        }));
    }
}, { immediate: true });


// Update de parent component wanneer de afbeeldingenlijst wijzigt
watch(images, (newImages) => {
    const urls = newImages.map(img => img.url)
    if (JSON.stringify(props.modelValue) !== JSON.stringify(urls)) {
        emit('update:modelValue', urls)
    }
}, { deep: true })


const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const validFiles: File[] = []
    const fileErrors: string[] = []

    files.forEach(file => {
        if (!file.type.startsWith('image/')) {
            fileErrors.push(`${file.name} is not an image file`)
            return
        }
        if (file.size > props.maxFileSize * 1024 * 1024) {
            fileErrors.push(`${file.name} is too large (max ${props.maxFileSize}MB)`)
            return
        }
        if (images.value.length + validFiles.length >= props.maxImages) {
            fileErrors.push(`Maximum ${props.maxImages} images allowed`)
            // Stop met valideren als de limiet is bereikt
            return
        }
        validFiles.push(file)
    })
    return { valid: validFiles, errors: fileErrors }
}

const uploadFiles = async (files: File[]) => {
    errors.value = []
    const { valid: validFiles, errors: validationErrors } = validateFiles(files)
    if (validationErrors.length > 0) {
        errors.value = validationErrors
    }
    if (validFiles.length === 0) return

    uploading.value = true
    uploadProgress.value = 0

    try {
        const uploadPromises = validFiles.map(async (file, index) => {
            // Stap 1: Vraag een presigned URL aan bij de Cloudflare Worker
            const response = await fetch(`${workerUrl}/api/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    contentType: file.type,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get an upload URL (status: ${response.status}): ${errorText}`);
            }

            const responseData = await response.json();
            console.log('Full worker response:', responseData);

            // Extract data from the nested response structure
            const { uploadUrl, publicUrl } = responseData.data || {};

            if (!uploadUrl || !publicUrl) {
                throw new Error('Invalid response from worker: missing uploadUrl or publicUrl');
            }

            // Stap 2: Upload het bestand naar de ontvangen presigned URL
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });

            uploadProgress.value = Math.round(((index + 1) / validFiles.length) * 100)

            console.log('About to create URL from publicUrl:', publicUrl);

            // Stap 3: Geef de permanente, publieke URL terug
            return {
                url: publicUrl,
                path: new URL(publicUrl).pathname.substring(1),
                name: file.name
            };
        });

        const uploadedImages = await Promise.all(uploadPromises);
        images.value.push(...uploadedImages);

    } catch (error) {
        console.error('Upload error:', error)
        errors.value.push('Upload failed. Please try again.')
    } finally {
        uploading.value = false;
        if (fileInput.value) fileInput.value.value = '';
    }
}

const removeImage = async (index: number) => {
    images.value.splice(index, 1);
}

const setPrimaryImage = (index: number) => {
    if (index > 0) {
        const [primaryImage] = images.value.splice(index, 1)
        if (primaryImage) {
            images.value.unshift(primaryImage)
        }
    }
}

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (target.files) {
        uploadFiles(Array.from(target.files));
    }
};

const handleDrop = (event: DragEvent) => {
    isDragOver.value = false;
    if (event.dataTransfer?.files) {
        uploadFiles(Array.from(event.dataTransfer.files));
    }
};
</script>
