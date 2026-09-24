// Expo config plugin: drop the Push Notifications entitlement on iOS.
// NOTE: must be listed BEFORE expo-notifications in app.json — mods run in
// reverse registration order, so this needs to be registered first to run last.
//
// expo-notifications' plugin adds `aps-environment` to the entitlements so the
// app *could* receive remote pushes. Kredits is 100% offline and only ever
// schedules LOCAL notifications, so the capability is dead weight — and a
// personal (free) Apple team cannot sign an app that declares it. Removing it
// keeps the entitlements honest about what the app does and lets device builds
// sign with any team.

const { withEntitlementsPlist } = require('expo/config-plugins');

const withNoPushEntitlement = (config) => {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};

module.exports = withNoPushEntitlement;
