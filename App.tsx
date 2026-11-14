import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import { usePremiumPurchases } from './src/purchases';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#100e26';

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const iap = usePremiumPurchases();

  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);
  const pushPremium = (on: boolean) => run(`window.T21 && window.T21.setPremium(${on})`);
  const pushPrice = (price: string) => run(`window.T21 && window.T21.setPrice(${JSON.stringify(price)})`);

  useEffect(() => {
    if (!loaded) return;
    pushPremium(iap.owned);
    pushPrice(iap.price);
    run(`window.T21 && window.T21.setStoreReady(${iap.productReady})`);
  }, [loaded, iap.owned, iap.price, iap.productReady]);

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: { type?: string; url?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
      return;
    }
    if (msg.type === 'purchase') {
      const result = await iap.purchase();
      if (result.outcome === 'purchased') pushPremium(true);
      else if (result.outcome === 'unavailable') {
        Alert.alert(
          'Premium',
          'Twist 21 Premium could not be loaded from the App Store. Please try again in a moment.'
        );
      } else if (result.outcome === 'failed') {
        Alert.alert('Purchase failed', result.message ?? 'Please try again.');
      }
      return;
    }
    if (msg.type === 'restore') {
      try {
        if (await iap.restore()) pushPremium(true);
        else Alert.alert('Nothing to restore', 'No earlier Premium purchase was found for this store account.');
      } catch (err) {
        Alert.alert(
          'Restore failed',
          err instanceof Error ? err.message : 'Please try again.'
        );
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
