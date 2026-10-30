module.exports = (api) => {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Drizzle migrations (packages/db/drizzle/*.sql) are bundled as strings.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
