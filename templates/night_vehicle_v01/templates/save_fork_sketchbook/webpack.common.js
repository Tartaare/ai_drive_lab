const path = require('path');

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
    performance: {
        hints: false
    }
};
