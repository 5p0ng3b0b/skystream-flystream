/**
 * SkyStream Extension for FlyStream (flystream.net)
 */

const FlyStream = {
    name: "FlyStream",
    description: "Stream movies, TV shows, and anime from flystream.net",
    version: "1.0.0",
    icon: "https://flystream.net", // Visual identifier fallback
    baseUrl: "https://flystream.net",

    /**
     * Search for movies, TV shows, or anime
     * @param {string} query - The search string
     * @returns {Promise<Array>} List of media objects
     */
    async search(query) {
        try {
            // URL encoding the query for the FlyStream API/search route
            const searchUrl = `${this.baseUrl}/api/search?q=${encodeURIComponent(query)}`;
            
            const response = await http.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': this.baseUrl
                }
            });

            if (!response || !response.body) return [];
            
            const results = JSON.parse(response.body);
            
            // Map the FlyStream response schema to SkyStream's expected layout
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
     * Resolves the actual video streams for a specific title
     * @param {string} url - The unique media URL generated in search
     * @returns {Promise<Array>} List of stream links with qualities
     */
    async getStreams(url) {
        try {
            // Extracts the internal media ID and type from the url
            const matches = url.match(/\/(movie|tv)\/([^/]+)/);
            if (!matches) return [];

            const [_, type, id] = matches;
            const providerUrl = `${this.baseUrl}/api/providers?id=${id}&type=${type}`;

            const response = await http.get(providerUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': url
                }
            });

            if (!response || !response.body) return [];

            const providerData = JSON.parse(response.body);
            const streams = [];

            // Iterate over FlyStream's third-party provider integrations
            if (providerData && providerData.sources) {
                providerData.sources.forEach(source => {
                    streams.push({
                        name: source.providerName || "FlyStream Mirror",
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

// Register the provider with SkyStream's plugin interface
registerProvider(FlyStream);
