const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver dynamic import() do @supabase/supabase-js no Hermes
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
