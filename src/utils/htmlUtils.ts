/**
 * HTML utility functions for handling rich text content
 */

/**
 * Truncates HTML content while preserving HTML tags
 * @param html - The HTML string to truncate
 * @param maxLength - Maximum length of the text content (excluding HTML tags)
 * @returns Truncated HTML string with ellipsis if truncated
 */
export const truncateHtml = (html: string, maxLength: number = 150): string => {
  if (!html) return ''
  
  // Create a temporary div to parse HTML and get text content
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  const textContent = tempDiv.textContent || tempDiv.innerText || ''
  
  // If text content is within limit, return original HTML
  if (textContent.length <= maxLength) {
    return html
  }
  
  // If we need to truncate, we'll do it by walking through the DOM
  let currentLength = 0
  let result = ''
  
  const walkNodes = (node: Node): boolean => {
    if (currentLength >= maxLength) return false
    
    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node as Text
      const text = textNode.textContent || ''
      const remainingLength = maxLength - currentLength
      
      if (text.length <= remainingLength) {
        result += text
        currentLength += text.length
      } else {
        // Truncate at word boundary if possible
        const truncated = text.substring(0, remainingLength)
        const lastSpace = truncated.lastIndexOf(' ')
        const finalText = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated
        result += finalText + '...'
        currentLength = maxLength
        return false
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()
      
      // Open tag
      result += `<${tagName}`
      
      // Add attributes if any
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i]
        if (attr && attr.name && attr.value) {
          result += ` ${attr.name}="${attr.value}"`
        }
      }
      result += '>'
      
      // Process children
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i]
        if (childNode && !walkNodes(childNode)) {
          break
        }
      }
      
      // Close tag
      result += `</${tagName}>`
    }
    
    return currentLength < maxLength
  }
  
  // Walk through all child nodes
  for (let i = 0; i < tempDiv.childNodes.length; i++) {
    const childNode = tempDiv.childNodes[i]
    if (childNode && !walkNodes(childNode)) {
      break
    }
  }
  
  return result || textContent.substring(0, maxLength) + '...'
}

/**
 * Strips HTML tags from a string and returns plain text
 * @param html - The HTML string to strip
 * @returns Plain text content
 */
export const stripHtml = (html: string): string => {
  if (!html) return ''
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  return tempDiv.textContent || tempDiv.innerText || ''
}

/**
 * Sanitizes HTML content by removing potentially dangerous elements
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return ''
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Remove script tags and other potentially dangerous elements
  const dangerousElements = tempDiv.querySelectorAll('script, iframe, object, embed, form, input, textarea, button')
  dangerousElements.forEach(el => el.remove())
  
  // Remove dangerous attributes
  const allElements = tempDiv.querySelectorAll('*')
  allElements.forEach(el => {
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur']
    dangerousAttrs.forEach(attr => {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr)
      }
    })
    
    // Remove javascript: URLs
    const href = el.getAttribute('href')
    if (href && href.toLowerCase().includes('javascript:')) {
      el.removeAttribute('href')
    }
  })
  
  return tempDiv.innerHTML
}

/**
 * CSS class names for consistent HTML content styling across components
 */
export const htmlContentClasses = 'prose prose-sm max-w-none prose-p:my-2 prose-strong:font-semibold prose-em:italic prose-u:underline prose-ul:my-2 prose-ul:pl-6 prose-li:my-1'
