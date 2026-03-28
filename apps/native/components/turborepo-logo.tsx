import TurborepoDarkWordmark from '../assets/turborepo-dark.svg';
import TurborepoLightWordmark from '../assets/turborepo-light.svg';

/**
 * Matches web: dark theme uses the light wordmark, light theme uses dark wordmark.
 */
type TurborepoLogoProps = {
  isDarkMode: boolean;
};

export function TurborepoLogo({ isDarkMode }: TurborepoLogoProps) {
  if (isDarkMode) {
    return <TurborepoLightWordmark width={180} height={38} />;
  }

  return <TurborepoDarkWordmark width={180} height={38} />;
}
