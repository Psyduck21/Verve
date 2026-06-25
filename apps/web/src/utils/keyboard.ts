export function isHotkey(e: React.KeyboardEvent | KeyboardEvent, hotkeys: string | string[]): boolean {
    const hotkeyArray = Array.isArray(hotkeys) ? hotkeys : [hotkeys];
    
    return hotkeyArray.some(hotkey => {
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
        if (requireShift !== e.shiftKey) return false;

        // Spacebar is a special case
        if (expectedKey === ' ' && e.key === ' ') return true;

        // Check exact key match (case insensitive for letters if it's a single char, 
        // but exact match for things like ArrowUp, Escape)
        return e.key.toLowerCase() === expectedKey.toLowerCase() || e.key === expectedKey;
    });
}
