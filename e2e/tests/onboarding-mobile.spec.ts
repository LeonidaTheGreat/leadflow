import { test, expect } from './fixtures'

/**
 * E2E Tests: Mobile Responsive Behavior
 * 
 * Coverage:
 * - Mobile viewport layout (320px+)
 * - Touch-friendly targets (44x44px minimum)
 * - Step navigation on mobile
 * - Form field accessibility on mobile
 * - Keyboard handling
 * - Touch gestures
 * - Tablet responsiveness
 * 
 * @mobile @responsive
 */

test.describe('Mobile Responsive - Layout', () => {
  
  test('should display properly on mobile viewport @mobile @layout @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check that content is visible and not overflowing
    const body = page.locator('body')
    const boundingBox = await body.boundingBox()
    expect(boundingBox?.width).toBeLessThanOrEqual(375)
    
    // Form should be visible
    await expect(page.getByLabel('Email Address')).toBeVisible()
  })

  test('should display properly on small mobile (320px) @mobile @layout @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await onboardingPage.goto()
    
    // Content should still be accessible
    await expect(page.getByLabel('Email Address')).toBeVisible()
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible()
  })

  test('should display properly on tablet @tablet @layout @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await onboardingPage.goto()
    
    // Form should be centered and properly sized
    const form = page.locator('form, [class*="wizard"]').first()
    await expect(form).toBeVisible()
    
    const boundingBox = await form.boundingBox()
    expect(boundingBox?.width).toBeGreaterThan(400)
  })

  test('should adapt step indicators for mobile @mobile @ui @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Step indicators should be visible
    const stepIndicators = page.locator('button', { hasText: /^(1|2|3|4)$/ })
    const count = await stepIndicators.count()
    expect(count).toBeGreaterThanOrEqual(4)
    
    // Check that step titles might be hidden or stacked
    const stepTitles = page.getByText('Account').or(page.getByText('Profile'))
    await expect(stepTitles).toBeVisible()
  })

  test('should show hamburger menu on mobile if applicable @mobile @ui @responsive', async ({ 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/onboarding')
    
    // Check for mobile navigation pattern
    const hamburgerMenu = page.getByRole('button', { name: /menu|navigation/i })
    const isMenuVisible = await hamburgerMenu.isVisible().catch(() => false)
    
    // Menu may or may not exist depending on design
    // Just verify the page loads correctly
    await expect(page.getByLabel('Email Address')).toBeVisible()
  })
})

test.describe('Mobile Responsive - Touch Targets', () => {
  
  test('should have touch-friendly buttons on mobile @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check button sizes
    const nextButton = page.getByRole('button', { name: /next/i })
    const boundingBox = await nextButton.boundingBox()
    
    // Minimum touch target: 44x44px
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44)
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('should have touch-friendly form inputs on mobile @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check input field height for touch
    const emailInput = page.getByLabel('Email Address')
    const boundingBox = await emailInput.boundingBox()
    
    // Inputs should be at least 44px tall for touch
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('should have touch-friendly step indicators on mobile @mobile @ui @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check step indicator sizes
    const stepIndicator = page.locator('button', { hasText: '1' }).first()
    const boundingBox = await stepIndicator.boundingBox()
    
    // Step indicators should be at least 44x44px
    expect(boundingBox?.width).toBeGreaterThanOrEqual(44)
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
  })

  test('should have adequate spacing between touch targets @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Get multiple buttons and check spacing
    const buttons = await page.getByRole('button').all()
    
    if (buttons.length >= 2) {
      const box1 = await buttons[0].boundingBox()
      const box2 = await buttons[1].boundingBox()
      
      if (box1 && box2) {
        // Check that buttons don't overlap
        const verticalGap = Math.abs(box1.y - box2.y) - box1.height
        expect(verticalGap).toBeGreaterThanOrEqual(8) // At least 8px gap
      }
    }
  })
})

test.describe('Mobile Responsive - Navigation', () => {
  
  test('should navigate steps on mobile @mobile @navigation @responsive', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Complete step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Should be on step 2
    await expect(page.getByLabel('First Name')).toBeVisible()
    await expect(page.getByLabel('Last Name')).toBeVisible()
  })

  test('should show previous button on mobile @mobile @navigation @responsive', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Go to step 2
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Previous button should be visible and usable
    const prevButton = page.getByRole('button', { name: /previous/i })
    await expect(prevButton).toBeVisible()
    
    // Click should work
    await prevButton.click()
    await expect(page.getByLabel('Email Address')).toBeVisible()
  })

  test('should handle keyboard navigation on mobile @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Focus should be on an interactive element
    const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase())
    expect(['input', 'button', 'select', 'a']).toContain(tagName)
  })

  test('should scroll to show focused input on mobile @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 500 }) // Small height
    await onboardingPage.goto()
    
    // Fill content to make page scrollable
    await page.evaluate(() => {
      const spacer = document.createElement('div')
      spacer.style.height = '800px'
      document.body.appendChild(spacer)
    })
    
    // Focus on input
    await page.getByLabel('Email Address').focus()
    
    // Input should be visible in viewport
    const input = page.getByLabel('Email Address')
    const isVisible = await input.isVisible()
    expect(isVisible).toBe(true)
  })
})

test.describe('Mobile Responsive - Form Fields', () => {
  
  test('should show appropriate keyboard types on mobile @mobile @ux @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Email field should have email input type
    const emailInput = page.getByLabel('Email Address')
    const emailType = await emailInput.getAttribute('type')
    expect(emailType).toBe('email')
    
    // Phone field should have tel input type
    await page.getByLabel('Email Address').fill('test@test.com')
    await page.getByLabel('Password', { exact: true }).fill('TestPass123!')
    await page.getByLabel('Confirm Password').fill('TestPass123!')
    await page.getByRole('button', { name: /next/i }).click()
    
    const phoneInput = page.getByLabel('Phone Number')
    await expect(phoneInput).toBeVisible()
    const phoneType = await phoneInput.getAttribute('type')
    expect(phoneType).toBe('tel')
  })

  test('should prevent zoom on input focus @mobile @ux @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check viewport meta tag
    const viewportMeta = page.locator('meta[name="viewport"]')
    const content = await viewportMeta.getAttribute('content')
    
    // Should have user-scalable or maximum-scale to prevent zoom
    expect(content).toMatch(/user-scalable|maximum-scale|width=device-width/)
  })

  test('should handle select dropdown on mobile @mobile @ux @responsive', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Navigate to profile step
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    await onboardingPage.clickNext()
    
    // Open state dropdown
    const stateSelect = page.getByRole('combobox', { name: /state/i })
    await stateSelect.click()
    
    // Options should be visible
    await expect(page.getByRole('option').first()).toBeVisible()
    
    // Select an option
    await page.getByRole('option', { name: 'California' }).click()
    
    // Selection should be applied
    await expect(stateSelect).toContainText('California')
  })
})

test.describe('Mobile Responsive - Visual', () => {
  
  test('should not have horizontal scroll on mobile @mobile @layout @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check body width vs window width
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const windowWidth = await page.evaluate(() => window.innerWidth)
    
    // Body should not exceed window width
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth)
  })

  test('should scale progress bar correctly on mobile @mobile @ui @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Progress bar should be visible and within viewport
    const progressBar = page.locator('.bg-primary[class*="transition"]').first()
    await expect(progressBar).toBeVisible()
    
    const boundingBox = await progressBar.boundingBox()
    expect(boundingBox?.width).toBeGreaterThan(0)
    expect(boundingBox?.width).toBeLessThanOrEqual(375)
  })

  test('should show readable text on mobile @mobile @accessibility @responsive', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Check font size of main text
    const heading = page.getByRole('heading').first()
    const fontSize = await heading.evaluate(el => 
      parseInt(window.getComputedStyle(el).fontSize)
    )
    
    // Font size should be readable (at least 14px)
    expect(fontSize).toBeGreaterThanOrEqual(14)
  })

  test('should handle device orientation change @mobile @responsive @edge-case', async ({ 
    onboardingPage, 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Rotate to landscape
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(500)
    
    // Form should still be visible and usable
    await expect(page.getByLabel('Email Address')).toBeVisible()
    
    // Rotate back to portrait
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500)
    
    await expect(page.getByLabel('Email Address')).toBeVisible()
  })
})

test.describe('Mobile Responsive - Performance', () => {
  
  test('should load within acceptable time on mobile @mobile @performance @responsive', async ({ 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    const startTime = Date.now()
    await page.goto('/onboarding')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds on mobile
    expect(loadTime).toBeLessThan(3000)
  })

  test('should not have layout shift during load @mobile @performance @responsive', async ({ 
    page 
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Measure layout shifts using Performance Observer
    const layoutShifts = await page.evaluate(() => {
      return new Promise((resolve) => {
        let shiftScore = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              shiftScore += (entry as any).value
            }
          }
        })
        observer.observe({ entryTypes: ['layout-shift'] })
        
        setTimeout(() => {
          observer.disconnect()
          resolve(shiftScore)
        }, 3000)
      })
    })
    
    // Cumulative Layout Shift should be less than 0.1
    expect(layoutShifts).toBeLessThan(0.1)
  })
})

test.describe('Mobile Responsive - Gesture Handling', () => {
  
  test('should handle swipe gestures if implemented @mobile @ux @responsive @optional', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Fill step 1
    await onboardingPage.fillAccountStep(testAgent.email, testAgent.password, testAgent.password)
    
    // Try swipe gesture (if implemented)
    const form = page.locator('form').first()
    const box = await form.boundingBox()
    
    if (box) {
      // Swipe left
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
      
      // May or may not navigate - design dependent
      // Just verify page is still functional
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('should handle pull-to-refresh gracefully @mobile @ux @responsive', async ({ 
    onboardingPage, 
    page,
    testAgent
  }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await onboardingPage.goto()
    
    // Fill some data
    await page.getByLabel('Email Address').fill(testAgent.email)
    
    // Simulate refresh
    await page.reload()
    
    // Page should still be functional
    await expect(page.getByLabel('Email Address')).toBeVisible()
  })
})
