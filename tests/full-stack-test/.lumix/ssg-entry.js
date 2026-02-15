
// SSG Entry Point - Hydrate pre-rendered static content
import { signal, effect } from "lumix-js";

function hydrateSSGContent() {
  const root = document.getElementById("app");
  if (!root) {
    console.warn("Lumix SSG: Root element not found");
    return;
  }

  // Re-create the signals and reactive state that were used during pre-rendering
  // This is a simplified hydration that reconnects interactivity to static HTML
  
  // Find buttons with count functionality (this is specific to the demo)
  const countButtons = root.querySelectorAll('button');
  countButtons.forEach(button => {
    if (button.textContent && button.textContent.includes('Count:')) {
      // Extract the current count from the button text
      const match = button.textContent.match(/Count:\s*(\d+)/);
      const initialCount = match ? parseInt(match[1], 10) : 0;
      
      // Create a signal for this button
      const count = signal(initialCount);
      
      // Set up reactivity to update button text
      effect(() => {
        const currentCount = count();
        button.textContent = `Count: ${currentCount}`;
      });
      
      // Add click handler
      button.onclick = () => {
        count(count() + 1);
      };
    }
  });
  
  console.log("Lumix SSG: Content hydrated successfully");
}

// Initialize hydration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateSSGContent);
} else {
  hydrateSSGContent();
}
