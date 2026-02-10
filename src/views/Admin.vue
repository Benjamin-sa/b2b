<template>
  <div class="min-h-screen">
    <!-- Mobile Tab Selector (dropdown on small screens) -->
    <div class="sm:hidden mb-4">
      <label for="admin-tab-select" class="sr-only">Select admin section</label>
      <select id="admin-tab-select" v-model="activeTab"
        class="block w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm font-medium text-gray-700 shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500 appearance-none"
        :style="{ backgroundImage: `url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 20 20&quot; fill=&quot;%236b7280&quot;><path fill-rule=&quot;evenodd&quot; d=&quot;M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z&quot; clip-rule=&quot;evenodd&quot;/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem', paddingRight: '2.5rem' }">
        <option v-for="tab in tabs" :key="tab.key" :value="tab.key">
          {{ tab.label }}
        </option>
      </select>
    </div>

    <!-- Desktop Tabs -->
    <div class="hidden sm:block mb-6">
      <nav class="flex gap-1 bg-gray-100 rounded-lg p-1" aria-label="Admin tabs">
        <button v-for="tab in tabs" :key="tab.key" :class="[
          activeTab === tab.key
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
        ]" @click="activeTab = tab.key">
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
          <span v-if="tab.badge"
            class="ml-1 inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            {{ tab.badge }}
          </span>
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div>
      <KeepAlive>
        <component :is="activeComponent" />
      </KeepAlive>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, type FunctionalComponent } from 'vue';
import { useAuthStore } from '../stores/auth';
import ProductsManagement from '../components/admin/management/ProductsManagement.vue';
import CategoriesManagement from '../components/admin/management/CategoriesManagement.vue';
import UsersManagement from '../components/admin/management/UsersManagement.vue';
import OrdersManagement from '../components/admin/management/OrdersManagement.vue';
import StockManagement from '../components/admin/management/StockManagement.vue';

const authStore = useAuthStore();
const activeTab = ref('orders');

// SVG icon components
const IconPackage: FunctionalComponent = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' }),
    h('polyline', { points: '3.27 6.96 12 12.01 20.73 6.96' }),
    h('line', { x1: '12', y1: '22.08', x2: '12', y2: '12' }),
  ]);

const IconGrid: FunctionalComponent = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('rect', { x: '3', y: '3', width: '7', height: '7' }),
    h('rect', { x: '14', y: '3', width: '7', height: '7' }),
    h('rect', { x: '14', y: '14', width: '7', height: '7' }),
    h('rect', { x: '3', y: '14', width: '7', height: '7' }),
  ]);

const IconUsers: FunctionalComponent = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' }),
    h('circle', { cx: '9', cy: '7', r: '4' }),
    h('path', { d: 'M23 21v-2a4 4 0 00-3-3.87' }),
    h('path', { d: 'M16 3.13a4 4 0 010 7.75' }),
  ]);

const IconBarChart: FunctionalComponent = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('line', { x1: '12', y1: '20', x2: '12', y2: '10' }),
    h('line', { x1: '18', y1: '20', x2: '18', y2: '4' }),
    h('line', { x1: '6', y1: '20', x2: '6', y2: '16' }),
  ]);

const IconClipboard: FunctionalComponent = () =>
  h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
    h('path', { d: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2' }),
    h('rect', { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' }),
  ]);

const tabs = [
  { key: 'orders', label: 'Orders', icon: IconClipboard, badge: null },
  { key: 'products', label: 'Products', icon: IconPackage, badge: null },
  { key: 'categories', label: 'Categories', icon: IconGrid, badge: null },
  { key: 'stock', label: 'Stock', icon: IconBarChart, badge: null },
  { key: 'users', label: 'Users', icon: IconUsers, badge: null },
];

const componentMap: Record<string, any> = {
  orders: OrdersManagement,
  products: ProductsManagement,
  categories: CategoriesManagement,
  stock: StockManagement,
  users: UsersManagement,
};

const activeComponent = computed(() => componentMap[activeTab.value] || OrdersManagement);

onMounted(() => {
  if (!authStore.isAdmin) {
    window.location.href = '/';
  }
});
</script>
