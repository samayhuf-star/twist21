import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import * as Haptics from 'expo-haptics';
import { useChipPurchases, type ChipGrant } from './src/purchases';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#100e26';

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);
  const granted = useRef(new Set<string>());
  const pending = useRef<{ grants?: ChipGrant[]; prices?: Record<string, string> }>({});

  const sendGrants = (grants: ChipGrant[]) =>
    grants.forEach((g) => {
      if (granted.current.has(g.txId)) return;
      granted.current.add(g.txId);
      run(`window.T21 && window.T21.chipsPurchased(${JSON.stringify(g.productId)}, ${JSON.stringify(g.txId)})`);
    });
  const sendPrices = (prices: Record<string, string>) =>
    run(`window.T21 && window.T21.setPackPrices(${JSON.stringify(prices)})`);

  const store = useChipPurchases(
    (grants) => (loaded ? sendGrants(grants) : (pending.current.grants = grants)),
    (prices) => (loaded ? sendPrices(prices) : (pending.current.prices = prices))
  );

  useEffect(() => {
    if (!loaded) return;
    if (pending.current.grants) sendGrants(pending.current.grants);
    if (pending.current.prices) sendPrices(pending.current.prices);
    pending.current = {};
  }, [loaded]);

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: { type?: string; url?: string; style?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
      return;
    }
    if (msg.type === 'haptic') {
      const map: Record<string, () => Promise<void>> = {
        light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
        success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      };
      void map[msg.style ?? '']?.();
      return;
    }
    if (msg.type === 'paywall') {
      const outcome = await store.showPaywall();
      if (outcome === 'unavailable') Alert.alert('Chips', 'Chip packs could not be loaded from the App Store. Please try again in a moment.');
      else if (outcome === 'failed') Alert.alert('Purchase failed', 'Please try again.');
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
          // The game is the bundled HTML. Anything else opens in the system browser.
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
