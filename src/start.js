

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development'
process.env.NODE_ENV = 'development'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err
})

// Ensure environment variables are read.
require('./config/env')

const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles')
const paths = require('./config/paths')
const config = require('./config')
// const { ensureDll } = require('./utils/createDll')

const useYarn = fs.existsSync(paths.yarnLockFile)
const isInteractive = process.stdout.isTTY

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, config.entry])) {
  process.exit(1)
}

// if (config.dev.dll.length > 0) {
//   ensureDll(() => {
//     start()
//   })
// } else {
//   start()
// }

start()

function createNotifierCallback() {
  const notifier = require('node-notifier')

  return (severity, errors) => {
    if (severity !== 'error') return

    const error = errors[0]
    const filename = error.file && error.file.split('!').pop()

    notifier.notify({
      title: config.name,
      message: `${severity}: ${error.name}`,
      subtitle: filename || '',
      icon: path.join(__dirname, '..', 'logo.png'),
    })
  }
}

function start() {
  const WebpackDevServer = require('webpack-dev-server')
  const clearConsole = require('react-dev-utils/clearConsole')
  const {
    choosePort,
    createCompiler,
    prepareProxy,
    prepareUrls,
  } = require('./utils/react-dev/WebpackDevServerUtils')
  const openBrowser = require('react-dev-utils/openBrowser')
  const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
  const webpackDevConfig = require('./config/webpack.config.dev')
  const createDevServerConfig = require('./config/webpackDevServer.config')

  // We attempt to use the default port but if it is busy, we offer the user to
  // run on a different port. `detect()` Promise resolves to the next free port.
  choosePort(config.dev.host, config.dev.port)
    .then((port) => {
      if (port == null) {
        // We have not found a port.
        return
      }
      const protocol = process.env.HTTPS === 'true' ? 'https' : 'http'
      const appName = config.name
      const urls = prepareUrls(protocol, config.dev.host, port)

      // Add FriendlyErrorsPlugin
      webpackDevConfig.plugins.push(new FriendlyErrorsPlugin({
        onErrors: config.dev.notifyOnErrors
          ? createNotifierCallback()
          : undefined,
      }))

      // Create a webpack compiler that is configured with custom messages.
      const compiler = createCompiler(webpack, webpackDevConfig, appName, urls, useYarn)
      // Load proxy config
      const proxySetting = config.dev.proxy
      const proxyConfig = prepareProxy(proxySetting, paths.appPublic)
      // Serve webpack assets generated by the compiler over a web sever.
      const serverConfig = createDevServerConfig(
        proxyConfig,
        urls.lanUrlForConfig,
      )

      const devServer = new WebpackDevServer(compiler, serverConfig)
      // Launch WebpackDevServer.
      devServer.listen(port, config.dev.host, (err) => {
        if (err) {
          return console.log(err)
        }
        if (isInteractive) {
          clearConsole()
        }
        console.log('Starting the development server...\n')
        openBrowser(urls.localUrlForBrowser)
      });

      ['SIGINT', 'SIGTERM'].forEach((sig) => {
        process.on(sig, () => {
          devServer.close()
          process.exit()
        })
      })
    })
    .catch((err) => {
      if (err && err.message) {
        console.log(err.message)
      }
      process.exit(1)
    })
}
