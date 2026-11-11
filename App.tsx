import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView as RNWebView, WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './src/gameHtml';
import { GAME_BASE_URL } from './src/config';
import {
  getCustomerInfo,
  getPremiumPackage,
  hasPremium,
  initPurchases,
  onCustomerInfo,
  purchase,
  restore,
} from './src/purchases';
import { setCustomAttributes } from './src/revenuecat';

// react-native-webview 14 ships props typings that collapse to `never` under React 19 types.
const WebView = RNWebView as unknown as React.ComponentType<any>;
const BG = '#100e26';

function Game() {
  const insets = useSafeAreaInsets();
  const web = useRef<{ injectJavaScript: (js: string) => void } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const run = (js: string) => web.current?.injectJavaScript(`${js}; true;`);
  const pushPremium = (on: boolean) => run(`window.T21 && window.T21.setPremium(${on})`);
  const pushPrice = (price: string) => run(`window.T21 && window.T21.setPrice(${JSON.stringify(price)})`);

  const sync = useCallback(async () => {
    if (!initPurchases()) return;
    if (hasPremium(await getCustomerInfo())) pushPremium(true);
    const pkg = await getPremiumPackage();
    if (pkg) pushPrice(pkg.product.priceString);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    sync();
    return onCustomerInfo((info) => pushPremium(hasPremium(info)));
  }, [loaded, sync]);

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: { type?: string; url?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'link' && typeof msg.url === 'string' && msg.url.startsWith('https://')) {
      Linking.openURL(msg.url);
    } else if (msg.type === 'purchase') {
      if (!initPurchases()) {
        Alert.alert('Purchases unavailable', 'Store purchases are not set up in this build.');
        return;
      }
      setCustomAttributes({ last_paywall_source: 'game_paywall', last_paywall_at: new Date().toISOString() });
      const pkg = await getPremiumPackage();
      if (!pkg) {
        Alert.alert('Premium unavailable', 'Premium cannot be loaded right now. Please try again in a moment.');
        return;
      }
      try {
        if (await purchase(pkg)) pushPremium(true);
      } catch (err: any) {
        Alert.alert('Purchase failed', err?.message ?? 'Please try again.');
      }
    } else if (msg.type === 'restore') {
      if (!initPurchases()) return;
      try {
        if (await restore()) pushPremium(true);
        else Alert.alert('Nothing to restore', 'No earlier Premium purchase was found for this store account.');
      } catch (err: any) {
        Alert.alert('Restore failed', err?.message ?? 'Please try again.');
      }
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
