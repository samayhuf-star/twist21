// Twist 21 table, hand and dialogs, drawn with native React Native views.
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Animated, Easing, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import * as E from './engineTypes';
import type { ActionKind, Card as CardT, LookKind, Player } from './engineTypes';
import { initPurchases, loadOffers, restore, showChipPaywall } from './purchases';

const C = {
  ink: '#0b1a14', rail: '#3a2216', rail2: '#5b3a22', gold: '#e8c46a', gold2: '#b8893a', paper: '#f6f0e2', paperInk: '#1a1510',
  hot: '#e4572e', mint: '#4fe0a0', rose: '#ff5a73', muted: '#9fc3b0', glass: 'rgba(0,0,0,0.32)', lo: '#4aa8c7', mid: '#9a7bd6', hi: '#e0647a',
};
const FELT: Record<string, [string, string]> = {
  emerald: ['#12583b', '#0b3d29'], midnight: ['#17306a', '#0d1d45'], crimson: ['#7b1f2e', '#4a0f19'], violet: ['#4b2a7a', '#2c1648'],
};
const BACK: Record<string, [string, string]> = {
  classic: ['#7a1230', '#4d0a1e'], gold: ['#c99a3b', '#8a6420'], ink: ['#1d2430', '#0a0e14'], neon: ['#0fb5a0', '#0a6f8a'],
};
const DEALER: Record<string, { skin: string; hair: string; vest: string; tie: string }> = {
  dee: { skin: '#f1c9a0', hair: '#2a1b12', vest: '#7a1230', tie: '#e8c46a' },
  marco: { skin: '#c68c5a', hair: '#111111', vest: '#14416b', tie: '#f6f0e2' },
  nova: { skin: '#8d5b3a', hair: '#6a1fb0', vest: '#1a1a22', tie: '#4fe0a0' },
};
const AVATAR = ['#e8c46a', '#7fd1c4', '#f29bb0'];
const DISPLAY = Platform.select({ ios: 'Georgia', default: 'serif' });

const ICONS: Record<ActionKind, { d: string[]; c?: [number, number, number][] }> = {
  skip: { d: ['M5 5l8 7-8 7zM13 5l8 7-8 7z'] },
  swap: { d: ['M4 8h14l-3-3M20 16H6l3 3'] },
  force: { d: ['M12 8v8M8 12h8'], c: [[12, 12, 9]] },
  trim: { d: ['M8 8.5L20 18M8 15.5L20 6'], c: [[6, 7, 2.5], [6, 17, 2.5]] },
  shield: { d: ['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'] },
  lower: { d: ['M6 7l6 6 6-6M6 13l6 6 6-6'] },
  raise: { d: ['M6 17l6-6 6 6M6 11l6-6 6 6'] },
  peek: { d: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'], c: [[12, 12, 3]] },
  reverse: { d: ['M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3', 'M18 3v4h-4M6 21v-4h4'] },
};

function ActionIcon({ k, size, color }: { k: ActionKind; size: number; color: string }) {
  const ic = ICONS[k];
  const stroke = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {(ic.c ?? []).map((c, i) => <Circle key={`c${i}`} cx={c[0]} cy={c[1]} r={c[2]} {...stroke} />)}
      {ic.d.map((d, i) => <Path key={`p${i}`} d={d} {...stroke} />)}
    </Svg>
  );
}

function useGame() {
  return useSyncExternalStore(E.subscribe, E.version, E.version);
}

// ---------- cards ----------
function PlayingCard({ card, down, big, peeked, mine, order }: { card: CardT; down: boolean; big?: boolean; peeked?: boolean; mine?: boolean; order: number }) {
  const w = big ? 54 : 44, h = big ? 76 : 62;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 420, delay: Math.min(order, 6) * 110, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [anim, order]);
  const style = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) },
      { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
    ],
  };
  if (down) {
    const [b1, b2] = BACK[E.SAVE.eq.back] ?? BACK.classic;
    return (
      <Animated.View accessible accessibilityRole="image" accessibilityLabel="Face-down card" style={[styles.card, { width: w, height: h, backgroundColor: b1, borderWidth: 2, borderColor: C.paper }, style]}>
        <View style={[styles.backStripe, { backgroundColor: b2 }]} />
        <View style={[styles.backBadge, { width: w * 0.62, height: w * 0.62, borderRadius: w }]}>
          <Text style={{ color: C.gold, fontFamily: DISPLAY, fontWeight: '900', fontSize: w * 0.32 }}>21</Text>
        </View>
      </Animated.View>
    );
  }
  const band = card.v <= 3 ? C.lo : card.v <= 7 ? C.mid : C.hi;
  return (
    <Animated.View
      accessible accessibilityRole="image" accessibilityLabel={`Card ${card.v}`}
      style={[styles.card, { width: w, height: h, backgroundColor: C.paper }, peeked && styles.cardPeeked, mine && styles.cardMine, style]}
    >
      <View style={[styles.cardBand, { backgroundColor: band }]} />
      <Text style={styles.cardCorner}>{card.v}</Text>
      <Text style={{ color: C.paperInk, fontFamily: DISPLAY, fontWeight: '900', fontSize: w * 0.56 }}>{card.v}</Text>
    </Animated.View>
  );
}

function Tag({ label, tone }: { label: string; tone?: 'turn' | 'bust' | 'shield' | 'skip' | 'win' }) {
  const bg = tone === 'turn' || tone === 'win' ? C.gold : tone === 'bust' ? C.rose : tone === 'shield' ? C.mint : tone === 'skip' ? C.hot : 'rgba(255,255,255,0.14)';
  const fg = tone ? '#2b1205' : C.paper;
  return <View style={[styles.tag, { backgroundColor: bg }]}><Text style={[styles.tagText, { color: fg }]}>{label}</Text></View>;
}

function Seat({ p, i }: { p: Player; i: number }) {
  const S = E.S, me = S.players[0];
  const reveal = S.roundEnded || p.human || me.peeked.has(i);
  const turn = S.phase === 'play' && !S.roundEnded && S.cur === i && E.active(p);
  return (
    <View style={[styles.seat, turn && styles.seatTurn, !p.human && { flex: 1 }]} accessibilityLabel={p.name}>
      <View style={styles.seatHead}>
        <View style={[styles.avatar, { backgroundColor: AVATAR[i] }]}><Text style={styles.avatarText}>{p.name.charAt(0)}</Text></View>
        <Text style={styles.seatName}>{p.name}</Text>
        <Text style={styles.seatTotal}>{reveal ? String(E.total(p)) : `${E.visTotal(p)}+?`}</Text>
      </View>
      <View style={styles.tags}>
        {p.bust ? <Tag label="Bust" tone="bust" /> : p.stood ? <Tag label="Standing" /> : null}
        {p.shield ? <Tag label="Shield" tone="shield" /> : null}
        {p.skip ? <Tag label="Skipped" tone="skip" /> : null}
        {turn ? <Tag label={p.human ? 'Your turn' : 'Playing'} tone="turn" /> : null}
      </View>
      <View style={[styles.cards, { minHeight: p.human ? 76 : 62 }, p.bust && { opacity: 0.5 }]}>
        {p.cards.map((c, ci) => (
          <PlayingCard
            key={`${c.id}-${ci === 0 && !reveal ? 'd' : 'u'}`} card={c} order={ci + i} big={p.human}
            down={ci === 0 && !reveal} peeked={ci === 0 && !p.human && !S.roundEnded && me.peeked.has(i)} mine={ci === 0 && p.human}
          />
        ))}
      </View>
      {!p.human ? (
        <View style={styles.amini}>
          {p.actions.map((a) => <View key={a.id} style={styles.apip} />)}
          <Text style={styles.aminiText}>{p.actions.length} action</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------- buttons ----------
function Btn({ label, kind, onPress, disabled, flex, left }: { label: string; kind: 'gold' | 'ghost' | 'outline'; onPress: () => void; disabled?: boolean; flex?: boolean; left?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.btn, kind === 'gold' ? styles.btnGold : kind === 'outline' ? styles.btnOutline : styles.btnGhost, flex && { flex: 1 }, disabled && { opacity: 0.35 }, pressed && { opacity: 0.75 }]}
    >
      <Text style={[styles.btnText, { color: kind === 'gold' ? '#2b1d00' : C.paper }, left && { textAlign: 'left', fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}

function Legal() {
  const link = (url: string, label: string) => (
    <Text accessibilityRole="link" style={styles.legalLink} onPress={() => Linking.openURL(url)}>{label}</Text>
  );
  return (
    <Text style={styles.legal}>
      {link(E.TERMS_URL, 'Terms of Use (Apple Standard EULA)')} · {link(E.PRIVACY_URL, 'Privacy Policy')} · {link(E.SUPPORT_URL, 'Support')}
    </Text>
  );
}

function Coin({ size = 18 }: { size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size, backgroundColor: C.gold, borderWidth: 2, borderColor: C.gold2 }} />;
}

function Dialog({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <ScrollView contentContainerStyle={[styles.overlayScroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.dialog}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={styles.h2}>{title}</Text>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const Sub = ({ children }: { children: React.ReactNode }) => <Text style={styles.sub}>{children}</Text>;
const Gain = ({ children }: { children: React.ReactNode }) => <Text style={styles.gain}>{children}</Text>;

// ---------- dialogs ----------
const ONB = [
  { eye: 'Welcome', h: 'Blackjack, but you can bend the rules', p: 'Get closest to 21 without going over, against Ava and Rex. Then play action cards to change everything.' },
  { eye: 'Nine action cards', h: 'Skip, swap, peek, shield, twist the target', p: 'One action card per turn, then Hit or Stand. Move the target to 18 or 24 and watch the table scramble.' },
  { eye: 'Win it', h: 'First to 5 points wins the match', p: 'A round win is 1 point, or 2 for landing exactly on target. Earn chips on every round and spend them on looks.' },
];

function Onboarding() {
  const s = E.S.onb;
  if (s < ONB.length) {
    const o = ONB[s];
    return (
      <Dialog eyebrow={o.eye} title={o.h}>
        <View style={styles.hero}>
          {s === 0 ? (
            <View style={styles.bigCard}><View style={styles.bigCardBand} /><Text style={styles.bigCardText}>21</Text></View>
          ) : s === 1 ? (
            <View style={styles.iconRow}>
              {(['skip', 'swap', 'peek', 'shield', 'lower', 'raise'] as ActionKind[]).map((k) => (
                <View key={k} style={styles.iconTile}><ActionIcon k={k} size={24} color="#260a02" /><Text style={styles.iconTileText}>{E.ACTIONS[k].name}</Text></View>
              ))}
            </View>
          ) : (
            <View style={styles.iconRow}>
              {[['1 pt', 'round win'], ['2 pts', 'exact hit'], ['5 pts', 'match']].map((t) => (
                <View key={t[0]} style={[styles.iconTile, { backgroundColor: C.gold }]}><Text style={styles.iconTileText}>{t[0]}</Text><Text style={styles.iconTileText}>{t[1]}</Text></View>
              ))}
            </View>
          )}
        </View>
        <Sub>{o.p}</Sub>
        <View style={styles.dots}>{ONB.map((_, i) => <View key={i} style={[styles.dot, i === s && styles.dotOn]} />)}</View>
        <Btn kind="gold" label={s === ONB.length - 1 ? 'Continue' : 'Next'} onPress={() => E.act('onbnext')} />
        <Text accessibilityRole="button" style={styles.skipLink} onPress={() => E.act('onbskip')}>Skip intro</Text>
      </Dialog>
    );
  }
  const perks: [string, string][] = [
    ['All 9 action cards', ' and unlimited matches'], ['10,000 chips', ' to start, plus a daily bonus'], ['Earn chips', ' on every round you play'],
    ['Unlock looks', ': felts, card backs and dealers'], ['Odds meter', ' when you want a hint'], ['No ads. No subscription.', ''],
  ];
  return (
    <Dialog eyebrow="What you get" title="Everything is free to play">
      {perks.map((p) => (
        <View key={p[0]} style={styles.perk}>
          <View style={styles.tick}><Text style={styles.tickText}>✓</Text></View>
          <Text style={styles.perkText}><Text style={{ fontWeight: '800' }}>{p[0]}</Text>{p[1]}</Text>
        </View>
      ))}
      <Sub>Need more chips? Optional chip packs are one-time purchases and never required to play.</Sub>
      <Legal />
      <Btn kind="gold" label="Deal me in" onPress={() => E.act('onbdone')} />
      <Btn kind="ghost" label="See chip packs" onPress={() => E.act('open', 'shop')} />
    </Dialog>
  );
}

function Home() {
  return (
    <Dialog eyebrow="Blackjack with action cards" title="Twist 21">
      <Sub>You against Ava and Rex. First to {E.WIN_POINTS} points.</Sub>
      <Gain>{E.tableLine()}</Gain>
      <Btn kind="ghost" label="Choose table" onPress={() => E.act('open', 'table')} />
      {E.dailyReady() ? <Btn kind="ghost" label={`Claim daily bonus · +${E.fmt(E.dailyAmount().amount)}`} onPress={() => E.act('daily')} /> : null}
      <Btn kind="gold" label="Deal me in" onPress={() => E.act('start')} />
      <Btn kind="ghost" left label="Wardrobe" onPress={() => E.act('open', 'wardrobe')} />
      <Btn kind="ghost" left label="How to play" onPress={() => E.act('open', 'rules')} />
      <Legal />
    </Dialog>
  );
}

function Result() {
  const S = E.S, R = S.result;
  if (!R) return null;
  const final = S.phase === 'matchEnd' && !!S.champ;
  const head = final && S.champ
    ? (S.champ.human ? 'You win the match' : `${S.champ.name} wins the match`)
    : R.winner ? (R.winner.human ? 'You take the round' : `${R.winner.name} takes the round`) : 'No winner this round';
  const earned = S.reward ? S.reward.chips + (S.reward.match || 0) : 0;
  return (
    <Dialog eyebrow={`Round ${S.round} · target ${R.target}`} title={head}>
      <Text style={styles.body}>{R.msg}</Text>
      {final && S.stake > 0 ? (S.potWon > 0
        ? <Gain>Pot won: +{E.fmt(S.potWon)} chips (boot {E.fmt(S.stake)})</Gain>
        : <Sub>Boot lost: -{E.fmt(S.stake)} chips</Sub>) : null}
      {S.reward ? <Gain>+{E.fmt(earned)} chips earned{S.reward.match ? ` (match bonus +${S.reward.match})` : ''}</Gain> : null}
      <View>
        {R.rows.map((r) => (
          <View key={r.p.name} style={styles.row}>
            <Text style={[styles.cell, { width: 44, fontWeight: '800' }]}>{r.p.name}</Text>
            <Text style={[styles.cell, { flex: 1 }]}>{r.p.cards.map((c) => c.v).join(' · ')}</Text>
            <Text style={[styles.cell, styles.cellNum]}>{r.total}</Text>
            {r.bust ? <Tag label="Bust" tone="bust" /> : R.winner === r.p ? <Tag label={`+${R.pts}`} tone="win" /> : <Tag label="Stood" />}
          </View>
        ))}
      </View>
      <Sub>Score (first to {E.WIN_POINTS}): {S.players.map((p) => `${p.name} ${p.points}`).join(' · ')}</Sub>
      <Btn kind="gold" label={final ? 'New match' : 'Next round'} onPress={() => E.act(final ? 'newmatch' : 'next')} />
    </Dialog>
  );
}

function Shop({ onPaywall, onRestore }: { onPaywall: () => void; onRestore: () => void }) {
  const S = E.S;
  const ready = S.storeState === 'ready' && !S.buying;
  const note = S.buying ? 'Waiting for the App Store…'
    : S.storeState === 'ready' ? ''
    : S.storeState === 'unavailable' ? 'Chip packs are unavailable right now. Check your connection and try again later. You can keep playing.'
    : 'Connecting to the App Store…';
  return (
    <Dialog eyebrow="Chip shop" title="Get more chips">
      <Sub>
        You have <Gain>{E.fmt(E.SAVE.bank)}</Gain> chips. Chips are for table boots, looks and the odds meter. Free practice needs no chips.
        Chips have no cash value and cannot be cashed out. One-time purchases, no subscription.
      </Sub>
      {note ? <Sub>{note}</Sub> : null}
      <Btn kind="gold" label="See chip packs" disabled={!ready} onPress={onPaywall} />
      <Btn kind="ghost" label="Restore purchases" onPress={onRestore} />
      <Legal />
      <Btn kind="outline" label="Back to the table" onPress={() => E.act('close')} />
    </Dialog>
  );
}

function Wardrobe() {
  const sect = (kind: LookKind, title: string) => (
    <View key={kind} style={{ gap: 8 }}>
      <Text style={styles.eyebrow}>{title}</Text>
      <View style={styles.grid}>
        {E.CATALOG[kind].map((it) => {
          const own = E.SAVE.owned[kind].indexOf(it.id) >= 0, on = E.SAVE.eq[kind] === it.id;
          return (
            <Pressable key={it.id} accessibilityRole="button" style={[styles.tile, on && styles.tileOn]} onPress={() => E.act('item', kind, it.id)}>
              <View style={[styles.swatch, { backgroundColor: it.sw }]} />
              <Text style={styles.tileName}>{it.name}</Text>
              <Text style={styles.tileSmall}>{on ? 'In use' : own ? 'Tap to use' : `${E.fmt(it.cost)} chips`}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
  return (
    <Dialog eyebrow="Wardrobe" title="Make the table yours">
      <Sub>Chips: <Gain>{E.fmt(E.SAVE.bank)}</Gain></Sub>
      {sect('felt', 'Table felt')}{sect('back', 'Card backs')}{sect('dealer', 'Dealer')}
      <Btn kind="ghost" label="Get chips" onPress={() => E.act('open', 'shop')} />
      <Btn kind="outline" label="Back" onPress={() => E.act('close')} />
    </Dialog>
  );
}

function TablePicker() {
  return (
    <Dialog eyebrow="Table" title="Choose your boot">
      <Sub>
        Boot is what each player puts in at the start of a match. Win the match and you take the whole pot (3 boots).
        You have <Gain>{E.fmt(E.SAVE.bank)}</Gain> chips. Chips have no cash value.
      </Sub>
      <View style={styles.grid}>
        {E.TABLES.map((b) => {
          const ok = E.SAVE.bank >= b, on = E.SAVE.boot === b;
          return (
            <Pressable key={b} accessibilityRole="button" style={[styles.tile, on && styles.tileOn, !ok && { opacity: 0.45 }]} onPress={() => E.act('settable', b)}>
              <Coin />
              <Text style={styles.tileName}>{E.fmt(b)}</Text>
              <Text style={styles.tileSmall}>Pot {E.fmt(b * E.SEATS)}{on ? ' · In use' : ok ? '' : ' · Need more chips'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Btn kind="ghost" label={E.SAVE.boot === 0 ? 'Free practice (in use)' : 'Free practice, no boot'} onPress={() => E.act('settable', 0)} />
      <Btn kind="ghost" label="Get chips" onPress={() => E.act('open', 'shop')} />
      <Btn kind="outline" label="Back" onPress={() => E.act('close')} />
    </Dialog>
  );
}

function Stats() {
  const s = E.SAVE.stats;
  const rows: [string, string | number][] = [
    ['Matches played', s.matches], ['Matches won', s.wins], ['Win streak (best)', `${s.streak} (${s.best})`],
    ['Rounds played', s.rounds], ['Rounds won', s.roundWins], ['Chips earned playing', E.fmt(s.earned)],
  ];
  return (
    <Dialog eyebrow="Your record" title="Stats">
      <View>
        {rows.map((r) => (
          <View key={r[0]} style={styles.row}><Text style={[styles.cell, { flex: 1 }]}>{r[0]}</Text><Text style={[styles.cell, styles.cellNum]}>{r[1]}</Text></View>
        ))}
      </View>
      <Btn kind="outline" label="Back" onPress={() => E.act('close')} />
    </Dialog>
  );
}

function Menu() {
  return (
    <Dialog eyebrow="Menu" title="Twist 21">
      <Btn kind="ghost" left label={`Table · ${E.SAVE.boot > 0 ? `${E.fmt(E.SAVE.boot)} boot` : 'practice'}`} onPress={() => E.act('open', 'table')} />
      <Btn kind="ghost" left label="Chip shop" onPress={() => E.act('open', 'shop')} />
      <Btn kind="ghost" left label="Wardrobe" onPress={() => E.act('open', 'wardrobe')} />
      <Btn kind="ghost" left label="Stats" onPress={() => E.act('open', 'stats')} />
      <Btn kind="ghost" left label="How to play" onPress={() => E.act('open', 'rules')} />
      {E.dailyReady() ? <Btn kind="gold" label={`Daily bonus · +${E.fmt(E.dailyAmount().amount)}`} onPress={() => E.act('daily')} /> : null}
      <Legal />
      <Btn kind="outline" label="Back to the table" onPress={() => E.act('close')} />
    </Dialog>
  );
}

function Rules() {
  const lines = [
    'Finish a round closest to the target, 21, without going over. Number cards run 1 to 10.',
    'Each turn, play one action card if you want, then Hit or Stand.',
    'Your first card is face-down to the others. Everything else is face-up.',
    'Drawing an action card puts it in your hand (limit 3) and ends your turn. You start each round with one.',
    `Win a round for 1 point, or 2 on the exact target. First to ${E.WIN_POINTS} wins the match. Ties score nothing.`,
  ];
  return (
    <Dialog eyebrow="How to play" title="Twist 21 rules">
      {lines.map((l) => <Text key={l} style={styles.rule}>•  {l}</Text>)}
      <View>
        {E.ORDER.map((k) => (
          <View key={k} style={styles.row}>
            <ActionIcon k={k} size={20} color={C.hot} />
            <Text style={[styles.cell, { width: 78, fontWeight: '800' }]}>{E.ACTIONS[k].name}</Text>
            <Text style={[styles.cell, { flex: 1 }]}>{E.ACTIONS[k].desc}</Text>
          </View>
        ))}
      </View>
      <Legal />
      <Btn kind="outline" label="Back" onPress={() => E.act('close')} />
    </Dialog>
  );
}

// ---------- table chrome ----------
function Felt() {
  const [f1, f2] = FELT[E.SAVE.eq.felt] ?? FELT.emerald;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="felt" cx="50%" cy="30%" rx="120%" ry="80%" gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={f1} /><Stop offset="0.7" stopColor={f2} /><Stop offset="1" stopColor="#06130d" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="url(#felt)" />
    </Svg>
  );
}

function DealerFace() {
  const d = DEALER[E.SAVE.eq.dealer] ?? DEALER.dee;
  return (
    <Svg width={86} height={86} viewBox="0 0 120 120">
      <Path d="M10 120c0-26 22-40 50-40s50 14 50 40z" fill={d.vest} />
      <Path d="M44 82l16 38 16-38-16 8z" fill="#f6f0e2" />
      <Path d="M50 90l10-6 10 6-10 5z" fill={d.tie} />
      <Rect x="52" y="66" width="16" height="16" rx="6" fill={d.skin} />
      <Ellipse cx="60" cy="46" rx="24" ry="27" fill={d.skin} />
      <Path d="M35 44c-2-22 14-30 27-28 14 1 25 12 22 29-6-10-14-14-24-14s-18 5-25 13z" fill={d.hair} />
      <Circle cx="51" cy="48" r="2.6" fill="#1a1208" /><Circle cx="69" cy="48" r="2.6" fill="#1a1208" />
      <Path d="M50 59c6 6 14 6 20 0" stroke="#7a3a22" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M44 44q7-6 14-1M62 43q7-5 14 1" stroke={d.hair} strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function TargetRing() {
  const spin = useRef(new Animated.Value(1)).current;
  const n = E.S.twistN;
  useEffect(() => {
    if (!n) return;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [n, spin]);
  return (
    <View style={styles.target} accessibilityLabel={`Current target ${E.S.target}`}>
      <Animated.View
        style={[styles.ring, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['-360deg', '0deg'] }) }, { scale: spin.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}
      />
      <Text style={styles.targetNum}>{E.S.target}</Text>
      <Text style={styles.targetSmall}>TARGET</Text>
    </View>
  );
}

function Bubble() {
  const pop = useRef(new Animated.Value(1)).current;
  const say = E.S.say || 'Welcome to the table.';
  useEffect(() => {
    pop.setValue(0.85);
    Animated.timing(pop, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [say, pop]);
  return <Animated.View style={[styles.bubble, { transform: [{ scale: pop }] }]} accessibilityLiveRegion="polite"><Text style={styles.bubbleText}>{say}</Text></Animated.View>;
}

function Toast() {
  const t = E.S.toast;
  const [shown, setShown] = useState<number>(0);
  useEffect(() => {
    if (!t) return;
    setShown(t.id);
    const h = setTimeout(() => setShown(0), 2400);
    return () => clearTimeout(h);
  }, [t]);
  if (!t || shown !== t.id) return null;
  return <View pointerEvents="none" style={styles.toastWrap}><View style={styles.toast}><Text style={styles.toastText}>{t.m}</Text></View></View>;
}

// ---------- the table ----------
export default function Game() {
  useGame();
  const insets = useSafeAreaInsets();
  const S = E.S, me = S.players[0];
  const busy = useRef(false);

  useEffect(() => {
    if (!initPurchases()) { E.setStoreReady(false); return; }
    loadOffers().then((offers) => E.setOffers(offers)).catch(() => E.setStoreReady(false));
  }, []);

  const openPaywall = async () => {
    if (busy.current || S.storeState !== 'ready') return; // one paywall at a time
    busy.current = true;
    E.act('buying');
    try {
      const shown = await showChipPaywall((id) => { E.grantPack(id); });
      if (!shown) Alert.alert('Chip packs', 'Chip packs are unavailable right now. Please try again later.');
    } catch (err) {
      Alert.alert('Chip packs', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      busy.current = false;
      E.buyDone();
    }
  };
  const doRestore = async () => {
    try {
      await restore();
      Alert.alert('Restore complete', 'Chip packs are consumable, so they are not restored. Your saved chips stay on this device.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Please try again.');
    }
  };

  if (!me) return <View style={styles.root} />;

  const canAct = S.humanTurn && !S.acted && !S.pending;
  const on = S.humanTurn && !S.pending;
  const targets = S.pending ? E.targetsFor(me, S.pending.k) ?? [] : [];
  const odds = S.oddsOn && on ? (E.total(me) >= S.target ? 'Already on target.' : `Bust chance if you hit: about ${E.bustRisk(me)}%`) : '';
  const order = S.dir === 1 ? 'You → Ava → Rex' : 'You → Rex → Ava';
  const [b1] = BACK[E.SAVE.eq.back] ?? BACK.classic;

  let overlay: React.ReactNode = null;
  if (S.screen === 'shop') overlay = <Shop onPaywall={openPaywall} onRestore={doRestore} />;
  else if (S.screen === 'wardrobe') overlay = <Wardrobe />;
  else if (S.screen === 'stats') overlay = <Stats />;
  else if (S.screen === 'table') overlay = <TablePicker />;
  else if (S.screen === 'menu') overlay = <Menu />;
  else if (S.screen === 'rules') overlay = <Rules />;
  else if (!E.SAVE.onboarded) overlay = <Onboarding />;
  else if (S.phase === 'intro') overlay = <Home />;
  else if (S.phase === 'roundEnd' || S.phase === 'matchEnd') overlay = <Result />;

  return (
    <View style={styles.root}>
      <Felt />
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }} importantForAccessibility={overlay ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={!!overlay}>
        <View style={styles.hud}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Chips ${E.fmt(E.SAVE.bank)}. Open the shop`} style={styles.bank} onPress={() => E.act('open', 'shop')}>
            <Coin /><Text style={styles.bankText}>{E.fmt(E.SAVE.bank)}</Text>
            <View style={styles.plus}><Text style={styles.plusText}>+</Text></View>
          </Pressable>
          <View style={{ flex: 1 }} />
          <TargetRing />
          <Pressable accessibilityRole="button" accessibilityLabel="Menu" style={styles.iconBtn} onPress={() => E.act('open', 'menu')}><Text style={styles.iconBtnText}>☰</Text></Pressable>
        </View>

        <View style={styles.dealer}>
          <DealerFace />
          <Bubble />
          <View style={styles.shoe}>
            <View style={[styles.shoeCard, { backgroundColor: b1, transform: [{ translateX: -4 }, { translateY: -4 }] }]} />
            <View style={[styles.shoeCard, { backgroundColor: b1, transform: [{ translateX: -2 }, { translateY: -2 }] }]} />
            <View style={[styles.shoeCard, { backgroundColor: b1 }]} />
            <Text style={styles.shoeText}>{S.deck.length} left</Text>
          </View>
        </View>
        <View style={styles.rail} />

        <ScrollView style={styles.table} contentContainerStyle={styles.tableInner} bounces={false}>
          <View style={styles.opps}>{S.players.map((p, i) => (i ? <Seat key={p.name} p={p} i={i} /> : null))}</View>

          <View style={styles.midRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {S.players.map((p) => (
                <View key={p.name} style={[styles.score, p.human && styles.scoreMe]} accessibilityLabel={`${p.name} ${p.points} points`}>
                  <Text style={styles.scoreText}>{p.name.charAt(0)}</Text>
                  {Array.from({ length: E.WIN_POINTS }, (_, k) => <View key={k} style={[styles.pip, k < p.points && styles.pipOn]} />)}
                </View>
              ))}
            </View>
            <Text style={styles.meta}>Round {S.round} · {order}</Text>
          </View>

          <View style={styles.feed} accessibilityLiveRegion="polite">
            <Text style={styles.status}>{E.statusText()}</Text>
            {S.log.slice(-3).map((m, i) => <Text key={`${S.log.length}-${i}`} style={styles.feedLine}>{m}</Text>)}
          </View>

          <Seat p={me} i={0} />

          <View style={styles.hand} accessibilityLabel="Your action cards">
            {!me.actions.length ? <Text style={styles.empty}>No action cards. Drawing one counts as your hit.</Text> : null}
            {me.actions.map((a) => {
              const ok = canAct && E.valid(me, a.k), A = E.ACTIONS[a.k];
              return (
                <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${A.name}. ${A.desc}`} accessibilityState={{ disabled: !ok }} disabled={!ok}
                  onPress={() => E.act('card', a.k)} style={({ pressed }) => [styles.acard, !ok && styles.acardOff, pressed && { transform: [{ translateY: -3 }] }]}>
                  <ActionIcon k={a.k} size={22} color={ok ? '#260a02' : '#a99bb0'} />
                  <Text style={[styles.acardName, !ok && { color: '#a99bb0' }]}>{A.name}</Text>
                  <Text style={[styles.acardDesc, !ok && { color: '#a99bb0' }]}>{A.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {S.pending ? (
            <View style={styles.chooser} accessibilityLabel="Choose a target">
              <Text style={styles.chooserLabel}>{E.ACTIONS[S.pending.k].name} on:</Text>
              {targets.map((o) => {
                const i = E.idxOf(o);
                const info = S.roundEnded || me.peeked.has(i) ? String(E.total(o)) : `${E.visTotal(o)}+?`;
                return (
                  <Pressable key={o.name} accessibilityRole="button" style={styles.pick} onPress={() => E.act('target', i)}>
                    <Text style={styles.pickText}>{o.name} <Text style={{ opacity: 0.65 }}>{info}</Text></Text>
                  </Pressable>
                );
              })}
              <Pressable accessibilityRole="button" style={[styles.pick, styles.pickGhost]} onPress={() => E.act('cancel')}><Text style={[styles.pickText, { color: C.paper }]}>Cancel</Text></Pressable>
            </View>
          ) : null}

          <View style={styles.controls}>
            <Btn kind="gold" flex label="Hit" disabled={!on} onPress={() => E.act('hit')} />
            <Btn kind="outline" flex label="Stand" disabled={!on} onPress={() => E.act('stand')} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Odds meter, ${E.ODDS_COST} chips`} disabled={!(on && !S.oddsOn)} style={[styles.oddsBtn, !(on && !S.oddsOn) && { opacity: 0.4 }]} onPress={() => E.act('odds')}>
              <Text style={styles.oddsBtnText}>Odds · {E.ODDS_COST}</Text>
            </Pressable>
          </View>
          {odds ? <Text style={styles.odds}>{odds}</Text> : null}
        </ScrollView>
      </View>
      {overlay}
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  bank: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.glass, borderWidth: 1, borderColor: C.gold2, borderRadius: 999, paddingVertical: 5, paddingLeft: 10, paddingRight: 6 },
  bankText: { color: C.gold, fontWeight: '800', fontSize: 15, fontVariant: ['tabular-nums'] },
  plus: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#3a2a08', fontWeight: '900', fontSize: 15, lineHeight: 18 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: C.paper, fontSize: 18 },
  target: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 28, borderWidth: 4, borderColor: C.gold, borderTopColor: C.hot, borderBottomColor: C.hot },
  targetNum: { color: C.paper, fontFamily: DISPLAY, fontWeight: '900', fontSize: 22 },
  targetSmall: { position: 'absolute', bottom: 6, color: C.muted, fontSize: 7, letterSpacing: 1 },

  dealer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 14 },
  bubble: { backgroundColor: C.paper, borderRadius: 14, borderBottomLeftRadius: 4, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 200, marginBottom: 18, flexShrink: 1 },
  bubbleText: { color: C.paperInk, fontSize: 14, fontWeight: '600' },
  shoe: { marginLeft: 'auto', marginBottom: 20, width: 52, height: 70 },
  shoeCard: { ...StyleSheet.absoluteFill, borderRadius: 8, borderWidth: 2, borderColor: C.paper },
  shoeText: { position: 'absolute', left: -10, right: -10, bottom: -17, textAlign: 'center', fontSize: 10, color: C.muted, fontWeight: '700' },
  rail: { height: 10, marginHorizontal: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: C.rail2, borderWidth: 1, borderColor: '#000' },

  table: { flex: 1, marginHorizontal: 6, borderWidth: 6, borderTopWidth: 0, borderColor: C.rail, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: 'rgba(0,0,0,0.16)' },
  tableInner: { gap: 10, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14 },
  opps: { flexDirection: 'row', gap: 8 },
  seat: { backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 14, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 10 },
  seatTurn: { borderColor: C.gold, borderWidth: 2 },
  seatHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1a1208', fontWeight: '900', fontSize: 12 },
  seatName: { color: C.paper, fontSize: 13, fontWeight: '800' },
  seatTotal: { marginLeft: 'auto', color: C.paper, fontFamily: DISPLAY, fontWeight: '900', fontSize: 18, fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, minHeight: 4, marginBottom: 4 },
  tag: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999 },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  amini: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7 },
  apip: { width: 11, height: 16, borderRadius: 3, backgroundColor: C.hot, transform: [{ rotate: '-6deg' }] },
  aminiText: { color: C.muted, fontSize: 11, marginLeft: 3 },
  card: { borderRadius: 7, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cardBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 6 },
  cardCorner: { position: 'absolute', left: 4, top: 8, fontSize: 10, fontWeight: '800', color: C.paperInk, opacity: 0.6 },
  cardPeeked: { borderWidth: 3, borderColor: C.gold, borderStyle: 'dashed' },
  cardMine: { borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)', borderStyle: 'dashed' },
  backStripe: { position: 'absolute', left: -20, right: -20, top: '38%', height: '24%', transform: [{ rotate: '-28deg' }] },
  backBadge: { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },

  midRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  score: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.glass, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: 'transparent' },
  scoreMe: { borderColor: C.gold },
  scoreText: { color: C.paper, fontWeight: '700', fontSize: 12, marginRight: 3 },
  pip: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: C.muted },
  pipOn: { backgroundColor: C.gold, borderColor: C.gold },
  meta: { color: C.muted, fontSize: 11, flexShrink: 1, textAlign: 'right' },
  feed: { backgroundColor: C.glass, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 10, minHeight: 40 },
  status: { color: C.paper, fontWeight: '800', fontSize: 13 },
  feedLine: { color: C.muted, fontSize: 12, marginTop: 2 },
  hand: { flexDirection: 'row', gap: 8 },
  empty: { color: C.muted, fontSize: 12, paddingVertical: 6, paddingHorizontal: 2 },
  acard: { flex: 1, minHeight: 104, backgroundColor: '#e05a2c', borderRadius: 12, padding: 9, gap: 4 },
  acardOff: { backgroundColor: '#3b2f3d' },
  acardName: { color: '#260a02', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  acardDesc: { color: '#260a02', fontSize: 10.5, lineHeight: 13, fontWeight: '600' },
  chooser: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', backgroundColor: C.glass, borderWidth: 1, borderColor: C.gold, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  chooserLabel: { color: C.paper, fontWeight: '800' },
  pick: { backgroundColor: C.paper, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  pickGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  pickText: { color: C.paperInk, fontWeight: '800' },
  controls: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  oddsBtn: { backgroundColor: C.glass, borderWidth: 1, borderColor: C.gold2, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 10, minHeight: 44, justifyContent: 'center' },
  oddsBtnText: { color: C.gold, fontWeight: '800', fontSize: 12 },
  odds: { color: C.muted, fontSize: 12 },

  btn: { paddingVertical: 13, paddingHorizontal: 22, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', minHeight: 48, justifyContent: 'center' },
  btnGold: { backgroundColor: C.gold },
  btnGhost: { borderColor: 'rgba(255,255,255,0.35)' },
  btnOutline: { borderColor: C.paper },
  btnText: { fontFamily: DISPLAY, fontWeight: '900', fontSize: 16, textAlign: 'center' },

  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4,14,9,0.9)' },
  overlayScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 14 },
  dialog: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: '#11352a', borderWidth: 1, borderColor: C.gold2, borderRadius: 22, padding: 20, gap: 12 },
  eyebrow: { color: C.gold, fontWeight: '800', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  h2: { color: C.paper, fontFamily: DISPLAY, fontWeight: '900', fontSize: 28, lineHeight: 31 },
  body: { color: C.paper, fontSize: 15 },
  sub: { color: C.muted, fontSize: 14, lineHeight: 20 },
  gain: { color: C.gold, fontWeight: '900', fontSize: 14 },
  legal: { color: C.muted, fontSize: 12, lineHeight: 20 },
  legalLink: { color: C.gold, fontWeight: '700' },
  skipLink: { color: C.muted, textDecorationLine: 'underline', fontSize: 13, textAlign: 'center', padding: 10 },
  hero: { alignItems: 'center', paddingVertical: 8 },
  bigCard: { width: 120, height: 168, borderRadius: 14, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ rotate: '-6deg' }] },
  bigCardBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 12, backgroundColor: C.gold },
  bigCardText: { color: C.paperInk, fontFamily: DISPLAY, fontWeight: '900', fontSize: 72 },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  iconTile: { width: '30%', backgroundColor: '#e05a2c', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center', gap: 4 },
  iconTileText: { color: '#260a02', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { backgroundColor: C.gold, width: 20 },
  perk: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.mint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tickText: { color: '#05271a', fontWeight: '900', fontSize: 12 },
  perkText: { color: C.paper, fontSize: 14, flex: 1 },
  rule: { color: C.paper, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.2)' },
  cell: { color: C.paper, fontSize: 13 },
  cellNum: { fontFamily: DISPLAY, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'right', minWidth: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 12, padding: 8, gap: 6, alignItems: 'center' },
  tileOn: { borderColor: C.gold, borderWidth: 2 },
  swatch: { width: '100%', height: 34, borderRadius: 8 },
  tileName: { color: C.paper, fontWeight: '800', fontSize: 12 },
  tileSmall: { color: C.muted, fontWeight: '700', fontSize: 11, textAlign: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 40, alignItems: 'center' },
  toast: { backgroundColor: C.paper, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, maxWidth: '90%' },
  toastText: { color: C.paperInk, fontWeight: '800', textAlign: 'center' },
});
