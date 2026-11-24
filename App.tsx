import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Game from './src/Game';
import { hydrate, initMatch, setSaveHook } from './src/engineTypes';

const BG = '#0b1a14';
// The game save (chips, unlocks, stats). Same key and JSON as earlier versions, so an update keeps every chip.
const SAVE_KEY = 'twist21.save';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SAVE_KEY)
      .catch(() => null)
      .then((raw) => {
        if (!alive) return;
        if (raw) hydrate(raw);
        // Only start writing after the stored save has been read, so a fresh default never overwrites it.
        setSaveHook((json) => { AsyncStorage.setItem(SAVE_KEY, json).catch(() => {}); });
        initMatch();
        setReady(true);
      });
    return () => { alive = false; };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {ready ? <Game /> : <View style={styles.center}><ActivityIndicator color="#e8c46a" /></View>}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
});
