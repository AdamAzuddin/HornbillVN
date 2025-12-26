window.scrollTo(0, 0);

// Optional: Force the browser to treat the transition as a fresh start
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener('DOMContentLoaded', () => {
    const story = document.querySelector('tw-story');
    if (!story) return;

    // Watch for new passages being added to the story (handles navigation)
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.tagName && node.tagName.toLowerCase() === 'tw-passage') {
                    applyTypewriter(node);
                }
            }
        }
    });

    observer.observe(story, { childList: true });

    // Handle the case where the passage is already present on load
    const currentPassage = story.querySelector('tw-passage');
    if (currentPassage) applyTypewriter(currentPassage);
});

function applyTypewriter(storyContainer) {
    // Add the cursor class
    storyContainer.classList.add('typing');
    storyContainer.classList.remove('interactive');

    const textNodes = [];
    // Use a TreeWalker to find all text nodes while preserving HTML structure (b, i, links, etc.)
    const walker = document.createTreeWalker(storyContainer, NodeFilter.SHOW_TEXT, null, false);
    let node;

    // Collect all text nodes and clear them initially
    while (node = walker.nextNode()) {
        if (node.textContent.trim().length > 0) {
            textNodes.push({ node: node, text: node.textContent });
            node.textContent = '';
        }
    }

    let nodeIndex = 0;
    let charIndex = 0;
    const speed = 30; // Typing speed in milliseconds
    let timeoutID;

    function finishTyping() {
        if (timeoutID) clearTimeout(timeoutID);
        textNodes.forEach(t => t.node.textContent = t.text);
        storyContainer.classList.remove('typing');
        storyContainer.classList.add('interactive');
        document.removeEventListener('click', clickHandler, { capture: true });
    }

    function clickHandler(e) {
        e.stopPropagation();
        e.preventDefault();
        finishTyping();
    }

    document.addEventListener('click', clickHandler, { capture: true });

    function typeChar() {
        if (nodeIndex >= textNodes.length) {
            finishTyping();
            return;
        }

        const current = textNodes[nodeIndex];
        current.node.textContent += current.text.charAt(charIndex);
        charIndex++;

        if (charIndex < current.text.length) {
            timeoutID = setTimeout(typeChar, speed);
        } else {
            nodeIndex++;
            charIndex = 0;
            timeoutID = setTimeout(typeChar, speed);
        }
    }

    // Start typing
    typeChar();
}