<template>
    <div @click="$emit('click', category)"
        class="bg-white rounded-lg sm:rounded-xl border-2 border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group transform hover:scale-105 hover:border-primary-300">

        <!-- Category Image -->
        <div class="aspect-w-16 aspect-h-9 bg-gray-100">
            <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.name"
                class="w-full h-36 sm:h-40 lg:h-48 object-cover group-hover:scale-110 transition-transform duration-300" />
            <div v-else class="w-full h-36 sm:h-40 lg:h-48 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100"
                :style="{ backgroundColor: category.color + '20' }">
                <div class="text-center">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto rounded-full flex items-center justify-center mb-2 shadow-lg"
                        :style="{ backgroundColor: category.color || '#466478' }">
                        <svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Category Info -->
        <div class="p-3 sm:p-4">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-base sm:text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {{ category.name }}
                </h3>
                <div v-if="category.color" class="w-3 h-3 rounded-full shadow-sm" :style="{ backgroundColor: category.color }">
                </div>
            </div>

            <p v-if="category.description" class="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">
                {{ category.description }}
            </p>

            <!-- Subcategories -->
            <div v-if="subcategories.length > 0" class="mb-3">
                <p class="text-xs font-medium text-gray-500 mb-1.5 sm:mb-2">{{ $t('categoryCard.subcategories') }}</p>
                <div class="flex flex-wrap gap-1 sm:gap-1.5">
                    <span v-for="subcat in subcategories.slice(0, 3)" :key="subcat.id"
                        class="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                        {{ subcat.name }}
                    </span>
                    <span v-if="subcategories.length > 3"
                        class="inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {{ $t('categoryCard.more', { count: subcategories.length - 3 }) }}
                    </span>
                </div>
            </div>

            <!-- Browse Button -->
            <div class="flex items-center justify-between text-sm">
                <div class="flex items-center text-primary-600 group-hover:text-primary-700 font-medium">
                    <span class="text-xs sm:text-sm mr-1">{{ $t('categoryCard.browse') }}</span>
                    <svg class="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform" fill="none"
                        stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Category } from '../types/category'

interface Props {
    category: Category
    subcategories: Category[]
}

defineProps<Props>()
defineEmits<{
    click: [category: Category]
}>()
</script>

<style scoped>
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
