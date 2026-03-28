/**
 * Embeds the Next.js web app so the UI is literally the same as `@repo/ui` + Tailwind in the browser.
 * Requires `pnpm dev` (or at least the `web` dev server on port 3000).
 */
import '../global.css';

import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { cn } from '../lib/utils';
import { getWebAppUrl } from './config/web-app-url';

function getOrigin(url: string): string {
  const match = url.match(/^(https?:\/\/[^/]+)/i);
  return match ? match[1] : '';
}

export function WebShell() {
  const uri = getWebAppUrl();
  const isDarkMode = useColorScheme() === 'dark';
  const allowedOrigin = getOrigin(uri);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <SafeAreaProvider>
        <View
          className={cn(
            'flex-1 items-center justify-center bg-background px-6',
            isDarkMode && 'dark',
          )}
        >
          <Text className="mb-2 text-center text-base font-semibold text-foreground">
            {error}
          </Text>
          <Text className="mb-4 text-center text-xs text-muted-foreground">
            {uri}
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            Stelle sicher, dass im Repo-Root `pnpm dev` läuft und `web` auf Port
            3000 erreichbar ist. Auf einem echten Gerät setze
            `WEB_APP_HOST_OVERRIDE` in `src/config/web-app-url.ts`.
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View className={cn('flex-1 bg-background', isDarkMode && 'dark')}>
        {loading ? (
          <View
            style={styles.loader}
            className="items-center justify-center bg-background"
          >
            <ActivityIndicator
              size="large"
              color={isDarkMode ? '#f5f5f5' : '#171717'}
            />
            <Text className="mt-3 text-sm text-muted-foreground">
              Lade Next.js…
            </Text>
          </View>
        ) : null}
        <WebView
          source={{ uri }}
          style={styles.flex}
          originWhitelist={[allowedOrigin]}
          onShouldStartLoadWithRequest={request => {
            if (request.url === 'about:blank') {
              return true;
            }
            if (!allowedOrigin) {
              return false;
            }
            return (
              request.url === allowedOrigin ||
              request.url.startsWith(`${allowedOrigin}/`)
            );
          }}
          onLoadEnd={() => setLoading(false)}
          onHttpError={() => {
            setError('HTTP-Fehler beim Laden der Seite.');
            setLoading(false);
          }}
          onError={() => {
            setError('Next.js nicht erreichbar.');
            setLoading(false);
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
