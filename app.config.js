/**
 * app.json, plus what depends on the build's environment: Google sign-in is added
 * only when its iOS client id is set (EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in eas.json),
 * since its plugin needs the id to register the sign-in return address.
 */
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`;
  return {
    ...config,
    plugins: [...config.plugins, ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
  };
};
