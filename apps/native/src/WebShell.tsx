/**
 * Embeds the Next.js web app so the UI is literally the same as `@repo/ui` + Tailwind in the browser.
 * Requires `pnpm dev` (or at least the `web` dev server on port 3000).
 */
import '../global.css';

import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { getWebAppUrl } from './config/web-app-url';

export function WebShell() {
  const uri = getWebAppUrl();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{error}</Text>
          <Text style={styles.errorUrl}>{uri}</Text>
          <Text style={styles.hint}>
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
      <View style={styles.flex}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
            <Text style={styles.loaderText}>Lade Next.js…</Text>
          </View>
        ) : null}
        <WebView
          source={{ uri }}
          style={styles.flex}
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
          originWhitelist={['http://*', 'https://*']}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorUrl: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 16,
  },
  hint: {
    fontSize: 13,
    opacity: 0.75,
    textAlign: 'center',
    lineHeight: 20,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: '#fff',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
  },
});
