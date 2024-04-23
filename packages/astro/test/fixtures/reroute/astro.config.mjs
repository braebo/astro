import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	experimental: {
		rerouting: true
	},
	site: "https://example.com"
});