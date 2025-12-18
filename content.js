// Listen for Option+Shift+S keyboard shortcut
document.addEventListener('keydown', (e) => {
  // Check for Option (Alt) + Shift + S
  if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.code === 'KeyS')) {
    e.preventDefault();
    selectAboutTheJobSection();
  }
});

function selectAboutTheJobSection() {
  try {
    // Find the "About the job" h2 heading
    const headings = document.querySelectorAll('h2');
    let aboutJobHeading = null;

    for (const heading of headings) {
      if (heading.textContent.trim() === 'About the job') {
        aboutJobHeading = heading;
        break;
      }
    }

    if (!aboutJobHeading) {
      console.warn('LinkedIn Job Quick Select: "About the job" heading not found on this page');
      return;
    }

    // Find the expandable text box span (the actual content)
    const contentSpan = document.querySelector('span[data-testid="expandable-text-box"]');

    if (!contentSpan) {
      console.warn('LinkedIn Job Quick Select: Content span not found');
      return;
    }

    // Look for the hr separator that marks the end of the section
    const hrSeparator = contentSpan.parentElement.querySelector('hr');

    // Create a range for the selection
    const range = document.createRange();

    // Start from the beginning of the content span
    range.setStartBefore(contentSpan.firstChild || contentSpan);

    // End at the hr separator if it exists, otherwise end of content span
    if (hrSeparator) {
      range.setEndBefore(hrSeparator);
    } else {
      range.setEndAfter(contentSpan.lastChild || contentSpan);
    }

    // Apply the selection
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Scroll to the top of the selected content
    aboutJobHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.log('LinkedIn Job Quick Select: Text selected successfully');

  } catch (error) {
    console.error('LinkedIn Job Quick Select: Error selecting text', error);
  }
}
