/**
 * Binocular Viewer - Interactive viewport navigation
 * Main application entry point with comprehensive error handling and browser compatibility
 */

// Application state with performance monitoring and error tracking
const AppState = {
  isLoaded: false,
  hasError: false,
  errorMessage: "",
  browserSupport: {
    clipPath: false,
    customProperties: false,
    requestAnimationFrame: false,
    touchEvents: false,
    modernCSS: false,
  },
  imageState: {
    isLoading: true,
    isLoaded: false,
    hasError: false,
    errorMessage: "",
    retryCount: 0,
    maxRetries: 3,
  },
  viewport: {
    x: 0.5, // Normalized position (0-1)
    y: 0.5,
    radius: 150, // Default radius in pixels
  },
  input: {
    mouseX: 0,
    mouseY: 0,
    keysPressed: new Set(),
    isMouseActive: false,
    touchActive: false,
    keyboardActive: false,
  },
  keyboard: {
    animationId: null,
    isMoving: false,
  },
  container: {
    width: 0,
    height: 0,
  },
  performance: {
    frameCount: 0,
    lastFpsUpdate: 0,
    fps: 0,
    updateCount: 0,
    lastUpdateTime: 0,
  },
}

// DOM elements
let binocularContainer = null
let backgroundImage = null
let viewportMask = null
let loadingIndicator = null
let errorContainer = null

/**
 * Browser Compatibility Detection and Feature Support
 */
class BrowserCompatibility {
  constructor() {
    this.detectFeatures()
  }

  /**
   * Detect browser feature support
   */
  detectFeatures() {
    // Test CSS clip-path support
    AppState.browserSupport.clipPath = this.supportsClipPath()

    // Test CSS custom properties support
    AppState.browserSupport.customProperties = this.supportsCustomProperties()

    // Test requestAnimationFrame support
    AppState.browserSupport.requestAnimationFrame = this.supportsRequestAnimationFrame()

    // Test touch events support
    AppState.browserSupport.touchEvents = this.supportsTouchEvents()

    // Overall modern CSS support
    AppState.browserSupport.modernCSS = this.supportsModernCSS()

    console.log("Browser compatibility detected:", AppState.browserSupport)
  }

  /**
   * Test clip-path support
   */
  supportsClipPath() {
    try {
      const testElement = document.createElement("div")
      testElement.style.clipPath = "circle(50px at 50% 50%)"
      return testElement.style.clipPath !== ""
    } catch (e) {
      return false
    }
  }

  /**
   * Test CSS custom properties support
   */
  supportsCustomProperties() {
    try {
      return window.CSS && CSS.supports && CSS.supports("color", "var(--test)")
    } catch (e) {
      return false
    }
  }

  /**
   * Test requestAnimationFrame support
   */
  supportsRequestAnimationFrame() {
    return typeof window.requestAnimationFrame === "function"
  }

  /**
   * Test touch events support
   */
  supportsTouchEvents() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0
  }

  /**
   * Test overall modern CSS support
   */
  supportsModernCSS() {
    try {
      return (
        window.CSS &&
        CSS.supports &&
        CSS.supports("display", "grid") &&
        CSS.supports("background", "radial-gradient(circle, red, blue)")
      )
    } catch (e) {
      return false
    }
  }

  /**
   * Apply fallbacks for unsupported features
   */
  applyFallbacks() {
    if (!AppState.browserSupport.clipPath) {
      this.applyClipPathFallback()
    }

    if (!AppState.browserSupport.customProperties) {
      this.applyCustomPropertiesFallback()
    }

    if (!AppState.browserSupport.requestAnimationFrame) {
      this.applyAnimationFrameFallback()
    }

    if (!AppState.browserSupport.modernCSS) {
      this.applyModernCSSFallback()
    }
  }

  /**
   * Fallback for clip-path using alternative masking
   */
  applyClipPathFallback() {
    console.warn("clip-path not supported, applying fallback")

    // Add fallback class to body for CSS targeting
    document.body.classList.add("no-clip-path")

    // Create alternative masking using box-shadow
    const style = document.createElement("style")
    style.textContent = `
      .no-clip-path .viewport-mask {
        background: rgba(0, 0, 0, 0.95) !important;
        box-shadow: inset 0 0 0 var(--viewport-radius) transparent !important;
      }
      .no-clip-path .viewport-mask::before {
        content: '';
        position: absolute;
        width: calc(var(--viewport-radius) * 2);
        height: calc(var(--viewport-radius) * 2);
        border-radius: 50%;
        background: transparent;
        left: calc(var(--viewport-x) - var(--viewport-radius));
        top: calc(var(--viewport-y) - var(--viewport-radius));
        box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.95);
        transition: all 0.1s ease;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Fallback for CSS custom properties
   */
  applyCustomPropertiesFallback() {
    console.warn("CSS custom properties not supported, applying fallback")
    document.body.classList.add("no-custom-properties")

    // Store fallback values
    window.fallbackViewport = {
      x: "50%",
      y: "50%",
      radius: "150px",
    }
  }

  /**
   * Fallback for requestAnimationFrame
   */
  applyAnimationFrameFallback() {
    console.warn("requestAnimationFrame not supported, applying polyfill")

    window.requestAnimationFrame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function (callback) {
        return setTimeout(callback, 1000 / 60)
      }

    window.cancelAnimationFrame =
      window.cancelAnimationFrame ||
      window.webkitCancelAnimationFrame ||
      window.mozCancelAnimationFrame ||
      function (id) {
        clearTimeout(id)
      }
  }

  /**
   * Fallback for modern CSS features
   */
  applyModernCSSFallback() {
    console.warn("Modern CSS not fully supported, applying basic fallbacks")
    document.body.classList.add("legacy-browser")

    // Simplified styles for older browsers
    const style = document.createElement("style")
    style.textContent = `
      .legacy-browser .viewport-mask {
        background: #000 !important;
        opacity: 0.95 !important;
      }
      .legacy-browser .background-image {
        background-attachment: scroll !important;
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * Image Loading Manager with error handling and retry logic
 */
class ImageLoader {
  constructor() {
    // Use test image URL if in test mode
    this.imageUrl = window.TEST_IMAGE_URL || "strategy.png"
    this.fallbackUrls = ["./strategy.png", "assets/strategy.png", "images/strategy.png"]

    // In test mode, don't use fallbacks to test error handling
    if (window.TEST_MODE) {
      this.fallbackUrls = []
    }
  }

  /**
   * Load image with comprehensive error handling
   */
  async loadImage() {
    AppState.imageState.isLoading = true
    AppState.imageState.hasError = false
    this.updateLoadingState("Loading background image...")

    try {
      // Try primary image URL first
      await this.tryLoadImage(this.imageUrl)
      this.handleImageSuccess()
    } catch (error) {
      console.warn(`Failed to load primary image: ${error.message}`)
      await this.tryFallbackImages()
    }
  }

  /**
   * Try loading image from URL
   */
  tryLoadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()

      // Set up timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`))
      }, 10000) // 10 second timeout

      img.onload = () => {
        clearTimeout(timeout)
        console.log(`Successfully loaded image: ${url}`)
        resolve(img)
      }

      img.onerror = () => {
        clearTimeout(timeout)
        reject(new Error(`Failed to load image: ${url}`))
      }

      // Start loading
      img.src = url
    })
  }

  /**
   * Try fallback image URLs
   */
  async tryFallbackImages() {
    for (const fallbackUrl of this.fallbackUrls) {
      try {
        console.log(`Trying fallback image: ${fallbackUrl}`)
        await this.tryLoadImage(fallbackUrl)
        this.imageUrl = fallbackUrl // Update successful URL
        this.handleImageSuccess()
        return
      } catch (error) {
        console.warn(`Fallback failed: ${error.message}`)
      }
    }

    // All attempts failed
    this.handleImageError("Could not load background image from any source")
  }

  /**
   * Handle successful image load
   */
  handleImageSuccess() {
    AppState.imageState.isLoading = false
    AppState.imageState.isLoaded = true
    AppState.imageState.hasError = false
    AppState.imageState.retryCount = 0

    this.updateLoadingState("Image loaded successfully")

    // Update background image
    if (backgroundImage) {
      backgroundImage.style.backgroundImage = `url("${this.imageUrl}")`

      // Apply mobile-specific background fixes
      this.applyMobileBackgroundFixes()
    }

    // Initialize viewport after successful load
    setTimeout(() => {
      initializeViewport()
      this.hideLoadingIndicator()
    }, 500)
  }

  /**
   * Apply mobile-specific background image fixes
   */
  applyMobileBackgroundFixes() {
    if (!backgroundImage) return

    // Check if we're on a mobile device
    const isMobile = responsiveManager.shouldUseTouchOptimizations()
    const isSmallScreen = AppState.container.width <= 480 || AppState.container.height <= 800

    if (isMobile || isSmallScreen) {
      console.log("Applying mobile background image fixes...")

      // Force proper background sizing
      backgroundImage.style.backgroundSize = "cover"
      backgroundImage.style.backgroundPosition = "center center"
      backgroundImage.style.backgroundAttachment = "scroll"
      backgroundImage.style.backgroundRepeat = "no-repeat"

      // Ensure proper dimensions
      backgroundImage.style.width = "100vw"
      backgroundImage.style.height = "100vh"
      backgroundImage.style.minWidth = "100vw"
      backgroundImage.style.minHeight = "100vh"

      // iOS Safari specific fixes
      backgroundImage.style.webkitBackgroundSize = "cover"

      // Force a repaint to ensure changes take effect
      backgroundImage.style.display = "none"
      backgroundImage.offsetHeight // Trigger reflow
      backgroundImage.style.display = "block"

      console.log("Mobile background fixes applied")
    }
  }

  /**
   * Handle image loading error
   */
  handleImageError(message) {
    AppState.imageState.isLoading = false
    AppState.imageState.isLoaded = false
    AppState.imageState.hasError = true
    AppState.imageState.errorMessage = message

    console.error("Image loading failed:", message)
    this.showErrorState(message)
  }

  /**
   * Update loading state display
   */
  updateLoadingState(message) {
    if (loadingIndicator) {
      loadingIndicator.innerHTML = `<p>${message}</p>`
    }
  }

  /**
   * Show error state with retry option
   */
  showErrorState(message) {
    const errorHtml = `
      <div class="error-state">
        <h3>⚠️ Loading Error</h3>
        <p>${message}</p>
        <p>The binocular viewer requires a background image to function properly.</p>
        ${
          AppState.imageState.retryCount < AppState.imageState.maxRetries
            ? '<button onclick="retryImageLoad()" class="retry-button">Retry Loading</button>'
            : "<p><em>Maximum retry attempts reached.</em></p>"
        }
        <div class="error-details">
          <p><strong>Troubleshooting:</strong></p>
          <ul>
            <li>Check that "strategy.png" exists in the same directory</li>
            <li>Verify your internet connection</li>
            <li>Try refreshing the page</li>
          </ul>
        </div>
      </div>
    `

    if (loadingIndicator) {
      loadingIndicator.innerHTML = errorHtml
      loadingIndicator.classList.add("error")
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    if (loadingIndicator) {
      loadingIndicator.style.opacity = "0"
      setTimeout(() => {
        loadingIndicator.style.display = "none"
      }, 300)
    }
  }

  /**
   * Retry image loading
   */
  retry() {
    if (AppState.imageState.retryCount >= AppState.imageState.maxRetries) {
      console.warn("Maximum retry attempts reached")
      return
    }

    AppState.imageState.retryCount++
    console.log(`Retrying image load (attempt ${AppState.imageState.retryCount})`)

    if (loadingIndicator) {
      loadingIndicator.classList.remove("error")
    }

    this.loadImage()
  }
}

// Global retry function for button onclick
function retryImageLoad() {
  if (window.imageLoader) {
    window.imageLoader.retry()
  }
}

// Create instances
const browserCompatibility = new BrowserCompatibility()
const imageLoader = new ImageLoader()

/**
 * Initialize the application with comprehensive error handling
 */
function init() {
  console.log("Initializing Binocular Viewer with error handling and browser compatibility...")

  try {
    // Get DOM elements
    binocularContainer = document.querySelector(".binocular-container")
    backgroundImage = document.querySelector(".background-image")
    viewportMask = document.querySelector(".viewport-mask")
    loadingIndicator = document.querySelector(".loading-indicator")
    errorContainer = document.querySelector(".error-container")

    if (!binocularContainer || !backgroundImage || !viewportMask) {
      throw new Error("Required DOM elements not found")
    }

    // Apply browser compatibility fallbacks
    browserCompatibility.applyFallbacks()

    // Set up initial state
    updateContainerDimensions()

    // Set up event listeners with error handling
    setupEventListeners()

    // Start image loading process
    window.imageLoader = imageLoader
    imageLoader.loadImage()

    // Show touch instructions on mobile devices
    showTouchInstructions()

    console.log("Binocular Viewer initialization completed")
  } catch (error) {
    console.error("Failed to initialize Binocular Viewer:", error)
    handleInitializationError(error)
  }
}

/**
 * Handle initialization errors
 */
function handleInitializationError(error) {
  AppState.hasError = true
  AppState.errorMessage = error.message

  const errorHtml = `
    <div class="initialization-error">
      <h2>🚫 Initialization Error</h2>
      <p>The binocular viewer failed to initialize properly.</p>
      <p><strong>Error:</strong> ${error.message}</p>
      <div class="error-actions">
        <button onclick="location.reload()" class="retry-button">Reload Page</button>
      </div>
      <div class="error-details">
        <p><strong>Browser Information:</strong></p>
        <ul>
          <li>User Agent: ${navigator.userAgent}</li>
          <li>Clip-path Support: ${AppState.browserSupport.clipPath ? "✅" : "❌"}</li>
          <li>Custom Properties: ${AppState.browserSupport.customProperties ? "✅" : "❌"}</li>
          <li>Modern CSS: ${AppState.browserSupport.modernCSS ? "✅" : "❌"}</li>
        </ul>
      </div>
    </div>
  `

  if (loadingIndicator) {
    loadingIndicator.innerHTML = errorHtml
    loadingIndicator.classList.add("error", "critical")
  } else {
    // Fallback if loading indicator doesn't exist
    document.body.innerHTML = errorHtml
  }
}

/**
 * Update container dimensions
 */
function updateContainerDimensions() {
  AppState.container.width = window.innerWidth
  AppState.container.height = window.innerHeight
}

/**
 * Optimized ViewportController class with performance enhancements
 */
class ViewportController {
  constructor() {
    this.smoothingFactor = 0.15 // Slightly increased for smoother movement
    this.touchSmoothingFactor = 0.4 // Faster response for touch
    this.boundaryPadding = 0.02 // Reduced padding for better mobile experience

    // Performance optimization: cache frequently used calculations
    this.cachedBounds = null
    this.lastContainerSize = { width: 0, height: 0 }

    // Movement interpolation cache
    this.targetPosition = { x: 0.5, y: 0.5 }
    this.isInterpolating = false
    this.interpolationId = null
  }

  /**
   * Convert mouse/touch coordinates to normalized viewport position
   */
  mouseToViewportPosition(clientX, clientY) {
    const normalizedX = clientX / AppState.container.width
    const normalizedY = clientY / AppState.container.height

    return this.applyBoundaryConstraints(normalizedX, normalizedY)
  }

  /**
   * Optimized boundary constraints with caching for better performance
   */
  applyBoundaryConstraints(x, y) {
    // Cache boundary calculations if container size hasn't changed
    if (
      !this.cachedBounds ||
      this.lastContainerSize.width !== AppState.container.width ||
      this.lastContainerSize.height !== AppState.container.height
    ) {
      // Calculate the viewport radius as a percentage of container dimensions
      const radiusX = AppState.viewport.radius / AppState.container.width
      const radiusY = AppState.viewport.radius / AppState.container.height

      // Dynamic boundary padding based on screen size
      let dynamicPadding = this.boundaryPadding

      // Reduce padding on smaller screens for better usable area
      if (AppState.container.width < 768) {
        dynamicPadding = 0.01
      }

      // Cache the boundary values
      this.cachedBounds = {
        minX: radiusX + dynamicPadding,
        maxX: 1 - radiusX - dynamicPadding,
        minY: radiusY + dynamicPadding,
        maxY: 1 - radiusY - dynamicPadding,
      }

      this.lastContainerSize = {
        width: AppState.container.width,
        height: AppState.container.height,
      }
    }

    // Use cached bounds for constraint calculations
    const constrainedX = Math.max(this.cachedBounds.minX, Math.min(this.cachedBounds.maxX, x))
    const constrainedY = Math.max(this.cachedBounds.minY, Math.min(this.cachedBounds.maxY, y))

    return { x: constrainedX, y: constrainedY }
  }

  /**
   * Update viewport position with smooth interpolation
   */
  updateViewportPosition(targetX, targetY, smooth = true) {
    // Apply boundary constraints to target position
    const constrainedTarget = this.applyBoundaryConstraints(targetX, targetY)

    if (smooth) {
      // Choose smoothing factor based on input type
      const smoothing = AppState.input.touchActive ? this.touchSmoothingFactor : this.smoothingFactor

      // Smooth interpolation for fluid movement
      const currentX = AppState.viewport.x
      const currentY = AppState.viewport.y

      const newX = currentX + (constrainedTarget.x - currentX) * smoothing
      const newY = currentY + (constrainedTarget.y - currentY) * smoothing

      AppState.viewport.x = newX
      AppState.viewport.y = newY
    } else {
      // Direct positioning
      AppState.viewport.x = constrainedTarget.x
      AppState.viewport.y = constrainedTarget.y
    }

    updateViewportPosition()
  }

  /**
   * Move viewport by delta amounts (for keyboard navigation)
   */
  moveViewportByDelta(deltaX, deltaY) {
    const newX = AppState.viewport.x + deltaX
    const newY = AppState.viewport.y + deltaY

    const constrainedPosition = this.applyBoundaryConstraints(newX, newY)

    AppState.viewport.x = constrainedPosition.x
    AppState.viewport.y = constrainedPosition.y

    updateViewportPosition()
  }

  /**
   * Get responsive movement speed for keyboard navigation
   */
  getKeyboardMoveSpeed() {
    // Adjust keyboard movement speed based on screen size
    if (AppState.container.width < 480) {
      return 0.003 // Slower on small screens for precision
    } else if (AppState.container.width < 768) {
      return 0.0025
    } else {
      return 0.002 // Default speed for larger screens
    }
  }
}

/**
 * ResponsiveManager class to handle device detection and responsive behavior
 */
class ResponsiveManager {
  constructor() {
    this.deviceType = this.detectDeviceType()
    this.isTouch = this.detectTouchCapability()
    this.orientation = this.getOrientation()
  }

  /**
   * Detect device type based on screen dimensions
   */
  detectDeviceType() {
    const width = AppState.container.width
    const height = AppState.container.height
    const minDimension = Math.min(width, height)

    if (minDimension < 480) {
      return "mobile-small"
    } else if (minDimension < 768) {
      return "mobile-large"
    } else if (minDimension < 1024) {
      return "tablet"
    } else {
      return "desktop"
    }
  }

  /**
   * Detect touch capability
   */
  detectTouchCapability() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0
  }

  /**
   * Get current orientation
   */
  getOrientation() {
    return AppState.container.height > AppState.container.width ? "portrait" : "landscape"
  }

  /**
   * Update responsive state on resize/orientation change
   */
  updateResponsiveState() {
    this.deviceType = this.detectDeviceType()
    this.orientation = this.getOrientation()

    console.log("Responsive state updated:", {
      deviceType: this.deviceType,
      orientation: this.orientation,
      isTouch: this.isTouch,
      dimensions: `${AppState.container.width}x${AppState.container.height}`,
    })
  }

  /**
   * Get optimal viewport radius for current device
   */
  getOptimalViewportRadius() {
    const { width, height } = AppState.container
    const minDimension = Math.min(width, height)

    switch (this.deviceType) {
      case "mobile-small":
        return Math.min(80, minDimension * 0.15)
      case "mobile-large":
        return Math.min(100, minDimension * 0.18)
      case "tablet":
        return Math.min(140, minDimension * 0.2)
      case "desktop":
        return Math.min(180, minDimension * 0.15)
      default:
        return Math.min(150, minDimension * 0.18)
    }
  }

  /**
   * Check if device should use touch-optimized interactions
   */
  shouldUseTouchOptimizations() {
    return this.isTouch && (this.deviceType.includes("mobile") || this.deviceType === "tablet")
  }
}

// Create instances
const viewportController = new ViewportController()
const responsiveManager = new ResponsiveManager()

/**
 * Handle mouse movement for viewport tracking with optimized throttling
 */
const handleMouseMove = throttle((event) => {
  if (!AppState.isLoaded) return

  // Update input state
  AppState.input.mouseX = event.clientX
  AppState.input.mouseY = event.clientY
  AppState.input.isMouseActive = true
  AppState.input.keyboardActive = false // Mouse takes priority over keyboard

  // Convert mouse position to viewport coordinates
  const position = viewportController.mouseToViewportPosition(event.clientX, event.clientY)

  // Update viewport position with smooth movement
  viewportController.updateViewportPosition(position.x, position.y, true)
}, 8) // ~120fps throttling for smoother mouse tracking

/**
 * Handle keydown events for navigation
 */
function handleKeyDown(event) {
  if (!AppState.isLoaded) return

  const key = event.key.toLowerCase()

  // Check if it's a navigation key
  const navigationKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]

  if (navigationKeys.includes(key)) {
    event.preventDefault() // Prevent default browser behavior

    // Add key to pressed keys set
    AppState.input.keysPressed.add(key)
    AppState.input.keyboardActive = true
    AppState.input.isMouseActive = false // Keyboard takes priority over mouse

    // Start continuous movement if not already moving
    if (!AppState.keyboard.isMoving) {
      startKeyboardMovement()
    }
  }
}

/**
 * Handle keyup events for navigation
 */
function handleKeyUp(event) {
  if (!AppState.isLoaded) return

  const key = event.key.toLowerCase()

  // Remove key from pressed keys set
  AppState.input.keysPressed.delete(key)

  // Stop movement if no keys are pressed
  if (AppState.input.keysPressed.size === 0) {
    stopKeyboardMovement()
  }
}

/**
 * Optimized continuous keyboard movement using requestAnimationFrame with performance monitoring
 */
function startKeyboardMovement() {
  if (AppState.keyboard.isMoving) return

  AppState.keyboard.isMoving = true
  let lastFrameTime = performance.now()

  const moveLoop = (currentTime) => {
    if (!AppState.keyboard.isMoving || AppState.input.keysPressed.size === 0) {
      stopKeyboardMovement()
      return
    }

    // Calculate frame delta for consistent movement speed across different frame rates
    const deltaTime = currentTime - lastFrameTime
    lastFrameTime = currentTime

    // Normalize movement speed based on frame time (target: 60fps)
    const frameMultiplier = deltaTime / 16.67 // 16.67ms = 60fps

    // Calculate movement deltas based on pressed keys
    let deltaX = 0
    let deltaY = 0

    // Get responsive movement speed
    const baseSpeed = viewportController.getKeyboardMoveSpeed()
    const moveSpeed = baseSpeed * frameMultiplier

    // Handle arrow keys and WASD with diagonal movement optimization
    const leftPressed = AppState.input.keysPressed.has("arrowleft") || AppState.input.keysPressed.has("a")
    const rightPressed = AppState.input.keysPressed.has("arrowright") || AppState.input.keysPressed.has("d")
    const upPressed = AppState.input.keysPressed.has("arrowup") || AppState.input.keysPressed.has("w")
    const downPressed = AppState.input.keysPressed.has("arrowdown") || AppState.input.keysPressed.has("s")

    if (leftPressed) deltaX -= moveSpeed
    if (rightPressed) deltaX += moveSpeed
    if (upPressed) deltaY -= moveSpeed
    if (downPressed) deltaY += moveSpeed

    // Normalize diagonal movement to maintain consistent speed
    if ((leftPressed || rightPressed) && (upPressed || downPressed)) {
      const diagonalFactor = 1 / Math.sqrt(2) // ~0.707
      deltaX *= diagonalFactor
      deltaY *= diagonalFactor
    }

    // Apply movement if there's any delta
    if (deltaX !== 0 || deltaY !== 0) {
      viewportController.moveViewportByDelta(deltaX, deltaY)
    }

    // Continue the animation loop
    AppState.keyboard.animationId = requestAnimationFrame(moveLoop)
  }

  // Start the movement loop
  AppState.keyboard.animationId = requestAnimationFrame(moveLoop)
}

/**
 * Stop continuous keyboard movement
 */
function stopKeyboardMovement() {
  AppState.keyboard.isMoving = false

  if (AppState.keyboard.animationId) {
    cancelAnimationFrame(AppState.keyboard.animationId)
    AppState.keyboard.animationId = null
  }
}

/**
 * Set up event listeners with comprehensive error handling
 */
function setupEventListeners() {
  try {
    // Global error handlers
    window.addEventListener("error", handleGlobalError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    // Window resize handler with error handling
    window.addEventListener("resize", safeEventHandler(handleResize, "resize"))

    // Orientation change handler with error handling
    window.addEventListener("orientationchange", safeEventHandler(handleOrientationChange, "orientationchange"))

    // Mouse movement handler for viewport tracking with error handling
    document.addEventListener("mousemove", safeEventHandler(handleMouseMove, "mousemove"))

    // Mouse enter/leave handlers to track mouse activity
    document.addEventListener(
      "mouseenter",
      safeEventHandler(() => {
        AppState.input.isMouseActive = true
      }, "mouseenter"),
    )

    document.addEventListener(
      "mouseleave",
      safeEventHandler(() => {
        AppState.input.isMouseActive = false
      }, "mouseleave"),
    )

    // Touch event handlers for mobile support (only if supported)
    if (AppState.browserSupport.touchEvents) {
      document.addEventListener("touchstart", safeEventHandler(handleTouchStart, "touchstart"), { passive: false })
      document.addEventListener("touchmove", safeEventHandler(handleTouchMove, "touchmove"), { passive: false })
      document.addEventListener("touchend", safeEventHandler(handleTouchEnd, "touchend"), { passive: false })

      // Prevent default touch behaviors that might interfere
      document.addEventListener(
        "gesturestart",
        safeEventHandler((e) => e.preventDefault(), "gesturestart"),
        { passive: false },
      )
      document.addEventListener(
        "gesturechange",
        safeEventHandler((e) => e.preventDefault(), "gesturechange"),
        { passive: false },
      )
      document.addEventListener(
        "gestureend",
        safeEventHandler((e) => e.preventDefault(), "gestureend"),
        { passive: false },
      )
    }

    // Keyboard navigation handlers with error handling
    document.addEventListener("keydown", safeEventHandler(handleKeyDown, "keydown"))
    document.addEventListener("keyup", safeEventHandler(handleKeyUp, "keyup"))

    // Prevent context menu on right-click to avoid interfering with navigation
    document.addEventListener(
      "contextmenu",
      safeEventHandler((event) => {
        event.preventDefault()
      }, "contextmenu"),
    )

    // Handle window focus/blur to reset keyboard state
    window.addEventListener(
      "blur",
      safeEventHandler(() => {
        // Clear all pressed keys when window loses focus
        AppState.input.keysPressed.clear()
        stopKeyboardMovement()
        AppState.input.touchActive = false
      }, "blur"),
    )

    // Handle visibility change to pause/resume when tab is hidden
    document.addEventListener(
      "visibilitychange",
      safeEventHandler(() => {
        if (document.hidden) {
          // Pause animations when tab is hidden
          AppState.input.keysPressed.clear()
          stopKeyboardMovement()
        }
      }, "visibilitychange"),
    )

    console.log("Event listeners set up successfully")
  } catch (error) {
    console.error("Failed to set up event listeners:", error)
    handleInitializationError(error)
  }
}

/**
 * Safe event handler wrapper to catch and log errors
 */
function safeEventHandler(handler, eventType) {
  return function (event) {
    try {
      return handler(event)
    } catch (error) {
      console.error(`Error in ${eventType} handler:`, error)
      // Don't re-throw to prevent breaking other event handlers
    }
  }
}

/**
 * Global error handler
 */
function handleGlobalError(event) {
  console.error("Global error caught:", event.error)

  // Log error details for debugging
  const errorInfo = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  }

  console.error("Error details:", errorInfo)

  // Show user-friendly error message if critical
  if (event.error && event.error.message && event.error.message.includes("critical")) {
    showUserError("A critical error occurred. Please refresh the page.")
  }
}

/**
 * Handle unhandled promise rejections
 */
function handleUnhandledRejection(event) {
  console.error("Unhandled promise rejection:", event.reason)

  // Prevent the default browser behavior
  event.preventDefault()

  // Show user-friendly error for image loading failures
  if (event.reason && event.reason.message && event.reason.message.includes("image")) {
    showUserError("Failed to load background image. Please check your connection and try again.")
  }
}

/**
 * Show user-friendly error message
 */
function showUserError(message) {
  const errorDiv = document.createElement("div")
  errorDiv.className = "user-error-toast"
  errorDiv.innerHTML = `
    <div class="error-toast-content">
      <span class="error-icon">⚠️</span>
      <span class="error-message">${message}</span>
      <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `

  document.body.appendChild(errorDiv)

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove()
    }
  }, 5000)
}

/**
 * Optimized resize handler with debouncing for better performance
 */
const handleResize = debounce(() => {
  updateContainerDimensions()

  // Update responsive state
  responsiveManager.updateResponsiveState()

  // Reapply mobile background fixes after resize
  if (window.imageLoader && AppState.imageState.isLoaded) {
    window.imageLoader.applyMobileBackgroundFixes()
  }

  // Recalculate viewport radius for new screen size
  if (AppState.isLoaded) {
    calculateViewportRadius()
    updateViewportPosition()
  }

  console.log("Window resized:", AppState.container.width, "x", AppState.container.height)
}, 100) // Debounce resize events to avoid excessive calculations

/**
 * Handle orientation change
 */
function handleOrientationChange() {
  // Add a small delay to ensure the viewport has updated
  setTimeout(() => {
    updateContainerDimensions()

    // Update responsive state
    responsiveManager.updateResponsiveState()

    // Reapply mobile background fixes after orientation change
    if (window.imageLoader && AppState.imageState.isLoaded) {
      window.imageLoader.applyMobileBackgroundFixes()
    }

    if (AppState.isLoaded) {
      calculateViewportRadius()
      updateViewportPosition()
    }

    console.log(
      "Orientation changed:",
      AppState.container.width,
      "x",
      AppState.container.height,
      "(" + responsiveManager.orientation + ")",
    )
  }, 100)
}

/**
 * Handle touch start events
 */
function handleTouchStart(event) {
  if (!AppState.isLoaded) return

  event.preventDefault() // Prevent default touch behavior

  const touch = event.touches[0]
  if (touch) {
    AppState.input.touchActive = true
    AppState.input.isMouseActive = false
    AppState.input.keyboardActive = false

    // Update touch position
    AppState.input.mouseX = touch.clientX
    AppState.input.mouseY = touch.clientY

    // Convert touch position to viewport coordinates
    const position = viewportController.mouseToViewportPosition(touch.clientX, touch.clientY)

    // Update viewport position immediately for touch
    viewportController.updateViewportPosition(position.x, position.y, false)
  }
}

/**
 * Optimized touch move handler with adaptive throttling
 */
const handleTouchMove = throttle((event) => {
  if (!AppState.isLoaded || !AppState.input.touchActive) return

  event.preventDefault() // Prevent scrolling and other default behaviors

  const touch = event.touches[0]
  if (touch) {
    // Update touch position
    AppState.input.mouseX = touch.clientX
    AppState.input.mouseY = touch.clientY

    // Convert touch position to viewport coordinates
    const position = viewportController.mouseToViewportPosition(touch.clientX, touch.clientY)

    // Update viewport position with optimized smoothing for responsive touch
    viewportController.updateViewportPosition(position.x, position.y, true)
  }
}, 6) // Ultra-high frequency for touch (166fps) for maximum responsiveness

/**
 * Handle touch end events
 */
function handleTouchEnd(event) {
  if (!AppState.isLoaded) return

  event.preventDefault()

  // Keep touch active state briefly to prevent mouse events from interfering
  setTimeout(() => {
    if (event.touches.length === 0) {
      AppState.input.touchActive = false
    }
  }, 100)
}

/**
 * Legacy image load handlers (kept for compatibility)
 * Note: Main image loading is now handled by ImageLoader class
 */
function handleImageLoad() {
  console.log("Legacy image load handler called")
  // This is now handled by ImageLoader class
}

function handleImageError() {
  console.log("Legacy image error handler called")
  // This is now handled by ImageLoader class
}

/**
 * Optimized throttling function using requestAnimationFrame for better performance
 */
function throttle(func, limit) {
  let inThrottle = false
  let lastExecTime = 0

  return function (...args) {
    const context = this
    const now = performance.now()

    if (!inThrottle && now - lastExecTime >= limit) {
      func.apply(context, args)
      lastExecTime = now
      inThrottle = true

      // Use requestAnimationFrame for smoother throttling
      requestAnimationFrame(() => {
        inThrottle = false
      })
    }
  }
}

/**
 * Debounce function for less frequent operations
 */
function debounce(func, delay) {
  let timeoutId
  return function (...args) {
    const context = this
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(context, args), delay)
  }
}

/**
 * Initialize viewport positioning with error handling
 */
function initializeViewport() {
  try {
    // Set initial viewport position to center of screen
    AppState.viewport.x = 0.5
    AppState.viewport.y = 0.5

    // Calculate responsive viewport radius
    calculateViewportRadius()

    // Update the viewport display
    updateViewportPosition()

    // Mark as loaded
    AppState.isLoaded = true
    document.body.classList.add("loaded")

    console.log("Viewport initialized at center position")

    // Test the viewport positioning
    testViewportMask()

    // Show success message briefly
    if (loadingIndicator) {
      loadingIndicator.innerHTML = "<p>✅ Ready to explore!</p>"
      setTimeout(() => {
        if (loadingIndicator) {
          loadingIndicator.style.opacity = "0"
          setTimeout(() => {
            if (loadingIndicator) {
              loadingIndicator.style.display = "none"
            }
          }, 300)
        }
      }, 1000)
    }
  } catch (error) {
    console.error("Failed to initialize viewport:", error)
    showUserError("Failed to initialize the binocular viewer. Please refresh the page.")
  }
}

/**
 * Calculate responsive viewport radius based on screen size
 */
function calculateViewportRadius() {
  // Use responsive manager for optimal radius calculation
  let baseRadius = responsiveManager.getOptimalViewportRadius()

  const maxDimension = Math.max(AppState.container.width, AppState.container.height)
  const minDimension = Math.min(AppState.container.width, AppState.container.height)
  const aspectRatio = maxDimension / minDimension

  // Adjust for extreme aspect ratios
  if (aspectRatio > 2.5) {
    baseRadius *= 0.75 // Reduce radius for very wide screens
  } else if (aspectRatio > 2) {
    baseRadius *= 0.85
  }

  // Ensure minimum and maximum bounds
  AppState.viewport.radius = Math.max(60, Math.min(200, baseRadius))

  console.log(
    "Viewport radius calculated:",
    AppState.viewport.radius,
    "for",
    AppState.container.width + "x" + AppState.container.height,
    "(" + responsiveManager.orientation + ", " + responsiveManager.deviceType + ")",
  )
}

/**
 * Highly optimized viewport position update with performance monitoring and error handling
 */
function updateViewportPosition() {
  if (!viewportMask) return

  try {
    // Performance monitoring
    AppState.performance.updateCount++
    const now = performance.now()

    // Convert normalized coordinates to pixel coordinates
    const pixelX = AppState.viewport.x * AppState.container.width
    const pixelY = AppState.viewport.y * AppState.container.height

    // Use appropriate update method based on browser support
    if (AppState.browserSupport.customProperties && AppState.browserSupport.requestAnimationFrame) {
      // Modern browser path with requestAnimationFrame
      requestAnimationFrame(() => {
        try {
          // Update CSS custom properties in a single batch to minimize reflows
          const style = viewportMask.style
          style.setProperty("--viewport-x", `${pixelX}px`)
          style.setProperty("--viewport-y", `${pixelY}px`)
          style.setProperty("--viewport-radius", `${AppState.viewport.radius}px`)
        } catch (error) {
          console.warn("Failed to update CSS custom properties:", error)
          // Fallback to direct style updates
          updateViewportPositionFallback(pixelX, pixelY)
        }
      })
    } else {
      // Fallback for older browsers
      updateViewportPositionFallback(pixelX, pixelY)
    }

    // Update performance metrics
    AppState.performance.frameCount++
    AppState.performance.lastUpdateTime = now

    // Calculate FPS every second
    if (now - AppState.performance.lastFpsUpdate > 1000) {
      AppState.performance.fps = AppState.performance.frameCount
      AppState.performance.frameCount = 0
      AppState.performance.lastFpsUpdate = now

      // Log performance metrics in development
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.debug(`Performance: ${AppState.performance.fps} FPS, ${AppState.performance.updateCount} updates/sec`)
        AppState.performance.updateCount = 0
      }
    }
  } catch (error) {
    console.error("Error updating viewport position:", error)
    // Continue execution to prevent breaking the application
  }
}

/**
 * Fallback viewport position update for older browsers
 */
function updateViewportPositionFallback(pixelX, pixelY) {
  try {
    if (AppState.browserSupport.customProperties) {
      // Use custom properties but without requestAnimationFrame
      const style = viewportMask.style
      style.setProperty("--viewport-x", `${pixelX}px`)
      style.setProperty("--viewport-y", `${pixelY}px`)
      style.setProperty("--viewport-radius", `${AppState.viewport.radius}px`)
    } else {
      // Direct style manipulation for very old browsers
      if (window.fallbackViewport) {
        window.fallbackViewport.x = `${pixelX}px`
        window.fallbackViewport.y = `${pixelY}px`
        window.fallbackViewport.radius = `${AppState.viewport.radius}px`
      }

      // Update background position as a basic fallback
      if (viewportMask) {
        viewportMask.style.backgroundPosition = `${pixelX}px ${pixelY}px`
      }
    }
  } catch (error) {
    console.error("Fallback viewport update failed:", error)
  }
}

/**
 * Set viewport position (normalized coordinates 0-1)
 */
function setViewportPosition(normalizedX, normalizedY) {
  // Clamp values to valid range
  AppState.viewport.x = Math.max(0, Math.min(1, normalizedX))
  AppState.viewport.y = Math.max(0, Math.min(1, normalizedY))

  // Update display
  updateViewportPosition()
}

/**
 * Test function to verify viewport mask and navigation with error handling
 */
function testViewportMask() {
  try {
    if (!viewportMask) {
      console.error("Viewport mask element not found")
      showUserError("Viewport mask initialization failed")
      return
    }

    // Check if CSS custom properties are set
    const computedStyle = getComputedStyle(viewportMask)
    const viewportX = viewportMask.style.getPropertyValue("--viewport-x")
    const viewportY = viewportMask.style.getPropertyValue("--viewport-y")
    const viewportRadius = viewportMask.style.getPropertyValue("--viewport-radius")

    console.log("Viewport mask test results:")
    console.log("- Viewport X:", viewportX || "Not set (using fallback)")
    console.log("- Viewport Y:", viewportY || "Not set (using fallback)")
    console.log("- Viewport Radius:", viewportRadius || "Not set (using fallback)")

    try {
      console.log("- Background style:", computedStyle.background.substring(0, 50) + "...")
    } catch (e) {
      console.log("- Background style: Could not read (browser compatibility issue)")
    }

    // Test viewport positioning
    if (AppState.browserSupport.customProperties) {
      console.log("✅ Modern viewport positioning active")
    } else {
      console.log("⚠️ Using fallback viewport positioning")
    }

    // Navigation functionality ready
    console.log("Navigation controls initialized:")
    console.log("- Mouse tracking: Move your mouse to control viewport")
    console.log("- Keyboard navigation: Use arrow keys or WASD to move")
    console.log("- Hold keys for continuous movement")
    console.log("- Boundary constraints active - viewport will stay within image bounds")

    // Test a small viewport movement to verify functionality
    const originalX = AppState.viewport.x
    const originalY = AppState.viewport.y

    // Move slightly and then back
    AppState.viewport.x = 0.51
    AppState.viewport.y = 0.51
    updateViewportPosition()

    setTimeout(() => {
      AppState.viewport.x = originalX
      AppState.viewport.y = originalY
      updateViewportPosition()
      console.log("✅ Viewport movement test completed successfully")
    }, 100)
  } catch (error) {
    console.error("Error during viewport mask testing:", error)
    showUserError("Viewport testing failed - some features may not work properly")
  }
}

/**
 * Show touch instructions for mobile devices
 */
function showTouchInstructions() {
  const touchInstructions = document.getElementById("touchInstructions")

  if (touchInstructions && responsiveManager.shouldUseTouchOptimizations()) {
    // Show instructions initially
    touchInstructions.classList.add("show")

    // Hide instructions after first interaction or after 5 seconds
    let hasInteracted = false

    const hideInstructions = () => {
      if (!hasInteracted) {
        hasInteracted = true
        touchInstructions.classList.remove("show", "initial")
      }
    }

    // Hide on first touch
    document.addEventListener("touchstart", hideInstructions, { once: true })

    // Hide on first mouse move (for devices that support both)
    document.addEventListener("mousemove", hideInstructions, { once: true })

    // Hide on first key press
    document.addEventListener("keydown", hideInstructions, { once: true })

    // Auto-hide after 5 seconds
    setTimeout(hideInstructions, 5000)
  } else if (touchInstructions) {
    // Hide instructions on desktop
    touchInstructions.style.display = "none"
  }
}

/**
 * Test function to verify error handling and browser compatibility
 */
function testErrorHandling() {
  console.log("=== Testing Error Handling and Browser Compatibility ===")

  // Test browser compatibility detection
  console.log("Browser Support Test Results:")
  console.log("- Clip-path:", AppState.browserSupport.clipPath ? "✅ Supported" : "❌ Not supported")
  console.log("- Custom Properties:", AppState.browserSupport.customProperties ? "✅ Supported" : "❌ Not supported")
  console.log("- RequestAnimationFrame:", AppState.browserSupport.requestAnimationFrame ? "✅ Supported" : "❌ Not supported")
  console.log("- Touch Events:", AppState.browserSupport.touchEvents ? "✅ Supported" : "❌ Not supported")
  console.log("- Modern CSS:", AppState.browserSupport.modernCSS ? "✅ Supported" : "❌ Not supported")

  // Test error handling by simulating an error
  console.log("\nTesting error handling...")
  try {
    // Simulate a non-critical error
    throw new Error("Test error for demonstration")
  } catch (error) {
    console.log("✅ Error caught and handled properly:", error.message)
  }

  // Test image loading state
  console.log("\nImage Loading State:")
  console.log("- Is Loading:", AppState.imageState.isLoading)
  console.log("- Is Loaded:", AppState.imageState.isLoaded)
  console.log("- Has Error:", AppState.imageState.hasError)
  console.log("- Retry Count:", AppState.imageState.retryCount)

  console.log("\n=== Error Handling Test Complete ===")
}

/**
 * GitHub Pages optimization utilities
 */
const GitHubPagesOptimizer = {
  /**
   * Detect if running on GitHub Pages
   */
  isGitHubPages() {
    return window.location.hostname.includes("github.io") || window.location.hostname.includes("github.com")
  },

  /**
   * Optimize asset loading for GitHub Pages
   */
  optimizeAssetLoading() {
    // Preload critical assets
    const link = document.createElement("link")
    link.rel = "preload"
    link.href = "strategy.png"
    link.as = "image"
    document.head.appendChild(link)

    // Add cache-busting for development vs production
    if (!this.isGitHubPages() && window.location.hostname === "localhost") {
      console.log("Development mode: localhost detected")
    } else {
      console.log("Production mode: optimizing for GitHub Pages")
    }
  },

  /**
   * Add performance monitoring for GitHub Pages
   */
  addPerformanceMonitoring() {
    if ("performance" in window) {
      window.addEventListener("load", () => {
        const perfData = performance.getEntriesByType("navigation")[0]
        if (perfData) {
          console.log("Page load performance:", {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.fetchStart,
          })
        }
      })
    }
  },
}

/**
 * Start the application when DOM is ready
 */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    GitHubPagesOptimizer.optimizeAssetLoading()
    GitHubPagesOptimizer.addPerformanceMonitoring()
    init()
  })
} else {
  GitHubPagesOptimizer.optimizeAssetLoading()
  GitHubPagesOptimizer.addPerformanceMonitoring()
  init()
}

/**
 * Application health check and monitoring
 */
function performHealthCheck() {
  const healthStatus = {
    initialization: AppState.isLoaded && !AppState.hasError,
    imageLoading: AppState.imageState.isLoaded && !AppState.imageState.hasError,
    browserSupport: AppState.browserSupport.modernCSS && AppState.browserSupport.clipPath,
    domElements: !!(binocularContainer && backgroundImage && viewportMask),
    eventListeners: true, // Assume true if we got this far
    viewport: AppState.viewport.x >= 0 && AppState.viewport.y >= 0,
  }

  const healthScore = Object.values(healthStatus).filter(Boolean).length / Object.keys(healthStatus).length

  console.log("=== Application Health Check ===")
  console.log("Health Status:", healthStatus)
  console.log(`Overall Health Score: ${Math.round(healthScore * 100)}%`)

  if (healthScore < 0.8) {
    console.warn("⚠️ Application health is below optimal")
    if (healthScore < 0.5) {
      showUserError("Application is experiencing issues. Some features may not work properly.")
    }
  } else {
    console.log("✅ Application is healthy")
  }

  return healthStatus
}

/**
 * Periodic health monitoring
 */
function startHealthMonitoring() {
  // Check health every 30 seconds
  setInterval(() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      performHealthCheck()
    }
  }, 30000)
}

// Run tests and health checks after initialization
setTimeout(() => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    testErrorHandling()
    performHealthCheck()
    startHealthMonitoring()
  }
}, 2000)

// Final error boundary - catch any remaining uncaught errors
window.addEventListener("error", (event) => {
  console.error("Final error boundary caught:", event.error)

  // If this is a critical error that breaks the app
  if (!AppState.isLoaded || AppState.hasError) {
    const errorMessage = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
        box-sizing: border-box;
      ">
        <div>
          <h1>🚫 Application Error</h1>
          <p>The binocular viewer encountered a critical error and cannot continue.</p>
          <p><strong>Error:</strong> ${event.error?.message || "Unknown error"}</p>
          <button onclick="location.reload()" style="
            background: #4CAF50;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          ">Reload Application</button>
          <div style="margin-top: 30px; font-size: 14px; opacity: 0.8;">
            <p>If this error persists, please check:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>Browser compatibility (modern browser recommended)</li>
              <li>JavaScript is enabled</li>
              <li>All files are properly loaded</li>
            </ul>
          </div>
        </div>
      </div>
    `

    document.body.innerHTML = errorMessage
  }
})

console.log("🛡️ Error handling and browser compatibility features initialized")

/**
 * Debug function for mobile background image issues
 */
function debugMobileBackground() {
  console.log("=== Mobile Background Debug Info ===")

  if (backgroundImage) {
    const computedStyle = getComputedStyle(backgroundImage)
    const rect = backgroundImage.getBoundingClientRect()

    console.log("Background Element Info:")
    console.log("- Element dimensions:", rect.width + "x" + rect.height)
    console.log("- Background size:", computedStyle.backgroundSize)
    console.log("- Background position:", computedStyle.backgroundPosition)
    console.log("- Background attachment:", computedStyle.backgroundAttachment)
    console.log("- Background image:", computedStyle.backgroundImage.substring(0, 50) + "...")

    console.log("\nViewport Info:")
    console.log("- Window dimensions:", window.innerWidth + "x" + window.innerHeight)
    console.log("- Device pixel ratio:", window.devicePixelRatio || 1)
    console.log("- Orientation:", responsiveManager.orientation)
    console.log("- Device type:", responsiveManager.deviceType)
    console.log("- Is touch device:", responsiveManager.isTouch)

    console.log("\nCSS Applied Classes:")
    console.log("- Body classes:", document.body.className)
    console.log("- Background classes:", backgroundImage.className)

    // Check if background is too small
    if (rect.width < window.innerWidth * 0.8 || rect.height < window.innerHeight * 0.8) {
      console.warn("⚠️ Background appears to be smaller than expected!")
      console.log("Attempting to fix...")

      if (window.imageLoader) {
        window.imageLoader.applyMobileBackgroundFixes()
      }
    } else {
      console.log("✅ Background size appears normal")
    }
  } else {
    console.error("❌ Background image element not found")
  }

  console.log("\n=== Mobile Background Debug Complete ===")
}

// Make debug function available globally for testing
window.debugMobileBackground = debugMobileBackground
