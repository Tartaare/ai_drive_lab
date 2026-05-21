const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const fs = require('fs');

module.exports = {
    entry: {
        app: './src/ts/main.ts'
    },
    output: {
        filename: './build/simple_car.min.js',
        library: 'SimpleCar',
        libraryTarget: 'umd',
        path: path.resolve(__dirname)
    },
    resolve: {
        alias: {
          cannon: path.resolve(__dirname, './src/lib/cannon/cannon.js')
        },
        extensions: [ '.tsx', '.ts', '.js' ],
    },
    module: {
        rules: [
        {
            test: /\.tsx?$/,
            use: {
                loader: 'ts-loader',
                options: {
                    transpileOnly: true
                }
            },
            exclude: /node_modules/,
        }
      ]
    },
    plugins: [
        // Use the copy-webpack-plugin v5 format (array of patterns)
        // This project uses webpack@4 and copy-webpack-plugin@5, so the API expects an array
        new CopyWebpackPlugin([
            { from: 'textures', to: 'textures' },
            ...(fs.existsSync('race_tracks') ? [{ from: 'race_tracks', to: 'race_tracks' }] : [])
        ])
    ],
    performance: {
        hints: false
    }
};
