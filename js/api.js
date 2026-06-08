const API = {
    RAWG_KEY: '42f1b64493f04c3cbd4297611f594f03',
    CHEAPSHARK_BASE: 'https://www.cheapshark.com/api/1.0',
    RAWG_BASE: 'https://api.rawg.io/api',
    
    cache: new Map(),

    // Fetch Deals from CheapShark
    async getDeals(params = {}) {
        try {
            const query = new URLSearchParams({
                onSale: 1,
                ...params
            }).toString();
            
            if (this.cache.has(query)) return this.cache.get(query);

            const response = await fetch(`${this.CHEAPSHARK_BASE}/deals?${query}`);
            if (!response.ok) throw new Error('Failed to fetch deals');
            const data = await response.json();
            this.cache.set(query, data);
            return data;
        } catch (error) {
            console.error('Error fetching deals:', error);
            return [];
        }
    },

    // Search games by title (better for autocomplete)
    async searchGames(title) {
        try {
            const query = new URLSearchParams({ title, limit: 10 }).toString();
            if (this.cache.has('search_' + query)) return this.cache.get('search_' + query);

            const response = await fetch(`${this.CHEAPSHARK_BASE}/games?${query}`);
            if (!response.ok) throw new Error('Failed to search games');
            const data = await response.json();
            this.cache.set('search_' + query, data);
            return data;
        } catch (error) {
            console.error('Error searching games:', error);
            return [];
        }
    },

    // Fuzzy Search games by title using RAWG (handles typos perfectly)
    async searchGamesRawg(title) {
        try {
            const cleanName = title.replace(/[^a-zA-Z0-9 А-Яа-я]/gi, " ");
            const query = new URLSearchParams({ key: this.RAWG_KEY, search: cleanName, page_size: 5 }).toString();
            if (this.cache.has('rawg_search_' + query)) return this.cache.get('rawg_search_' + query);

            const response = await fetch(`${this.RAWG_BASE}/games?${query}`);
            if (!response.ok) throw new Error('Failed to search games RAWG');
            const data = await response.json();
            this.cache.set('rawg_search_' + query, data.results || []);
            return data.results || [];
        } catch (error) {
            console.error('Error searching games RAWG:', error);
            return [];
        }
    },

    // Fetch details from RAWG
    async getRawgDetails(gameName) {
        try {
            const cleanName = gameName.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").slice(0,3).join(" ");
            if (this.cache.has('rawg_' + cleanName)) return this.cache.get('rawg_' + cleanName);

            const searchRes = await fetch(`${this.RAWG_BASE}/games?key=${this.RAWG_KEY}&search=${encodeURIComponent(cleanName)}&page_size=1`);
            if (!searchRes.ok) return null;
            const searchData = await searchRes.json();
            
            if (searchData.results && searchData.results.length > 0) {
                const game = searchData.results[0];
                let description = 'Описание временно недоступно.';
                
                try {
                    const detailRes = await fetch(`${this.RAWG_BASE}/games/${game.id}?key=${this.RAWG_KEY}`);
                    if (detailRes.ok) {
                        const detailData = await detailRes.json();
                        description = detailData.description_raw || 'Описание недоступно.';
                        // Limit description length to a reasonable size
                        if (description.length > 600) {
                            description = description.substring(0, 600) + '...';
                        }
                    }
                } catch (e) {
                    // Ignore detail fetch error
                }
                
                let gameplayImg = game.background_image;
                if (game.short_screenshots && game.short_screenshots.length > 1) {
                    gameplayImg = game.short_screenshots[1].image;
                }

                const result = {
                    background: game.background_image,
                    gameplay: gameplayImg,
                    description: description,
                    screenshots: game.short_screenshots
                };
                this.cache.set('rawg_' + cleanName, result);
                return result;
            }
            return null;
        } catch (error) {
            console.warn('RAWG error:', error);
            return null;
        }
    },

    // Fetch Stores
    async getStores() {
        try {
            if (this.cache.has('stores')) return this.cache.get('stores');
            const response = await fetch(`${this.CHEAPSHARK_BASE}/stores`);
            if (!response.ok) throw new Error('Failed to fetch stores');
            const data = await response.json();
            this.cache.set('stores', data);
            return data;
        } catch (error) {
            console.error('Error fetching stores:', error);
            return [];
        }
    }
};
