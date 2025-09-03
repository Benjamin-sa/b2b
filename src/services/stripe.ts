import { getFunctions, httpsCallable } from 'firebase/functions'
import { firebaseApp } from '../init/firebase'

const functions = getFunctions(firebaseApp)

// Create checkout session for cart payments
export const createCheckoutSession = async (
  items: Array<{ stripePriceId: string; quantity: number }>,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> => {
  const createSession = httpsCallable(functions, 'createCheckoutSession')
  const result = await createSession({
    items,
    successUrl,
    cancelUrl
  })
  return result.data as { sessionId: string; url: string }
}

// Helper function to redirect to Stripe Checkout
export const redirectToCheckout = async (
  items: Array<{ stripePriceId: string; quantity: number }>
): Promise<void> => {
  const baseUrl = window.location.origin
  const successUrl = `${baseUrl}/checkout/success`
  const cancelUrl = `${baseUrl}/checkout/cancel`
  
  try {
    const { url } = await createCheckoutSession(items, successUrl, cancelUrl)
    if (url) {
      window.location.href = url
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error)
    throw error
  }
}
