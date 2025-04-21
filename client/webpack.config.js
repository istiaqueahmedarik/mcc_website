module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve.fallback = {
                fs: false,
                process: false,
                path: false,
            };
            return webpackConfig;
        },
    },
    resolve: {
        mainFields: ['browser', 'module', 'main'],
    },
};