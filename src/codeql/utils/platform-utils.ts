// If there are imports from utils, update them to ../../utils/...
import process from 'node:process';

export function getPlatformIdentifier(): string {
  // eslint-disable-next-line ts/switch-exhaustiveness-check
  switch (process.platform) {
    case 'darwin':
      return 'osx64';
    case 'win32':
      return 'win64';
    case 'linux':
    default:
      return 'linux64';
  }
}
