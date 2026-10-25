/**
 * SkyStream Extension for FlyStream (with Anti-Scraping / Challenge Bypass)
 */

const FlyStream = {
    name: "FlyStream",
    description: "Stream movies, TV shows, and anime from flystream.net using native challenge rendering.",
    version: "1.0.0",
    icon: "https://flystream.net",
    baseUrl: "https://flystream.net",

    /**
     * Executes requests through SkyStream's challenge_browser context
     * to naturally render cookies, Cloudflare proofs, and JavaScript variables.
     */
    async fetchWithBypass(url) {
        try {
            // Uses SkyStream's native challenge engine instead of core http client
            const options = {
                method: "GET",
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                evaluateJs: "document.documentElement.outerHTML", // Returns the evaluated DOM tree
                waitForSelector: "body" // Ensures Javascript execution environments are ready
            };

            const response = await challengeBrowser.execute(url, options);
            if (!response || !response.result) {
                throw new Error("Challenge browser validation failed or timed out.");
            }
            return response.result;
        } catch (error) {
            console.error("Bypass Failure: ", error);
            return null;
        }
    },

    /**
     * Search for movies, TV shows, or anime
     */
    async search(query) {
        try {
            const searchUrl = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`;
            const htmlContent = await this.fetchWithBypass(searchUrl);
            
            if (!htmlContent) return [];
            
            // If the endpoint yields pure JSON text inside the page context
            const cleanJson = htmlContent.replace(/<[^>]*>/g, '').trim(); 
            const results = JSON.parse(cleanJson);
            
            return results.map(item => ({
                title: item.title || item.name,
                url: `${this.baseUrl}/${item.media_type || 'movie'}/${item.id}`,
                poster: item.poster_path ? `https://tmdb.org{item.poster_path}` : item.image,
                type: item.media_type === 'tv' ? 'tv' : 'movie'
            }));
        } catch (error) {
            console.error("FlyStream Search Error: ", error);
            return [];
        }
    },

    /**
     * Resolves stream sources for media selections
     */
    async getStreams(url) {
        try {
            const matches = url.match(/\/(movie|tv)\/([^/]+)/);
            if (!matches) return [];

            const [_, type, id] = matches;
            const providerUrl = `${this.baseUrl}/api/providers?id=${id}&type=${type}`;
            const htmlContent = await this.fetchWithBypass(providerUrl);

            if (!htmlContent) return [];

            const cleanJson = htmlContent.replace(/<[^>]*>/g, '').trim();
            const providerData = JSON.parse(cleanJson);
            const streams = [];

            if (providerData && providerData.sources) {
                providerData.sources.forEach(source => {
                    streams.push({
                        name: source.providerName || "FlyStream Secure Mirror",
                        url: source.url,
                        quality: source.quality || "Auto",
                        isM3U8: source.url.includes(".m3u8")
                    });
                });
            }

            return streams;
        } catch (error) {
            console.error("FlyStream Stream Extraction Error: ", error);
            return [];
        }
    }
};

// Register provider with SkyStream's JS engine runtime 
registerProvider(FlyStream);
