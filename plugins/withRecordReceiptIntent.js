// Expo config plugin: compile native/ios/RecordReceiptIntent.swift into the
// iOS app target so the "Record in Kredits" App Intent is available to the
// Shortcuts app. Copies the file into ios/<Project>/ on prebuild and links it
// as a build source. No network, no entitlements needed.

const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');

const FILE = 'RecordReceiptIntent.swift';

const withRecordReceiptIntent = (config) => {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      const src = path.join(cfg.modRequest.projectRoot, 'native', 'ios', FILE);
      const dest = path.join(cfg.modRequest.platformProjectRoot, projectName, FILE);
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);
  config = withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const project = cfg.modResults;
    const filepath = `${projectName}/${FILE}`;
    if (!project.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project });
    }
    return cfg;
  });
  return config;
};

module.exports = withRecordReceiptIntent;
