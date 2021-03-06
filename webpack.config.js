const path = require('path');
const fs = require('fs');

const babelConfigLoader = require('@dolittle/build/dist/babelConfigLoader').default;

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const { AureliaPlugin, ModuleDependenciesPlugin } = require('aurelia-webpack-plugin');
const { ProvidePlugin, WatchIgnorePlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const ensureArray = config => (config && (Array.isArray(config) ? config : [config])) || [];
const when = (condition, config, negativeConfig) => (condition ? ensureArray(config) : ensureArray(negativeConfig));

const title = process.env.DOLITTLE_WEB_TITLE || '';
const rootDir = process.env.DOLITTLE_WEBPACK_ROOT || process.cwd();
const outDir = process.env.DOLITTLE_WEBPACK_OUT || path.resolve('./wwwroot');
const baseUrl = process.env.DOLITTLE_WEBPACK_BASE_URL || '/';

const nodeModulesDir = path.resolve(__dirname, 'node_modules');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

let featureDir = process.env.DOLITTLE_FEATURES_DIR || './Features';
let componentDir = process.env.DOLITTLE_COMPONENT_DIR || './Components';

function pathExistsCaseSensitiveSync(filepath) {
    var dir = path.dirname(filepath);
    if (dir === '/' || dir === '.') return true;
    var filenames = fs.readdirSync(dir);
    if (filenames.indexOf(path.basename(filepath)) === -1) {
        return false;
    }
    return pathExistsCaseSensitiveSync(dir);
}

if (!pathExistsCaseSensitiveSync(path.resolve(featureDir))) {
    featureDir = './features';
}

if (!pathExistsCaseSensitiveSync(path.resolve(componentDir))) {
    componentDir = './components';
}

const babelConfig = babelConfigLoader(process.cwd());

module.exports = ({ production, server, extractCss, analyze } = {}) => ({
    resolve: {
        symlinks: false,
        extensions: ['.js'],
        modules: [path.resolve(featureDir), path.resolve(componentDir), 'node_modules'],
        mainFields: ['main', 'module']
    },

    entry: {
        app: ['aurelia-bootstrapper'],
        vendor: ['bluebird']
    },

    mode: production ? 'production' : 'development',
    devtool: production ? 'nosources-source-map' : 'cheap-module-eval-source-map',

    devServer: {
        historyApiFallback: true
    },

    output: {
        path: outDir,
        publicPath: baseUrl,
        filename: production ? '[name].[chunkhash].bundle.js' : '[name].[hash].bundle.js',
        sourceMapFilename: production ? '[name].[chunkhash].bundle.map' : '[name].[hash].bundle.map',
        chunkFilename: production ? '[name].[chunkhash].chunk.js' : '[name].[hash].chunk.js'
    },
    performance: { hints: false },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader'],
                issuer: /\.[tj]s$/i
            },
            {
                test: /\.css$/,
                use: ['css-loader'],
                issuer: /\.html?$/i
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: () => [require('autoprefixer')()]
                        }
                    },
                    'sass-loader'
                ],
                issuer: /\.[tj]s$/i
            },
            {
                test: /\.scss$/,
                use: [
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            plugins: () => [require('autoprefixer')()]
                        }
                    },
                    'sass-loader'
                ],
                issuer: /\.html?$/i
            },
            { test: /\.html$/i, loader: 'html-loader' },
            {
                test: /\.js$/i, 
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                options: babelConfig
            },
            // use Bluebird as the global Promise implementation:
            { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
            // embed small images and fonts as Data Urls and larger ones as files:
            { test: /\.(png|gif|jpg|cur)$/i, loader: 'url-loader', options: { limit: 8192 } },
            { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2' } },
            { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
            // load these fonts normally, as files:
            { test: /\.(ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'file-loader' }
        ]
    },

    plugins: [
        new CleanWebpackPlugin([`${outDir}/**/*.*`], { root: rootDir }),
        new WatchIgnorePlugin(['**/for_*/*.js', '**/when_*/*.js', '**/specs/*.js']),
        new AureliaPlugin(),
        new ProvidePlugin({
            Promise: 'bluebird'
        }),
        new ModuleDependenciesPlugin({
            'aurelia-testing': ['./compile-spy', './view-spy']
        }),
        new HtmlWebpackPlugin({
            template: 'index.ejs',
            minify: production
                ? {
                      removeComments: true,
                      collapseWhitespace: true
                  }
                : undefined,
            metadata: {
                // available in index.ejs //
                title,
                server,
                baseUrl
            }
        }),
        ...when(
            extractCss,
            new ExtractTextPlugin({
                filename: production ? '[contenthash].css' : '[id].css',
                allChunks: true
            })
        ),

        /*
        ...when(production, new CopyWebpackPlugin([
            { from: 'static/favicon.ico', to: 'favicon.ico' }])),*/

        ...when(analyze, new BundleAnalyzerPlugin())
    ]
});
