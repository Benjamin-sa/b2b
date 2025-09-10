<template>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Specifications
        </h3>

        <div v-if="specifications && specifications.length > 0" class="space-y-0">
            <div v-for="(spec, index) in specifications" :key="index"
                class="grid grid-cols-2 gap-4 py-3 border-b border-gray-100 last:border-b-0">
                <span class="text-sm font-medium text-gray-600">{{ spec.key }}</span>
                <span class="text-sm text-gray-900">{{ spec.value }}</span>
            </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm">No specifications available</p>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Specification {
    key: string
    value: string
}

interface Props {
    specifications?: Specification[]
}
withDefaults(defineProps<Props>(), {
    specifications: () => []
})
</script>
