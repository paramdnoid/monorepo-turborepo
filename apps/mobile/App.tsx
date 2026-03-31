import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { WEB_LOGIN_ORIGIN } from './lib/web-login-origin';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Text style={styles.hint}>
        Zentraler Login (Web): {WEB_LOGIN_ORIGIN}/login
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
