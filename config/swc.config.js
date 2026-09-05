// config/swc.config.js
// This file is merged with Shakapacker's default SWC configuration
// See: https://swc.rs/docs/configuration/compilation

module.exports = {
  options: {
    jsc: {
      // CRITICAL for Stimulus compatibility: Prevents SWC from mangling class names
      keepClassNames: true,
      transform: {
        react: {
          runtime: "automatic"
        }
      }
    }
  }
}
