import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import * as path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		}
	},
	server: {
		host: '0.0.0.0',
		allowedHosts: ['finreal.ddns.net', 'localhost']
	}
});
