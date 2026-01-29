import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './auth';
import type { Order, OrderWithItems, OrderItem, ShippingAddress, CartItem } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8787';

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useOrderStore = defineStore('orders', () => {
  const orders = ref<OrderWithItems[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch user's invoices from Cloudflare API Gateway
   *
   * Queries D1 database for invoices synced via Stripe webhooks.
   */
  const fetchOrders = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;

    try {
      const authStore = useAuthStore();

      if (!authStore.isAuthenticated) {
        throw new Error('User must be authenticated to fetch orders');
      }

      const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}/api/invoices`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch invoices');
      }

      const data = await response.json();

      // Map the new D1 invoice structure with line items to our Order type
      orders.value = (data.invoices || []).map((invoice: any) => {
        // Map line items with historical pricing/product details
        const items: OrderItem[] = (invoice.items || []).map((item: any) => ({
          id: item.id,
          stripe_line_item_id: item.stripe_line_item_id,
          product_id: item.product_id || '',
          product_name: item.product_name,
          product_sku: item.product_sku,
          brand: item.brand,
          quantity: item.quantity,
          unit_price: item.unit_price, // Already in euros from API
          total_price: item.total_price, // Already in euros from API
          tax_cents: item.tax, // Already in euros from API
          image_url: item.image_url,
          currency: item.currency || 'eur',
          metadata: item.metadata || {},
        }));

        // Calculate totals from line items if available
        const subtotal = items.reduce((sum: number, item: OrderItem) => sum + item.total_price, 0);
        const totalTax = items.reduce(
          (sum: number, item: OrderItem) => sum + (item.tax_cents || 0),
          0
        );

        return {
          id: invoice.order_id || invoice.id,
          stripe_invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.order_status,
          stripe_status: invoice.status, // draft, open, paid, void
          total_amount: invoice.total_amount,
          subtotal: invoice.subtotal || subtotal,
          tax: invoice.tax || totalTax || 0,
          shipping: invoice.shipping || 0,
          currency: invoice.currency || 'EUR',
          invoice_url: invoice.invoice_url,
          invoice_pdf: invoice.invoice_pdf,
          due_date: invoice.due_date,
          paid_at: invoice.paid_at,
          order_date: invoice.created_at,
          updated_at: invoice.updated_at,
          items,
          shipping_address: invoice.shipping_address
            ? {
                street: invoice.shipping_address.street,
                city: invoice.shipping_address.city,
                zip_code: invoice.shipping_address.zip_code,
                country: invoice.shipping_address.country,
                company: invoice.shipping_address.company,
                contact_person: invoice.shipping_address.contact_person,
              }
            : null,
          notes: invoice.notes || null,
          user_id: '', // Not needed for display
          created_at: invoice.created_at,
        };
      });

      console.log(`📋 Fetched ${orders.value.length} invoices with line items from Cloudflare D1`);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      error.value = err.message || 'Failed to fetch orders';
      orders.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Refresh orders (alias for fetchOrders)
   */
  const refreshOrders = async (): Promise<void> => {
    await fetchOrders();
  };

  /**
   * Subscribe to orders (auto-fetch on mount)
   * In the new Cloudflare architecture, we just fetch once on mount.
   * Webhooks keep D1 in sync automatically.
   */
  const subscribeToOrders = async (): Promise<void> => {
    await fetchOrders();
  };

  /**
   * Stop orders subscription (no-op in Cloudflare architecture)
   * Previously used for Firebase realtime listeners
   */
  const stopOrdersSubscription = (): void => {
    // No-op: We don't have real-time subscriptions in the new architecture
    // Invoices are synced via webhooks to D1, and we fetch on demand
  };

  /**
   * Create an order/invoice via Cloudflare API Gateway
   *
   * This replaces the Firebase Functions createInvoice callable
   * and now calls the Cloudflare Workers API Gateway which orchestrates
   * the invoice creation through the Stripe service.
   */
  const createOrder = async (
    cartItems: CartItem[],
    shippingAddress: ShippingAddress,
    _subtotal: number, // Not used - Stripe calculates total from line items
    tax: number,
    shipping_cost: number,
    notes?: string,
    locale?: string // Invoice language (e.g., 'nl', 'fr', 'en', 'de')
  ): Promise<{ success: boolean; invoiceUrl?: string; orderId?: string; error?: string }> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Get auth store for user information and authentication token
      const authStore = useAuthStore();

      if (!authStore.isAuthenticated) {
        throw new Error('User must be authenticated to create an order');
      }

      // Check if all products have Stripe price IDs
      const missingPriceIds = cartItems.filter((item) => !item.product.stripe_price_id);
      if (missingPriceIds.length > 0) {
        throw new Error(
          'Some products are not properly configured for payment. Please contact support.'
        );
      }

      // Prepare items with individual metadata for each item
      // This matches the format expected by the API Gateway
      const itemsWithMetadata = cartItems.map((item) => ({
        stripe_price_id: item.product.stripe_price_id!,
        quantity: item.quantity,
        metadata: {
          product_id: item.product_id,
          product_name: item.product.name,
          shopify_variant_id: item.product.inventory?.shopify_variant_id || '',
        },
      }));

      // Prepare general order metadata for the invoice level
      const generalMetadata = {
        notes: notes || '',
        shipping_address: shippingAddress,
        billing_address: shippingAddress, // Use same address for billing
        user_info: authStore.userProfile
          ? {
              company_name: authStore.userProfile.company_name,
              contact_person: `${authStore.userProfile.first_name} ${authStore.userProfile.last_name}`,
              email: authStore.userProfile.email,
              btw_number: authStore.userProfile.btw_number,
            }
          : {},
      };

      // Convert amounts to cents (Stripe expects amounts in cents)
      const shipping_cost_cents = Math.round(shipping_cost * 100);
      const tax_amount_cents = Math.round(tax * 100);

      // Use provided locale or fall back to localStorage
      const invoiceLocale = locale || localStorage.getItem('language') || 'nl';
      console.log(`📍 Creating invoice with locale: ${invoiceLocale}`);

      // Call Cloudflare API Gateway to create invoice
      const response = await authStore.authenticatedFetch(`${API_GATEWAY_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsWithMetadata,
          shipping_cost: shipping_cost_cents,
          tax_amount: tax_amount_cents,
          metadata: generalMetadata,
          locale: invoiceLocale, // User's selected language for invoice localization
        }),
      });

      // Handle response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error types from the API Gateway
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 400) {
          throw new Error(
            errorData.message || 'Invalid order data. Please check your cart and try again.'
          );
        } else if (errorData.error === 'failed-precondition') {
          throw new Error(
            errorData.message || 'Please complete your profile before placing an order.'
          );
        } else {
          throw new Error(errorData.message || 'Failed to create invoice. Please try again.');
        }
      }

      const invoiceData = await response.json();

      console.log('✅ Invoice created successfully:', invoiceData.invoice_id);

      return {
        success: true,
        invoiceUrl: invoiceData.invoice_url,
        orderId: invoiceData.invoice_id,
      };
    } catch (err: any) {
      console.error('Error creating order:', err);
      error.value = err.message || 'Failed to create order';

      return {
        success: false,
        error: error.value || undefined,
      };
    } finally {
      isLoading.value = false;
    }
  };

  const getOrderById = (orderId: string): Order | undefined => {
    return orders.value.find((order) => order.id === orderId);
  };

  // Invoice-specific getters (using the same cached data)
  const getInvoiceById = (invoiceId: string): Order | undefined => {
    return orders.value.find(
      (order) =>
        order.id === invoiceId ||
        order.stripe_invoice_id === invoiceId ||
        order.invoice_number === invoiceId
    );
  };

  const getPaidInvoices = (): Order[] => {
    return orders.value.filter((order) => order.status === 'confirmed' || order.paid_at);
  };

  const getPendingInvoices = (): Order[] => {
    return orders.value.filter((order) => order.status === 'pending' && !order.paid_at);
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // Data
    orders,
    isLoading,
    error,

    // Fetch operations
    fetchOrders,
    refreshOrders,
    subscribeToOrders,
    stopOrdersSubscription,

    // Order operations
    createOrder,
    getOrderById,

    // Invoice operations (same data, different views)
    getInvoiceById,
    getPaidInvoices,
    getPendingInvoices,

    // Utility
    clearError,
  };
});
