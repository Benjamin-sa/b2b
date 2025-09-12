<template>
    <div class="space-y-4">
        <!-- Main Image Display -->
        <div class="relative aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-lg">
            <img v-if="currentImage" :src="currentImage" :alt="alt || $t('imageGallery.productImage')"
                class="w-full h-full object-cover" @error="handleImageError" />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-200">
                <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>

            <!-- Zoom Icon -->
            <button v-if="currentImage && allowZoom" @click="openLightbox"
                class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>

            <!-- Navigation Arrows (if multiple images) -->
            <template v-if="images.length > 1">
                <button @click="previousImage"
                    class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button @click="nextImage"
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </template>

            <!-- Image Indicator -->
            <div v-if="images.length > 1"
                class="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {{ currentImageIndex + 1 }} / {{ images.length }}
            </div>
        </div>

        <!-- Thumbnail Grid -->
        <div v-if="images.length > 1 && showThumbnails" class="grid grid-cols-4 md:grid-cols-6 gap-2">
            <button v-for="(image, index) in images" :key="index" @click="setCurrentImage(index)"
                class="aspect-square rounded-lg overflow-hidden border-2 transition-all" :class="[
                    index === currentImageIndex
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                ]">
                <img :src="image" :alt="$t('imageGallery.thumbnail', { index: index + 1 })" class="w-full h-full object-cover"
                    @error="handleImageError" />
            </button>
        </div>

        <!-- Lightbox Modal -->
        <Teleport to="body">
            <div v-if="showLightbox"
                class="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
                @click="closeLightbox">
                <div class="relative max-w-7xl max-h-full">
                    <img v-if="currentImage" :src="currentImage" :alt="alt || $t('imageGallery.productImage')"
                        class="max-w-full max-h-full object-contain" @click.stop />

                    <!-- Close Button -->
                    <button @click="closeLightbox"
                        class="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <!-- Navigation in Lightbox -->
                    <template v-if="images.length > 1">
                        <button @click.stop="previousImage"
                            class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button @click.stop="nextImage"
                            class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </template>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
    images: string[]
    alt?: string
    showThumbnails?: boolean
    allowZoom?: boolean
    initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
    images: () => [],
    alt: '',
    showThumbnails: true,
    allowZoom: true,
    initialIndex: 0
})

const currentImageIndex = ref(props.initialIndex)
const showLightbox = ref(false)

const currentImage = computed(() => {
    return props.images[currentImageIndex.value] || null
})

// Watch for changes in images array
watch(() => props.images, (newImages) => {
    if (newImages.length === 0) {
        currentImageIndex.value = 0
    } else if (currentImageIndex.value >= newImages.length) {
        currentImageIndex.value = newImages.length - 1
    }
}, { immediate: true })

// Watch for changes in initialIndex
watch(() => props.initialIndex, (newIndex) => {
    if (newIndex >= 0 && newIndex < props.images.length) {
        currentImageIndex.value = newIndex
    }
})

const setCurrentImage = (index: number) => {
    if (index >= 0 && index < props.images.length) {
        currentImageIndex.value = index
    }
}

const nextImage = () => {
    if (props.images.length > 1) {
        currentImageIndex.value = (currentImageIndex.value + 1) % props.images.length
    }
}

const previousImage = () => {
    if (props.images.length > 1) {
        currentImageIndex.value = currentImageIndex.value === 0
            ? props.images.length - 1
            : currentImageIndex.value - 1
    }
}

const openLightbox = () => {
    showLightbox.value = true
    document.body.style.overflow = 'hidden'
}

const closeLightbox = () => {
    showLightbox.value = false
    document.body.style.overflow = ''
}

const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    target.style.display = 'none'
}

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
    if (!showLightbox.value) return

    switch (event.key) {
        case 'Escape':
            closeLightbox()
            break
        case 'ArrowLeft':
            previousImage()
            break
        case 'ArrowRight':
            nextImage()
            break
    }
}

// Add keyboard event listener when component mounts
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = '' // Clean up in case lightbox was open
})
</script>
