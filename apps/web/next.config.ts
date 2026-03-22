import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@dndmanager/shared',
    '@dndmanager/pf2e-engine',
    '@dndmanager/game-runtime',
    '@dndmanager/scene-framework',
    '@dndmanager/ai-services',
  ],
}

export default nextConfig
