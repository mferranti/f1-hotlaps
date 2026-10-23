const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

function withPip(config) {
  config = withInfoPlist(config, (mod) => {
    const modes = new Set(mod.modResults.UIBackgroundModes ?? []);
    modes.add("audio");
    mod.modResults.UIBackgroundModes = [...modes];
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    for (const activity of app?.activity ?? []) {
      if (!activity.$) continue;
      activity.$["android:supportsPictureInPicture"] = "true";
      const existing = activity.$["android:configChanges"] ?? "";
      const needed = ["screenSize", "smallestScreenSize", "screenLayout", "orientation"];
      activity.$["android:configChanges"] = [...new Set([...existing.split("|").filter(Boolean), ...needed])].join(
        "|",
      );
    }
    return mod;
  });
}

module.exports = withPip;
