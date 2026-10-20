import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', strict: true }),
		// GitHub Pages serves the project site under /barry_harris_scale_painter; dev and plain builds stay at /.
		paths: { base: process.env.BASE_PATH ?? '' }
	}
};

export default config;
