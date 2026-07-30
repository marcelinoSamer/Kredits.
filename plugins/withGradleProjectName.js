// Expo config plugin: sanitize the Gradle rootProject.name.
//
// The app's display name (expo.name) is "Kredits." — the brand mark ends in a
// gold period. Expo copies that verbatim into android/settings.gradle as
// `rootProject.name = 'Kredits.'`, but Gradle 9+ REJECTS project names that end
// in '.', so `./gradlew` fails at settings evaluation after every prebuild.
//
// This strips a trailing '.' from rootProject.name in settings.gradle ONLY.
// The on-device app name (android:label, from expo.name) is unchanged — users
// still see "Kredits." on the launcher.

const { withSettingsGradle } = require('expo/config-plugins');

const withGradleProjectName = (config) => {
  return withSettingsGradle(config, (cfg) => {
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /rootProject\.name\s*=\s*(['"])(.*?)\1/,
      (_match, quote, name) => {
        const cleaned = name.replace(/\.+$/, '') || 'app';
        return `rootProject.name = ${quote}${cleaned}${quote}`;
      }
    );
    return cfg;
  });
};

module.exports = withGradleProjectName;
