## [1.4.0-preview.5](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.4.0-preview.4...v1.4.0-preview.5) (2026-04-14)

### Features

* making screen recorder ffmpeg auto-downloadable and updated webview capability names ([095b2af](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/095b2af7d5a85dd757e92d5666d19ed2a20699b3))

### Bug Fixes

* changed logic of attaching the root window not working on some machines ([ee12870](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/ee12870d4f83a1b830c18b65f9dc1a7493825f96))
* **webview:** fix current webview not being set ([a08f775](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a08f775f935b90660e1229c1ed294822a93a024e))
* **webview:** fix error when no webview endpoint is available ([c15567c](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/c15567c6d06db5b1581afd441c1a1eb7887ee1b8))

## [1.4.0-preview.4](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.4.0-preview.3...v1.4.0-preview.4) (2026-04-09)

### Bug Fixes

* **debug:** changed logic for finding window on app launch ([00edf24](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/00edf24d751672123eec0cb6db0b3c34a4bfd51c))

## [1.4.0-preview.3](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.4.0-preview.2...v1.4.0-preview.3) (2026-04-02)

### Bug Fixes

* fixed port cdpRequest issue ([37b9291](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/37b9291369c30ff2a39f7618d5d20d3b9725d9a0))

## [1.4.0-preview.2](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.4.0-preview.1...v1.4.0-preview.2) (2026-04-02)

### Bug Fixes

* debug cdp json issue ([fe3f762](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/fe3f762ae666fc9de5158f03c2b7c9acb62c52c0))

## [1.4.0-preview.1](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.3.1...v1.4.0-preview.1) (2026-04-02)

### Features

* **webview:** enable WebView2 support ([644034f](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/644034f866efcca48b87e0344b88d34f4471f608))

### Miscellaneous Chores

* **release:** 1.2.0-preview.1 [skip ci] ([f9cb5c5](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/f9cb5c5c8e7e88b7929171fe39c59635b721f4de))
* **release:** 1.2.0-preview.2 [skip ci] ([6ad9bdb](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6ad9bdbdbe26cb5c7f881a8e1e80f064dfc6863b))

## [1.3.1](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.3.0...v1.3.1) (2026-03-09)

### Bug Fixes

* add stderr encoding for PowerShell session ([a233063](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a233063b4509e41c047fcc3603b29b944c5ac374))
* fixed incorrect $pattern variable reference ([a0afceb](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a0afceb7e682219b5e82759c52e20c59bff1225f))
* fixed not being able to attach to slow-starting classic apps on session creation ([f25b000](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/f25b000533be1ef2a7c0bc350bf62a3cd1b60a45))

## [1.3.0](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.2.0...v1.3.0) (2026-03-06)

### Features

* **commands:** add extra W3C commands ([57c654a](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/57c654a1e1e43c8a5d31ed8103aba338883efaa9))
* **commands:** add support for close app and launch app ([26db919](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/26db919c17ce74ff3c5ef2776544affecb32e2fc))
* **commands:** implement waitForAppLaunch and forceQuit ([6cce956](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6cce9565ce51b9f0e354b14819f41a6fc39ffc50))
* **tests:** add unit tests and missing commands - recording, deletion and click and drag ([a8989c0](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a8989c06816b3f9b5b5de82d85895106ab062aca))

### Bug Fixes

* Bind commands to this instance (not prototype) so each driver instance uses its own powershell session ([#56](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/56)) [skip ci] ([6dc2125](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6dc2125c505b392f100036d532326202c0a9c8d4))
* **capability:** fix post run script ([97b57af](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/97b57af2fe05803ecb66548b8a32202fbe9a45e6))
* **commands:** add allow-insecure check for fs operations ([4662035](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/466203585796fe08fdb4b119991363246cb00dab))
* **commands:** match closeApp and launchApp implementation with appium windows driver ([073c566](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/073c566edb3528380196640eb33ee803b4fe2029))
* fix bugs and implemented end to end tests ([47efa4c](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/47efa4cf00fbac2e15e07e572cdf3e4453ec1020))
* lint ([fb6ebc8](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/fb6ebc83b1ed5c0fd0c5230d2948d4f5cb156b17))
* **lint:** lint ([acf7271](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/acf727179dfe1380d42a33a6d38f5175b22cb90d))
* **recorder:** fix screen recording ([9da1025](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/9da1025c994cb0c3221119690f01a0584b3cf333))
* **recorder:** validate outputPath before rimraf ([8aa49dd](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/8aa49dd27b2b9bb54329efa0555bb5ef21dc36b5))

### Miscellaneous Chores

* **release:** 1.3.0 [skip ci] ([c29b822](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/c29b8223fc6f0435363d6207af0ab1185b811b60))

## [1.3.0](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.2.0...v1.3.0) (2026-03-06)

### Features

* **commands:** add extra W3C commands ([57c654a](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/57c654a1e1e43c8a5d31ed8103aba338883efaa9))
* **commands:** add support for close app and launch app ([26db919](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/26db919c17ce74ff3c5ef2776544affecb32e2fc))
* **commands:** implement waitForAppLaunch and forceQuit ([6cce956](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6cce9565ce51b9f0e354b14819f41a6fc39ffc50))
* **tests:** add unit tests and missing commands - recording, deletion and click and drag ([a8989c0](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a8989c06816b3f9b5b5de82d85895106ab062aca))

### Bug Fixes

* Bind commands to this instance (not prototype) so each driver instance uses its own powershell session ([#56](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/56)) [skip ci] ([6dc2125](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6dc2125c505b392f100036d532326202c0a9c8d4))
* **capability:** fix post run script ([97b57af](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/97b57af2fe05803ecb66548b8a32202fbe9a45e6))
* **commands:** add allow-insecure check for fs operations ([4662035](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/466203585796fe08fdb4b119991363246cb00dab))
* **commands:** match closeApp and launchApp implementation with appium windows driver ([073c566](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/073c566edb3528380196640eb33ee803b4fe2029))
* fix bugs and implemented end to end tests ([47efa4c](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/47efa4cf00fbac2e15e07e572cdf3e4453ec1020))
* lint ([fb6ebc8](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/fb6ebc83b1ed5c0fd0c5230d2948d4f5cb156b17))
* **lint:** lint ([acf7271](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/acf727179dfe1380d42a33a6d38f5175b22cb90d))
* **recorder:** fix screen recording ([9da1025](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/9da1025c994cb0c3221119690f01a0584b3cf333))
* **recorder:** validate outputPath before rimraf ([8aa49dd](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/8aa49dd27b2b9bb54329efa0555bb5ef21dc36b5))

## [1.2.0](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.1.0...v1.2.0) (2026-01-09)

### Features

* add "none" session option to start without attaching to any element ([22586a2](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/22586a237f20e975adee25c13fba8c649420574d))
* add appWorkingDir, prerun, postrun, and isolatedScriptExecution capabilities ([5a581ae](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/5a581ae7ae1e1a013cb8e332454f70762f8749c7))

### Bug Fixes

* allow elementId with optional x/y offsets for click/hover ([2d01246](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/2d01246e009e2c7fd67165fc1d313446870021d3))
* **deps:** downgrade appium peer dependency to 3.0.0-rc.2 ([98262d2](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/98262d297268cf40259946e4a52038103618f3b4))
* make modifierKeys case-insensitive ([7a05300](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/7a05300ef4a0792a9c1160dfab55537c96967f08))
* update ESLint config ([2e08f8d](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/2e08f8d5a1df9bf277b2c521584dddb5b0935e72))
* version bump ([a872a23](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a872a23fec5f10f692b9c61ba7f8d671f360211f))

### Miscellaneous Chores

* add extra logging ([5da452f](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/5da452fa71608d3f52a92c7ea6f82a78ff3139a6))
* bump peerDependency appium to ^3.1.0 ([cdee0ca](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/cdee0ca44a1423312351449b3227035976ba396f))
* configure semantic-release branches for stable and preview releases ([a4a1fa2](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a4a1fa2b0b20c4494919699e8d307793cf18dc04))
* remove unnecessary ESLint ignore comments ([4c70038](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/4c7003809c6b6668315ed7e036b5ee6cf3595e51))
* upgrade dependencies and devDependencies to latest versions ([4fd016c](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/4fd016c5adc091305974b3a41c22423cadf6e3ab))

## [1.1.0](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.0.1...v1.1.0) (2025-08-06)

### Features

* adding appArguments option ([#26](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/26)) ([ded917b](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/ded917bdf2f8d224cc9cf917958177ed0e97078b))

## [1.0.1](https://github.com/AutomateThePlanet/appium-novawindows-driver/compare/v1.0.0...v1.0.1) (2025-04-25)

### Bug Fixes

* fixed crash in Node 22+ by using Buffer instead of {} with EnumDisplaySettingsA ([#17](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/17)) ([08e4907](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/08e49070020f071f3983fcb00c30e9a3ae16b9dc))
* set shouldCloseApp's default value to true ([#18](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/18)) ([28dc1d4](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/28dc1d443d416e9a44f4ddcd2fb31828e0b92bcb))

### Code Refactoring

* remove unnecessary debug logging for name locator ([#19](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/19)) ([ad50be9](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/ad50be9f9b60145a2f203f294d326eb9499339fb))

## 1.0.0 (2025-04-23)

### Miscellaneous Chores

* add .gitignore ([631fa0a](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/631fa0a72f5cda861215ff4d98ccc41c44d357f6))
* adding eslint ([c05602d](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/c05602d1aaa7fa003394ec663302017a3027db82))
* **ci:** add semantic-release workflow ([a9c39fd](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/a9c39fdab2d361678445a523a2830ea9925c4f1f))
* **lint:** fix linting issue ([6c2cb42](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/6c2cb42388a7f51842a1a5bd11905a9fe0e86ce9))
* **npm:** disable package-lock generation ([5a648ac](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/5a648ac7f65fcfef66afd6bf76ce2188b10d4ce9))
* **package:** add keywords and repository info ([fa165d0](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/fa165d007f6a424c0f11340b59ac73e1185091d8))
* **release:** rollback version to 0.0.1 for testing ([#11](https://github.com/AutomateThePlanet/appium-novawindows-driver/issues/11)) ([c4dd2c2](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/c4dd2c21e3067f70a11d72206fbc7f5da79380b6))
* updated dependencies [skip ci] ([08528fb](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/08528fb06727df50c087940fe541730a2a13483f))

### Code Refactoring

* adding enums for click and updating ([89dcebf](https://github.com/AutomateThePlanet/appium-novawindows-driver/commit/89dcebfd026f7a68b4052f33fa2c928ba42162bf))
