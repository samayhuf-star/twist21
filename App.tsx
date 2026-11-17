import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import { buyPack, initPurchases, loadOffers, restore, showChipPaywall } from './src/purchases';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#0b2a1c';

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);
  const grant = (id: string) => run(`window.T21 && window.T21.grantPack(${JSON.stringify(id)})`);

  useEffect(() => {
    if (!loaded) return;
    const ready = initPurchases();
    if (!ready) {
      run('window.T21 && window.T21.setStoreReady(false)');
      return;
    }
    loadOffers()
      .then((offers) => {
        run(`window.T21 && window.T21.setOffers(${JSON.stringify(offers)})`);
      })
      .catch(() => run('window.T21 && window.T21.setStoreReady(false)'));
  }, [loaded]);

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: { type?: string; url?: string; id?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
      return;
    }
    if (msg.type === 'buy' && typeof msg.id === 'string') {
      const r = await buyPack(msg.id);
      if (r.ok) grant(r.id);
      else if (!r.cancelled) Alert.alert('Purchase failed', r.message ?? 'Please try again.');
      return;
    }
    if (msg.type === 'paywall') {
      try {
        await showChipPaywall(grant);
      } catch (err) {
        Alert.alert('Chip packs', err instanceof Error ? err.message : 'Please try again.');
      }
      return;
    }
    if (msg.type === 'restore') {
      try {
        await restore();
        Alert.alert('Restore complete', 'Chip packs are consumable, so they are not restored. Your saved chips stay on this device.');
      } catch (err) {
        Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
      }
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        source={{ html: gameHtml }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoaded(true)}
        onShouldStartLoadWithRequest={(req: { url: string }) => {
          if (req.url === 'about:blank') return true;
          if (req.url.startsWith('https://')) Linking.openURL(req.url);
          return false;
        }}
        onMessage={onMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#ffd23f" />
          </View>
        )}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
  loading: { ...StyleSheet.absoluteFill, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
});
