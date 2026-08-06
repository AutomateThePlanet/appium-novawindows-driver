import releaseConfig from '@appium/semantic-release-config';

export default releaseConfig({
  branches: ['main', {name: 'develop', prerelease: 'preview'}],
});
