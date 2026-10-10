/**
 * Libraries that declare a screen exported with no permission let any app on the phone
 * open it inside Yasante. The image cropper is one: it reads a source and writes an
 * output the caller chooses, with Yasante's own access. Yasante never opens these from
 * outside, so they're marked not exported, replacing the library's own setting when
 * the manifest merger combines them.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const ACTIVITIES = [
  // expo-image-picker's cropper library; Yasante uses ExpoCropImageActivity instead.
  'com.canhub.cropper.CropImageActivity',
  // Compose preview tooling, brought in by the dev client.
  'androidx.compose.ui.tooling.PreviewActivity',
];

module.exports = config =>
  withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const application = manifest.application[0];
    application.activity = (application.activity ?? []).filter(
      activity => !ACTIVITIES.includes(activity.$['android:name'])
    );
    for (const name of ACTIVITIES) {
      application.activity.push({
        $: { 'android:name': name, 'android:exported': 'false', 'tools:replace': 'android:exported' },
      });
    }
    return mod;
  });
