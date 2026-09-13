const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [__dirname]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]
config.resolver.useWatchman = false

module.exports = config
