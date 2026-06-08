const Utils = {
    formatPrice: (price) => {
        const num = parseFloat(price);
        if (isNaN(num)) return '$0.00';
        return `$${num.toFixed(2)}`;
    },
    
    getStoreName: (storeID) => {
        const stores = {
            '1': 'Steam',
            '2': 'GamersGate',
            '3': 'GreenManGaming',
            '7': 'GOG',
            '8': 'Origin',
            '11': 'Humble Store',
            '13': 'Uplay',
            '15': 'Fanatical',
            '25': 'Epic Games',
        };
        return stores[storeID] || 'Store';
    },

    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
