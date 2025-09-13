# Design Document

## Overview

The binocular viewer website creates an immersive experience by displaying a circular viewport that reveals portions of a background image (strategy.png). Users can navigate around the image using mouse movement or keyboard controls. The implementation uses modern CSS clip-path properties for the circular mask effect and JavaScript for smooth interactive navigation.

## Architecture

The application follows a simple client-side architecture with three main layers:

1. **Presentation Layer**: HTML structure with semantic elements
2. **Styling Layer**: CSS for visual effects, responsive design, and the binocular mask
3. **Interaction Layer**: JavaScript for mouse/keyboard event handling and viewport positioning

### Key Technical Decisions

- **CSS clip-path**: Using `clip-path: circle()` for the binocular effect instead of canvas or SVG for better performance and simplicity
- **CSS transforms**: Using `transform: translate()` for smooth viewport movement with hardware acceleration
- **Event delegation**: Single event listeners on the document for efficient mouse/keyboard handling
- **Requestanimationframe**: For smooth animation loops when using keyboard navigation

## Components and Interfaces

### HTML Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Binocular Viewer</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div class="binocular-container">
      <div class="background-image"></div>
      <div class="viewport-mask"></div>
    </div>
    <script src="script.js"></script>
  </body>
</html>
```

### CSS Components

#### Background Image Container

- Full-screen background image positioning
- Image scaling to cover entire viewport while maintaining aspect ratio
- Overflow hidden to prevent scrollbars

#### Viewport Mask

- Circular clip-path mask that creates the binocular effect
- Dark overlay outside the circular area
- Smooth transitions for movement

#### Responsive Design

- Flexible viewport sizing based on screen dimensions
- Touch-friendly controls for mobile devices
- Orientation change handling

### JavaScript Modules

#### ViewportController

- Manages the position of the circular viewport
- Handles boundary constraints to keep viewport within image bounds
- Provides smooth interpolation for movement

#### InputHandler

- Mouse event processing (mousemove, touchmove)
- Keyboard event processing (arrow keys, WASD)
- Event throttling for performance optimization

#### ResponsiveManager

- Screen size detection and adaptation
- Viewport size calculations
- Orientation change handling

## Data Models

### ViewportState

```javascript
{
  x: number,           // Current X position (0-1 normalized)
  y: number,           // Current Y position (0-1 normalized)
  radius: number,      // Viewport radius in pixels
  imageWidth: number,  // Background image width
  imageHeight: number, // Background image height
  containerWidth: number,  // Container width
  containerHeight: number  // Container height
}
```

### InputState

```javascript
{
  mouseX: number,      // Current mouse X position
  mouseY: number,      // Current mouse Y position
  keysPressed: Set,    // Currently pressed keys
  isMouseActive: boolean,  // Whether mouse control is active
  touchActive: boolean     // Whether touch is active
}
```

## Error Handling

### Image Loading

- Fallback handling if strategy.png fails to load
- Loading state indicators
- Graceful degradation for unsupported browsers

### Browser Compatibility

- Feature detection for clip-path support
- Fallback to alternative masking techniques for older browsers
- Progressive enhancement approach

### Input Validation

- Boundary checking for viewport positioning
- Input sanitization for keyboard events
- Touch event normalization across devices

### Performance Considerations

- Event throttling to prevent excessive calculations
- RequestAnimationFrame for smooth animations
- Efficient DOM updates using transforms instead of position changes

## Testing Strategy

### Unit Testing

- ViewportController position calculations
- Boundary constraint logic
- Input event processing functions
- Responsive calculation utilities

### Integration Testing

- Mouse and keyboard navigation workflows
- Touch gesture handling on mobile devices
- Image loading and display functionality
- Cross-browser compatibility testing

### Visual Testing

- Circular mask rendering accuracy
- Smooth movement transitions
- Responsive design across screen sizes
- Image scaling and positioning

### Performance Testing

- Frame rate monitoring during navigation
- Memory usage optimization
- Event handling efficiency
- Mobile device performance validation

### User Acceptance Testing

- Navigation intuitiveness and responsiveness
- Visual quality of the binocular effect
- Cross-device functionality verification
- Accessibility compliance (keyboard navigation)

## Implementation Notes

### CSS Clip-Path Implementation

The circular viewport effect will be achieved using:

```css
.viewport-mask {
  clip-path: circle(150px at var(--viewport-x) var(--viewport-y));
}
```

### Smooth Movement

JavaScript will update CSS custom properties for hardware-accelerated movement:

```javascript
element.style.setProperty("--viewport-x", `${x}px`)
element.style.setProperty("--viewport-y", `${y}px`)
```

### Mobile Touch Support

Touch events will be normalized to work similarly to mouse events:

```javascript
const touch = event.touches[0]
const mouseEvent = { clientX: touch.clientX, clientY: touch.clientY }
```
