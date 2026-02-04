<template>
  <div class="bg-white shadow-sm border-b-2 border-primary-100 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-3 sm:py-4">
        <!-- Loading state -->
        <div v-if="categoryStore.isLoading && !categoryStore.hasCategories" class="flex justify-center">
          <div class="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary-600"></div>
        </div>

        <!-- Category navigation -->
        <div v-else class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
          <!-- All Categories -->
          <button :class="[
            'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-sm',
            !selectedCategory
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow',
          ]" @click="selectCategory(null)">
            {{ $t('categorySelector.allCategories') }}
          </button>

          <!-- Root Categories -->
          <template v-for="category in categoryStore.rootCategories" :key="category.id">
            <button :class="[
              'px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shadow-sm',
              selectedCategory?.id === category.id
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow',
            ]" @click="selectCategory(category)">

            </button>

            <!-- Subcategories (if parent is selected) -->
            <template v-if="selectedCategory?.id === category.id">
              <span class="text-primary-400 text-xs sm:text-sm">→</span>
              <div class="flex gap-1 sm:gap-1.5">
                <button v-for="child in getChildCategories(category.id)" :key="child.id" :class="[
                  'px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-sm',
                  selectedCategory?.id === child.id
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md'
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200',
                ]" @click="selectCategory(child)">
                  {{ child.name }}
                </button>
              </div>
            </template>
          </template>
        </div>

        <!-- Breadcrumb (if subcategory is selected) -->
        <div v-if="breadcrumb.length > 1"
          class="mt-2 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 overflow-x-auto scrollbar-hide">
          <template v-for="(item, index) in breadcrumb" :key="index">
            <button v-if="index < breadcrumb.length - 1"
              class="hover:text-primary-600 transition-colors whitespace-nowrap font-medium"
              @click="selectCategory(item.category)">
              {{ item.name }}
            </button>
            <span v-else class="text-primary-700 font-bold whitespace-nowrap">{{ item.name }}</span>
            <svg v-if="index < breadcrumb.length - 1" class="w-3 h-3 sm:w-4 sm:h-4 text-primary-400 flex-shrink-0"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </template>
        </div>

        <!-- Category description -->
        <div v-if="selectedCategory?.description" class="mt-2">
          <p class="text-xs sm:text-sm text-gray-600 bg-primary-50 px-3 py-2 rounded-lg border border-primary-100">
            {{ selectedCategory.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useCategoryStore } from '../stores/categories';
import type { Category } from '../types/category';

interface Props {
  modelValue?: Category | null;
}

interface Emits {
  (e: 'update:modelValue', category: Category | null): void;
  (e: 'change', category: Category | null): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const categoryStore = useCategoryStore();

// Local state
const selectedCategory = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value ?? null),
});

// Computed
const getChildCategories = (parentId: string) => {
  return categoryStore.categories
    .filter((cat) => cat.parent_id === parentId && cat.is_active)
};

const breadcrumb = computed(() => {
  if (!selectedCategory.value) return [];

  const crumbs: { name: string; category: Category | null }[] = [];
  let current: Category | null = selectedCategory.value;

  // Build breadcrumb from child to parent
  while (current) {
    crumbs.unshift({ name: current.name, category: current });

    if (current.parent_id) {
      current = categoryStore.categories.find((cat) => cat.id === current?.parent_id) || null;
    } else {
      current = null;
    }
  }

  return crumbs;
});

// Methods
const selectCategory = (category: Category | null) => {
  selectedCategory.value = category;
  emit('change', category);
};

// Load categories on mount
onMounted(async () => {
  if (!categoryStore.hasCategories) {
    await categoryStore.fetchCategories();
  }
});

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== selectedCategory.value) {
      selectedCategory.value = newValue;
    }
  }
);
</script>

<style scoped>
/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
