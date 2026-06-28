export function isHotkey(e: React.KeyboardEvent | KeyboardEvent, hotkeys: string | string[]): boolean {
    const hotkeyArray = Array.isArray(hotkeys) ? hotkeys : [hotkeys];
    
    return hotkeyArray.some(hotkey => {
        // Quick special-case: raw ' ' or 'Space' strings should match the spacebar
        if (hotkey === ' ' || hotkey.toLowerCase() === 'space') {
            return e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space';
        }

        const parts = hotkey.split('+').map(p => p.trim());
        const expectedKey = parts[parts.length - 1];

        const requireMeta = parts.includes('Meta');
        const requireCtrl = parts.includes('Control');
        const requireAlt = parts.includes('Alt');
        const requireShift = parts.includes('Shift');

        // Check modifiers
        if (requireMeta !== e.metaKey) return false;
        if (requireCtrl !== e.ctrlKey) return false;
        if (requireAlt !== e.altKey) return false;
        
        if (requireShift !== e.shiftKey) {
            // Exception: if the hotkey definition doesn't explicitly require Shift,
            // but the user pressed Shift to produce the exact character (e.g., '?'), allow it.
            const isShiftCharacter = !requireShift && e.shiftKey && e.key === expectedKey && expectedKey.length === 1;
            if (!isShiftCharacter) {
                return false;
            }
        }

        // Space can also be written as 'Space' in composite hotkeys (e.g. 'Shift+Space')
        if (expectedKey.toLowerCase() === 'space' && (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space')) return true;

        // Digits with Shift produce characters like '!' on US keyboards, so use code for numeric hotkeys.
        if (/^[0-9]$/.test(expectedKey) && (e.code === `Digit${expectedKey}` || e.code === `Numpad${expectedKey}`)) {
            return true;
        }

        // Check exact key match (case insensitive for letters if it's a single char,
        // but exact match for things like ArrowUp, Escape)
        return e.key.toLowerCase() === expectedKey.toLowerCase() || e.key === expectedKey;
    });
}
