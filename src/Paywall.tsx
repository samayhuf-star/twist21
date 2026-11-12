import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChipsStore } from './useChipsStore';
import { PRIVACY_URL, TERMS_URL } from './config';
import { PACK_CHIPS, PACK_IDS, PASS_MONTHLY_ID, PASS_YEARLY_ID } from './wallet';

const C = {
  ink: '#100e26', table: '#1a1840', edge: '#2f2c66', paper: '#f3eee4', gold: '#ffd23f',
  muted: '#a29fd0', mint: '#3ddc97', rose: '#ff4d6d',
};

const PLANS = [
  { id: PASS_YEARLY_ID, title: 'Yearly', period: 'per year, auto-renews', badge: 'Best value' },
  { id: PASS_MONTHLY_ID, title: 'Monthly', period: 'per month, auto-renews', badge: null },
] as const;

const PERKS = [
  'No ads',
  '2x daily chip bonus',
  '10,000 bonus chips every month',
  'All 9 action cards and unlimited matches',
];

const tap = () => void Haptics.selectionAsync().catch(() => undefined);

export default function Paywall({ visible, onClose, store }: { visible: boolean; onClose: () => void; store: ChipsStore }) {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<string>(PASS_YEARLY_ID);
  const [reduceMotion, setReduceMotion] = useState(false);
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!visible) return;
    store.setMessage(null);
    if (!store.passPricesLoaded || !store.packPricesLoaded) void store.refreshProducts();
    if (reduceMotion) rise.setValue(1);
    else {
      rise.setValue(0);
      Animated.spring(rise, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const last = useRef(store.lastCredit?.at ?? 0);
  useEffect(() => {
    if (store.lastCredit && store.lastCredit.at !== last.current) {
      last.current = store.lastCredit.at;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  }, [store.lastCredit]);

  const pricesMissing = !store.catalogBusy && (!store.passPricesLoaded || !store.packPricesLoaded);
  const planPrice = store.priceOf(plan);
  const anim = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };

  return (
    <Modal visible={visible} animationType={reduceMotion ? 'none' : 'fade'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
        <View style={s.top}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
            <Text style={s.close}>Close</Text>
          </Pressable>
          <Text style={s.topTitle}>Chips Pass</Text>
          <Text style={s.balance} accessibilityLabel={`${store.wallet.chips} chips`}>
            {store.wallet.chips.toLocaleString()} chips
          </Text>
        </View>
        <ScrollView contentContainerStyle={s.body}>
          <Animated.View style={anim}>
            <Text style={s.hero}>{store.hasPass ? 'Your Chips Pass is on' : 'Play with more chips every day'}</Text>
            {PERKS.map((p) => (
              <View key={p} style={s.perk}>
                <View style={s.dot} />
                <Text style={s.perkText}>{p}</Text>
              </View>
            ))}

            {pricesMissing ? (
              <View style={s.missing} testID="prices-unavailable">
                <Text style={s.missingTitle}>Prices are unavailable right now</Text>
                <Text style={s.missingBody}>The App Store did not return prices. Check your connection and try again. Nothing is charged until the store shows a price.</Text>
                <Pressable style={s.retry} onPress={() => { tap(); void store.refreshProducts(); }} accessibilityRole="button">
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {store.passActive ? (
              <Pressable style={[s.cta, s.ctaGhost]} onPress={() => { tap(); void store.manage(); }} accessibilityRole="button">
                <Text style={[s.ctaText, { color: C.gold }]}>Manage subscription</Text>
              </Pressable>
            ) : (
              <>
                {PLANS.map((p) => {
                  const price = store.priceOf(p.id);
                  const sel = plan === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => { tap(); setPlan(p.id); }}
                      style={[s.plan, sel && s.planSel]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: sel }}
                    >
                      <View style={s.planHead}>
                        <Text style={s.planTitle}>{p.title}</Text>
                        {p.badge ? <Text style={s.badge}>{p.badge}</Text> : null}
                      </View>
                      <Text style={s.planPrice}>
                        {price ?? (store.catalogBusy ? ' ' : 'Price unavailable')}
                        <Text style={s.planPeriod}>{price ? `  ${p.period}` : ''}</Text>
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  style={[s.cta, (!planPrice || !!store.busy) && s.ctaOff]}
                  disabled={!planPrice || !!store.busy}
                  onPress={() => { tap(); void store.buy(plan); }}
                  accessibilityRole="button"
                >
                  {store.busy === plan ? <ActivityIndicator color={C.ink} /> : <Text style={s.ctaText}>Start Chips Pass</Text>}
                </Pressable>
                <Text style={s.small}>No free trial. Billed now and renews automatically until cancelled.</Text>
              </>
            )}

            <Text style={s.section}>Chip packs</Text>
            <View style={s.grid}>
              {PACK_IDS.map((id) => {
                const price = store.priceOf(id);
                return (
                  <Pressable
                    key={id}
                    style={[s.pack, (!price || !!store.busy) && s.packOff]}
                    disabled={!price || !!store.busy}
                    onPress={() => { tap(); void store.buy(id); }}
                    accessibilityRole="button"
                  >
                    <Text style={s.packChips}>{PACK_CHIPS[id].toLocaleString()} chips</Text>
                    {store.busy === id ? (
                      <ActivityIndicator color={C.gold} />
                    ) : (
                      <Text style={s.packPrice}>{price ?? 'Unavailable'}</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {store.message ? <Text style={s.message} accessibilityLiveRegion="polite">{store.message}</Text> : null}

            <Pressable onPress={() => { tap(); void store.restore(); }} disabled={!!store.busy} accessibilityRole="button">
              <Text style={s.restore}>{store.busy === 'restore' ? 'Restoring' : 'Restore purchases'}</Text>
            </Pressable>

            <Text style={s.legal}>
              Chips are virtual game currency with no cash value and cannot be exchanged for money or prizes. Chip packs are
              consumable and are not restored. Chips Pass renews automatically unless cancelled at least 24 hours before the
              end of the period. Manage or cancel it in your App Store account settings.
            </Text>
            <View style={s.links}>
              <Text style={s.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Use</Text>
              <Text style={s.legal}> · </Text>
              <Text style={s.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy Policy</Text>
            </View>
            <Text style={s.debug} testID="paywall-debug" selectable>{store.debugLine}</Text>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  close: { color: C.gold, fontSize: 16, fontWeight: '700' },
  topTitle: { color: C.paper, fontSize: 17, fontWeight: '800' },
  balance: { color: C.muted, fontSize: 13, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 32 },
  hero: { color: C.paper, fontSize: 30, fontWeight: '800', marginTop: 12, marginBottom: 14 },
  perk: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold, marginRight: 12 },
  perkText: { color: C.paper, fontSize: 16 },
  missing: { borderWidth: 1, borderColor: C.rose, borderRadius: 16, padding: 16, marginTop: 16, backgroundColor: '#2a1430' },
  missingTitle: { color: C.paper, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  missingBody: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  retry: { alignSelf: 'flex-start', backgroundColor: C.gold, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 10 },
  retryText: { color: C.ink, fontWeight: '800', fontSize: 15 },
  plan: { borderWidth: 1.5, borderColor: C.edge, backgroundColor: C.table, borderRadius: 18, padding: 16, marginTop: 14 },
  planSel: { borderColor: C.gold, borderWidth: 2.5 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { color: C.paper, fontSize: 20, fontWeight: '800' },
  badge: { backgroundColor: C.gold, color: C.ink, fontWeight: '800', fontSize: 12, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  planPrice: { color: C.gold, fontSize: 22, fontWeight: '800', marginTop: 8 },
  planPeriod: { color: C.muted, fontSize: 14, fontWeight: '500' },
  cta: { backgroundColor: C.gold, borderRadius: 999, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  ctaGhost: { backgroundColor: 'transparent', borderWidth: 2, borderColor: C.gold },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: C.ink, fontWeight: '800', fontSize: 18 },
  small: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 8 },
  section: { color: C.paper, fontSize: 20, fontWeight: '800', marginTop: 26, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pack: { width: '48%', backgroundColor: C.table, borderColor: C.edge, borderWidth: 1.5, borderRadius: 14, padding: 14, marginTop: 10, minHeight: 74 },
  packOff: { opacity: 0.55 },
  packChips: { color: C.paper, fontWeight: '800', fontSize: 16 },
  packPrice: { color: C.gold, fontWeight: '800', fontSize: 15, marginTop: 6 },
  message: { color: C.mint, fontSize: 14, marginTop: 16, lineHeight: 20 },
  restore: { color: C.gold, fontWeight: '800', fontSize: 15, marginTop: 20 },
  legal: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  links: { flexDirection: 'row', alignItems: 'center' },
  link: { color: C.paper, fontSize: 12, marginTop: 12, textDecorationLine: 'underline' },
  debug: { color: '#8E8E93', fontSize: 10, lineHeight: 14, marginTop: 16 },
});
