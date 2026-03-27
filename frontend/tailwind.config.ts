import type { Config } from 'tailwindcss';

const config: Config = {
    content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                ink: '#10212c',
                mist: '#edf5fa',
                sea: '#0077a6',
                sand: '#f7efe6',
                coral: '#ef6f4d',
            },
            boxShadow: {
                soft: '0 12px 45px -15px rgba(16, 33, 44, 0.35)',
            },
        },
    },
    plugins: [],
};

export default config;
