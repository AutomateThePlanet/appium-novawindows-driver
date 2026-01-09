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
