import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@dndmanager/shared',
    '@dndmanager/pf2e-engine',
    '@dndmanager/game-runtime',
    '@dndmanager/scene-framework',
    '@dndmanager/ai-services',
  ],
  webpack: (config) => {
    // Resolve .js imports to .ts files in workspace packages
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    }
    return config
  },
}

export default nextConfig
