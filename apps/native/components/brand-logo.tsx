import brandLogo from '@repo/brand/logo';
import { Image } from 'react-native';

const SIZE = 120;

export function BrandLogo() {
  return (
    <Image
      accessibilityLabel="App logo"
      resizeMode="contain"
      source={brandLogo}
      style={{ width: SIZE, height: SIZE }}
    />
  );
}
