# Fix: Viveren Story drawer not opening

## Issue
When clicking "Viveren Story" section in the left panel, the right-side drawer does not open.

## Root Cause
The `handleSectionActivate` function in `aboutPageBuilder.jsx` checks for section keys like `'1971-about'` but the actual section key in `aboutPageBuilderData.js` is `'Viveren-Story'`. Since there's no matching condition for `'Viveren-Story'`, it falls through to the bottom where all drawers are closed.

## Fix Plan
1. ✅ Add a condition for `section.key === 'Viveren-Story'` in `handleSectionActivate` to open `isAboutStoryDrawerOpen` (same drawer as the 1971 story)
2. ~~Add a condition for `data.type` prefix check in `handlePreviewMessage` to handle the `Viveren-Story` section if needed from the preview side~~ (not required - preview side uses old message type)

## Status: ✅ COMPLETED

