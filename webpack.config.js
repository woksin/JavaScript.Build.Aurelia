const path = require('path');
const fs = require('fs');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const { AureliaPlugin, ModuleDependenciesPlugin } = require('aurelia-webpack-plugin');
const { ProvidePlugin } = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const ensureArray = (config) => config && (Array.isArray(config) ? config : [config]) || [];
const when = (condition, config, negativeConfig) => condition ? ensureArray(config) : ensureArray(negativeConfig);

const title = '';
const rootDir = process.cwd();
const outDir = path.resolve('./wwwroot');
const baseUrl = '/';

const componentDir = './Components';
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
let featureDir = './Features';
let componentDir = './Components';

if( !fs.existsSync(path.resolve(featureDir)) ) {
    featureDir = './features';
}

if( !fs.existsSync(path.resolve(componentDir)) ) {
    componentDir = './components';
}

module.exports = ({ production, server, extractCss, coverage, analyze } = {}) => ({
    resolve: {
        extensions: ['.js'],
        modules: [featureDir, componentDir, 'node_modules']
    },

    entry: {
        app: ['aurelia-bootstrapper'],
        vendor: ['bluebird']
    },

    mode: production ? 'production' : 'development',
    devtool: production ? 'nosources-source-map' : 'nosources-source-map', //cheap-module-eval-source-map',

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
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
                issuer: /\.[tj]s$/i
            },
            {
                test: /\.scss$/,
                use: ['css-loader', 'sass-loader'],
                issuer: /\.html?$/i
            },
            { test: /\.html$/i, loader: 'html-loader' },
            {
                test: /\.js$/i, loader: 'babel-loader', exclude: nodeModulesDir,
                options: coverage ? { sourceMap: 'inline', plugins: ['istanbul'] } : {}
            },
            { test: /\.json$/i, loader: 'json-loader' },
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
        new CleanWebpackPlugin([outDir], { root: rootDir }),
        new AureliaPlugin(),
        new ProvidePlugin({
            'Promise': 'bluebird'
        }),
        new ModuleDependenciesPlugin({
            'aurelia-testing': ['./compile-spy', './view-spy']
        }),
        new HtmlWebpackPlugin({
            template: 'index.ejs',
            minify: production ? {
                removeComments: true,
                collapseWhitespace: true
            } : undefined,
            metadata: {
                // available in index.ejs //
                title, server, baseUrl
            }
        }),
        ...when(extractCss, new ExtractTextPlugin({
            filename: production ? '[contenthash].css' : '[id].css',
            allChunks: true
        })),
        ...when(production, new CopyWebpackPlugin([
            { from: 'static/favicon.ico', to: 'favicon.ico' }])),
        ...when(analyze, new BundleAnalyzerPlugin()),
        
    ]
});