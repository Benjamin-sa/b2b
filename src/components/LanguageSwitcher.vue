<template>
  <div ref="languageSwitcherRef" class="relative">
    <button class="flex items-center space-x-2 w-full" @click="toggleDropdown">
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span class="text-sm font-medium text-gray-700">{{
        currentLanguage?.name || 'Language'
        }}</span>
      <svg class="w-4 h-4 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" fill="none"
        stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="isOpen" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
        <button v-for="lang in languages" :key="lang.code" :class="[
          'block w-full text-left px-4 py-2 text-sm transition-colors',
          locale === lang.code
            ? 'bg-blue-50 text-blue-700 font-medium'
            : 'text-gray-700 hover:bg-gray-100',
        ]" @click="setLanguage(lang.code)">
          <div class="flex items-center justify-between">
            <span>{{ lang.name }}</span>
            <svg v-if="locale === lang.code" class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
          </div>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const isOpen = ref(false);
const languageSwitcherRef = ref<HTMLElement | null>(null);

const languages = [
  { code: 'nl', name: 'Nederlands' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
];

const currentLanguage = computed(() => {
  return languages.find((lang) => lang.code === locale.value) || languages[0];
});

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const setLanguage = (langCode: string) => {
  locale.value = langCode;
  localStorage.setItem('language', langCode);
  isOpen.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (languageSwitcherRef.value && !languageSwitcherRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Dropdown transition */
.dropdown-enter-active {
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.dropdown-leave-active {
  transition: all 0.15s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {

  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: opacity 0.2s ease !important;
  }

  .dropdown-enter-from,
  .dropdown-leave-to {
    transform: none !important;
  }
}
</style>
