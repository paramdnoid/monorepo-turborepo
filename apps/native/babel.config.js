module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    // Returns { plugins: [...] } from react-native-css — must be a preset, not a plugin
    'nativewind/babel',
  ],
  // Worklets/Reanimated: already included by nativewind/babel (react-native-css adds
  // react-native-worklets/plugin; reanimated/plugin is the same). Do not list again.
};
