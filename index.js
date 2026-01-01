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
    // Cleanup unwanted <br> tags caused by newlines after scripts or sprites
    storyContainer.querySelectorAll('br').forEach(br => {
        let prev = br.previousSibling;
        while (prev && prev.nodeType === 3 && prev.textContent.trim() === '') {
            prev = prev.previousSibling;
        }
        if (prev && (prev.nodeName === 'SCRIPT' || (prev.nodeName === 'IMG' && prev.classList.contains('sprite')))) {
            br.remove();
        }
    });

    // Prepend any sprite if it exists in current passage
    storyContainer.querySelectorAll('img.sprite').forEach(sprite => {
        document.querySelector('tw-story').prepend(sprite);
        setTimeout(() => {
            sprite.classList.add('enter-left');
        }, 50);
    });

    // Add the cursor class
    storyContainer.classList.add('typing');
    storyContainer.classList.remove('interactive');

    // 1. Setup or clear the choice container
    let choiceContainer = document.getElementById('choice-container');
    if (!choiceContainer) {
        choiceContainer = document.createElement('div');
        choiceContainer.id = 'choice-container';
    }
    storyContainer.parentNode.insertBefore(choiceContainer, storyContainer);
    choiceContainer.innerHTML = '';
    choiceContainer.style.top = '';
    choiceContainer.style.bottom = '';
    choiceContainer.style.transform = '';

    // 2. Handle choices: Create proxies in the center, keep originals hidden in place
    const links = storyContainer.querySelectorAll('tw-link');
    links.forEach(link => {
        // Create a visual copy for the center container
        const copy = document.createElement('tw-link');
        copy.innerHTML = link.innerHTML;
        copy.className = link.className;
        
        // When the copy is clicked, trigger the original link
        copy.addEventListener('click', (e) => {
            e.stopPropagation();
            link.click();
        });

        choiceContainer.appendChild(copy);

        // Hide the original link in place
        link.classList.add('original-link-hidden');
    });

    const textNodes = [];
    // Use a TreeWalker to find all text nodes while preserving HTML structure (b, i, links, etc.)
    // Filter out text nodes that are inside tw-link elements
    const walker = document.createTreeWalker(storyContainer, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
            let curr = node.parentNode;
            while (curr && curr !== storyContainer) {
                if (curr.tagName && curr.tagName.toLowerCase() === 'tw-link') {
                    return NodeFilter.FILTER_REJECT;
                }
                curr = curr.parentNode;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    }, false);
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

        // Reveal the choices
        const movedLinks = choiceContainer.querySelectorAll('tw-link');
        movedLinks.forEach(link => {
            link.style.opacity = '1';
            link.style.pointerEvents = 'auto';
        });

        // Inject the interactive arrow inline with the last text node
        const arrow = document.createElement('span');
        arrow.textContent = '▼';
        arrow.className = 'interactive-arrow';
        
        if (textNodes.length > 0) {
            const lastTextNode = textNodes[textNodes.length - 1].node;
            // Insert directly after the text node (inside its parent)
            if (lastTextNode.parentNode) {
                lastTextNode.parentNode.insertBefore(arrow, lastTextNode.nextSibling);
            }
        } else {
            storyContainer.appendChild(arrow);
        }

        // 1. Traverse up from the arrow to remove margins from all parent blocks
        let current = arrow.parentNode;
        while (current && current !== storyContainer) {
            current.style.marginBottom = '0';
            current.style.paddingBottom = '0';
            current = current.parentNode;
        }

        // 2. Hide EVERYTHING that follows the arrow's container in the passage
        // Find the direct child of storyContainer that contains the arrow
        let rootBlock = arrow;
        while (rootBlock.parentNode && rootBlock.parentNode !== storyContainer) {
            rootBlock = rootBlock.parentNode;
        }

        let nextSibling = rootBlock.nextSibling;
        while (nextSibling) {
            if (nextSibling.nodeType === 1) { // Element node
                nextSibling.style.display = 'none';
            } else if (nextSibling.nodeType === 3) { // Text node
                nextSibling.textContent = '';
            }
            nextSibling = nextSibling.nextSibling;
        }
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