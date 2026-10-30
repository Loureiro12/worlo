// Monorepo resolution is configured automatically by expo/metro-config.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql');

module.exports = config;
