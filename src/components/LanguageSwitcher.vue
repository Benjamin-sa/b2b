<template>
    <div class="relative">
        <button @click="isOpen = !isOpen" class="flex items-center space-x-2">
            <span class="text-sm font-medium text-gray-700">{{ currentLanguage.name }}</span>
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
        <div v-if="isOpen" class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
            <button v-for="lang in languages" :key="lang.code" @click="setLanguage(lang.code)"
                class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                {{ lang.name }}
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const isOpen = ref(false);

const languages = [
    { code: 'nl', name: 'Nederlands' },
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
];

const currentLanguage = computed(() => {
    return languages.find(lang => lang.code === locale.value) || languages[0];
});

const setLanguage = (langCode: string) => {
    locale.value = langCode;
    localStorage.setItem('language', langCode);
    isOpen.value = false;
};
</script>
