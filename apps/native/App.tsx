/**
 * @format
 */

import { USE_WEBVIEW } from './src/config/features';
import { NativeTurborepoApp } from './src/NativeTurborepoApp';
import { WebShell } from './src/WebShell';

export default function App() {
  return USE_WEBVIEW ? <WebShell /> : <NativeTurborepoApp />;
}
