import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'BluEduca - App dos Pais',
        short_name: 'BluEduca',
        description: 'Acompanhamento escolar simplificado para pais e responsáveis.',
        start_url: '/home',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5', // Brand 600
        icons: [
            {
                src: '/icon-lumira.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-lumira.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
