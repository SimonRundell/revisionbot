/****************************************************************************
 * genericModalA11y
 *
 * Keyboard/focus behaviour for the plain `.modal` / `.modal-content` / `.close`
 * dialog pattern used throughout the admin screens (adminManager.jsx,
 * adminSubjects.jsx, SchoolManager.jsx — 20+ separate conditionally-rendered
 * modals). They are plain divs, not one shared React component, so instead of
 * hand-wiring a focus trap into every call site this observes the DOM
 * directly: whichever `.modal` is present gets dialog semantics, is focused
 * on open, traps Tab navigation, closes on Escape (by clicking its `.close`
 * control), and returns focus to whatever opened it when it's removed.
 *
 * Does not apply to the dedicated React-driven modals in StudentInterface.jsx
 * / PastAnswersViewer.jsx (already handled directly) or to antd's own Modal
 * component (already accessible out of the box).
 *
 * Call initGenericModalA11y() once; it returns a cleanup function.
 ****************************************************************************/

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function initGenericModalA11y() {
    let activeModal = null;
    let previouslyFocused = null;

    const handleKeyDown = (event) => {
        if (!activeModal) {
            return;
        }

        if (event.key === 'Escape') {
            activeModal.querySelector('.close')?.click();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const content = activeModal.querySelector('.modal-content') || activeModal;
        const focusable = Array.from(content.querySelectorAll(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) {
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const handleMutation = () => {
        const modal = document.querySelector('.modal');

        if (modal && modal !== activeModal) {
            activeModal = modal;
            previouslyFocused = document.activeElement;

            const content = modal.querySelector('.modal-content');
            if (content) {
                if (!content.hasAttribute('role')) {
                    content.setAttribute('role', 'dialog');
                }
                content.setAttribute('aria-modal', 'true');
                if (!content.hasAttribute('tabindex')) {
                    content.setAttribute('tabindex', '-1');
                }
                if (!content.hasAttribute('aria-label') && !content.hasAttribute('aria-labelledby')) {
                    const heading = content.querySelector('h1, h2, h3');
                    if (heading?.textContent?.trim()) {
                        content.setAttribute('aria-label', heading.textContent.trim());
                    }
                }
                content.focus();
            }
        } else if (!modal && activeModal) {
            activeModal = null;
            previouslyFocused?.focus?.();
            previouslyFocused = null;
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    const observer = new MutationObserver(handleMutation);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
        document.removeEventListener('keydown', handleKeyDown);
        observer.disconnect();
    };
}
