import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import { GAME_BASE_URL } from './src/config';
import Paywall from './src/Paywall';
import { useChipsStore } from './src/useChipsStore';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#100e26';

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const store = useChipsStore();

  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);

  // Chips Pass (or the old one-time Premium) unlocks the full deck in the game.
  useEffect(() => {
    if (loaded) run(`window.T21 && window.T21.setPremium(${store.hasPass})`);
  }, [loaded, store.hasPass]);

  useEffect(() => {
    if (loaded && store.ready) run(`window.T21 && window.T21.setChips && window.T21.setChips(${store.wallet.chips})`);
  }, [loaded, store.ready, store.wallet.chips]);

  useEffect(() => {
    if (loaded && store.ready)
      run(`window.T21 && window.T21.setDaily && window.T21.setDaily(${store.daily.streakDay}, ${store.daily.tomorrow})`);
  }, [loaded, store.ready, store.daily.streakDay, store.daily.tomorrow]);

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { type?: string; url?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
    } else if (msg.type === 'paywall' || msg.type === 'manage' || msg.type === 'purchase') {
      setPaywall(true);
    } else if (msg.type === 'restore') {
      void store.restore();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        source={{ html: gameHtml, baseUrl: GAME_BASE_URL }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        onLoadEnd={() => setLoaded(true)}
        onShouldStartLoadWithRequest={(req: { url: string }) => {
          // Keep the game in the WebView; anything else opens in the system browser.
          if (req.url === 'about:blank' || req.url.startsWith(GAME_BASE_URL)) return true;
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
      <Paywall visible={paywall} onClose={() => setPaywall(false)} store={store} />
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
