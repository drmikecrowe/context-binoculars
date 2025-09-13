# Binocular Viewer - Interactive Strategy Image Explorer

An interactive web application that simulates looking through binoculars at a strategy diagram. Users can navigate around the image using mouse movement, keyboard controls, or touch gestures on mobile devices.

## Features

- **Interactive Binocular Effect**: Circular viewport that reveals portions of the background image
- **Multiple Navigation Methods**:
  - Mouse movement for intuitive exploration
  - Keyboard controls (Arrow keys or WASD)
  - Touch gestures for mobile devices
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Smooth Animations**: Hardware-accelerated viewport movement with smooth transitions
- **Error Handling**: Graceful fallbacks for unsupported browsers and loading errors
- **Performance Optimized**: Throttled events and efficient DOM updates

## How to Use

1. **Mouse Navigation**: Move your mouse around the screen to explore different parts of the image
2. **Keyboard Navigation**: Use arrow keys or WASD keys to move the viewport
3. **Touch Navigation**: On mobile devices, touch and drag to explore the image
4. **Boundary Constraints**: The viewport automatically stays within the image boundaries

## Technical Implementation

- **Pure Web Technologies**: Built with HTML5, CSS3, and vanilla JavaScript
- **CSS Clip-Path**: Uses modern CSS `clip-path: circle()` for the binocular effect
- **Hardware Acceleration**: Leverages CSS transforms for smooth performance
- **Progressive Enhancement**: Graceful degradation for older browsers
- **GitHub Pages Ready**: Optimized for static hosting and deployment

## Browser Compatibility

- Modern browsers with CSS clip-path support
- Fallback handling for older browsers
- Mobile Safari and Chrome optimized
- Touch event support for mobile devices

## Development

To run locally:

```bash
# Start a simple HTTP server
python -m http.server 8000

# Or use Node.js
npx serve .

# Then visit http://localhost:8000
```

## Deployment

This project is optimized for GitHub Pages deployment. Simply push to a GitHub repository and enable GitHub Pages in the repository settings.

## Credits

Special thanks to the [Journal of Business Case Studies](https://journal-bcs.springeropen.com/articles/10.1007/s13173-013-0106-x) for the background strategy diagram image used in this demonstration.
