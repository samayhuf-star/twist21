import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import { buyPack, initPurchases, loadOffers, restore, showChipPaywall } from './src/purchases';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#0b2a1c';
// Native copy of the game save (chips, unlocks, stats). The WebView's own storage is not guaranteed to
// survive between launches for inline HTML, and bought chips must never be lost.
const SAVE_KEY = 'twist21.save';
const MAX_SAVE_CHARS = 200_000;

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);
  // undefined = still reading the native save; null = none stored
  const [saved, setSaved] = useState<string | null | undefined>(undefined);
  const buying = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(SAVE_KEY)
      .then((v) => setSaved(v))
      .catch(() => setSaved(null));
  }, []);

  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);
  const grant = (id: string) => run(`window.T21 && window.T21.grantPack(${JSON.stringify(id)})`);

  useEffect(() => {
    if (!loaded) return;
    // Fallback in case the save could not be injected before the game script ran. No-op when not newer.
    if (saved) run(`window.T21 && window.T21.hydrate(${JSON.stringify(saved)})`);
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
    let msg: { type?: string; url?: string; id?: string; data?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
      return;
    }
    if (msg.type === 'save' && typeof msg.data === 'string' && msg.data.length <= MAX_SAVE_CHARS) {
      AsyncStorage.setItem(SAVE_KEY, msg.data).catch(() => {});
      return;
    }
    if (msg.type === 'buy' && typeof msg.id === 'string') {
      if (buying.current) return; // one purchase at a time, a double tap must not charge twice
      buying.current = true;
      try {
        const r = await buyPack(msg.id);
        if (r.ok) grant(r.id);
        else if (!r.cancelled) Alert.alert('Purchase failed', r.message ?? 'Please try again.');
      } finally {
        buying.current = false;
        run('window.T21 && window.T21.buyDone()');
      }
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

  if (saved === undefined) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color="#ffd23f" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        source={{ html: gameHtml }}
        injectedJavaScriptBeforeContentLoaded={saved ? `window.__T21_SAVE__ = ${JSON.stringify(saved)}; true;` : 'true;'}
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
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { ...StyleSheet.absoluteFill, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
});
