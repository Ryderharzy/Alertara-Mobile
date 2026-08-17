module.exports = ({ config }) => {
  const plugins = new Set([...(config.plugins || []), 'expo-asset', 'expo-audio']);
  return {
    ...config,
    plugins: Array.from(plugins),
  };
};
