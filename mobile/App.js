import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const Tab = createBottomTabNavigator();

async function getDeviceId() {
  const existing = await AsyncStorage.getItem('sheikh-device-id');
  if (existing) return existing;
  const next = `expo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem('sheikh-device-id', next);
  return next;
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(`Cannot reach API at ${API_URL}. Check that the backend is running and your phone is on the same Wi-Fi.`);
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

async function pickImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission needed', 'Allow photo access to attach images.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.75 });
  return result.canceled ? null : result.assets[0];
}

function Shell({ children, loading, refresh, error }) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Sheikh Expo Go</Text>
          <Text style={styles.title}>Conference test console</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={refresh}>
          <Text style={styles.iconButtonText}>R</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={styles.loader} size="large" color="#0f766e" /> : children}
    </SafeAreaView>
  );
}

function Attachment({ image, onPick, onClear }) {
  return (
    <View style={styles.attachmentRow}>
      <Pressable style={styles.secondaryButton} onPress={onPick}>
        <Text style={styles.secondaryButtonText}>{image ? 'Change image' : 'Add image'}</Text>
      </Pressable>
      {image ? (
        <Pressable style={styles.clearButton} onPress={onClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ChatScreen({ state, refresh, deviceId, error }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const messages = state?.messages || [];

  async function send() {
    if (!text.trim() && !image) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append('deviceId', deviceId);
      body.append('text', text);
      if (image) body.append('image', { uri: image.uri, name: image.fileName || 'chat-image.jpg', type: image.mimeType || 'image/jpeg' });
      await api('/api/mobile/messages', { method: 'POST', body });
      setText('');
      setImage(null);
      await refresh();
    } catch (error) {
      Alert.alert('Message failed', error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell loading={false} refresh={refresh} error={error}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Pull refresh after the API connects.</Text>}
          renderItem={({ item }) => (
            <View style={styles.messageBubble}>
              <Text style={styles.itemMeta}>{item.userName}</Text>
              {item.text ? <Text style={styles.messageText}>{item.text}</Text> : null}
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.uploadedImage} /> : null}
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Write chat message" style={styles.input} />
          <Attachment image={image} onPick={async () => setImage(await pickImage())} onClear={() => setImage(null)} />
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={send} disabled={busy}>
            <Text style={styles.primaryButtonText}>{busy ? 'Sending...' : 'Send message'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function LedgerScreen({ state, refresh, error }) {
  const [form, setForm] = useState({ title: '', amount: '', category: 'Meeting', kind: 'debit' });
  const [image, setImage] = useState(null);
  const total = useMemo(() => Number(state?.totals?.ledger || 0), [state]);
  const ledgers = state?.ledgers || [];

  async function save() {
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (image) body.append('image', { uri: image.uri, name: image.fileName || 'ledger.jpg', type: image.mimeType || 'image/jpeg' });
      await api('/api/mobile/ledgers', { method: 'POST', body });
      setForm({ title: '', amount: '', category: 'Meeting', kind: 'debit' });
      setImage(null);
      await refresh();
    } catch (error) {
      Alert.alert('Ledger failed', error.message);
    }
  }

  return (
    <Shell loading={false} refresh={refresh} error={error}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.totalPanel}>
          <Text style={styles.itemMeta}>Ledger balance</Text>
          <Text style={[styles.totalText, total < 0 && styles.negative]}>{total.toFixed(2)}</Text>
        </View>
        <View style={styles.card}>
          <TextInput value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Ledger title" style={styles.input} />
          <TextInput value={form.amount} onChangeText={(amount) => setForm({ ...form, amount })} placeholder="Amount" keyboardType="decimal-pad" style={styles.input} />
          <TextInput value={form.category} onChangeText={(category) => setForm({ ...form, category })} placeholder="Category" style={styles.input} />
          <View style={styles.segment}>
            {['debit', 'credit'].map((kind) => (
              <Pressable key={kind} style={[styles.segmentOption, form.kind === kind && styles.segmentActive]} onPress={() => setForm({ ...form, kind })}>
                <Text style={[styles.segmentText, form.kind === kind && styles.segmentTextActive]}>{kind}</Text>
              </Pressable>
            ))}
          </View>
          <Attachment image={image} onPick={async () => setImage(await pickImage())} onClear={() => setImage(null)} />
          <Pressable style={styles.primaryButton} onPress={save}>
            <Text style={styles.primaryButtonText}>Save ledger</Text>
          </Pressable>
        </View>
        {ledgers.map((item) => (
          <View key={item._id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemMeta}>{item.category} / {item.kind}</Text>
            <Text style={styles.amount}>{Number(item.amount).toFixed(2)}</Text>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.uploadedImage} /> : null}
          </View>
        ))}
      </ScrollView>
    </Shell>
  );
}

function UsageScreen({ state, refresh, error }) {
  const [minutes, setMinutes] = useState('30');
  const [dataMb, setDataMb] = useState('120');
  const totals = state?.totals || {};
  const usage = state?.usage || [];

  async function addUsage() {
    try {
      await api('/api/mobile/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Expo Go test call', minutes, dataMb }),
      });
      await refresh();
    } catch (error) {
      Alert.alert('Usage failed', error.message);
    }
  }

  return (
    <Shell loading={false} refresh={refresh} error={error}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.itemMeta}>Total minutes</Text>
            <Text style={styles.metricValue}>{Number(totals.minutes || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.itemMeta}>Total data MB</Text>
            <Text style={styles.metricValue}>{Number(totals.dataMb || 0).toFixed(0)}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <TextInput value={minutes} onChangeText={setMinutes} placeholder="Minutes" keyboardType="number-pad" style={styles.input} />
          <TextInput value={dataMb} onChangeText={setDataMb} placeholder="Data MB" keyboardType="number-pad" style={styles.input} />
          <Pressable style={styles.primaryButton} onPress={addUsage}>
            <Text style={styles.primaryButtonText}>Add usage</Text>
          </Pressable>
        </View>
        {usage.map((item) => (
          <View key={item._id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.label}</Text>
            <Text style={styles.itemMeta}>{item.minutes} min / {item.dataMb} MB</Text>
          </View>
        ))}
      </ScrollView>
    </Shell>
  );
}

export default function App() {
  const [deviceId, setDeviceId] = useState('');
  const [state, setState] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const id = deviceId || await getDeviceId();
    if (!deviceId) setDeviceId(id);
    const data = await api(`/api/mobile/bootstrap?deviceId=${encodeURIComponent(id)}&name=Sheikh Tester`);
    setState(data);
    setError('');
  }, [deviceId]);

  useEffect(() => {
    refresh().catch((error) => setError(`${error.message} Set EXPO_PUBLIC_API_URL to your backend LAN URL.`));
  }, [refresh]);

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0f766e', tabBarStyle: styles.tabBar }}>
        <Tab.Screen name="Chat">{() => <ChatScreen state={state} refresh={refresh} deviceId={deviceId} error={error} />}</Tab.Screen>
        <Tab.Screen name="Ledgers">{() => <LedgerScreen state={state} refresh={refresh} error={error} />}</Tab.Screen>
        <Tab.Screen name="Usage">{() => <UsageScreen state={state} refresh={refresh} error={error} />}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7faf9' },
  flex: { flex: 1 },
  header: { padding: 18, paddingTop: 10, backgroundColor: '#ffffff', borderBottomColor: '#d8e4df', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#5f6f69', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0 },
  title: { color: '#13231f', fontSize: 22, fontWeight: '800', marginTop: 2 },
  loader: { marginTop: 80 },
  errorBanner: { margin: 12, color: '#9f1239', backgroundColor: '#ffe4e6', borderColor: '#fecdd3', borderWidth: 1, borderRadius: 8, padding: 10, fontWeight: '700' },
  emptyText: { color: '#64746e', textAlign: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  messageBubble: { backgroundColor: '#ffffff', borderColor: '#d8e4df', borderWidth: 1, borderRadius: 8, padding: 12 },
  messageText: { color: '#13231f', fontSize: 16, marginTop: 4 },
  itemMeta: { color: '#64746e', fontSize: 12, fontWeight: '600' },
  itemTitle: { color: '#13231f', fontSize: 16, fontWeight: '800' },
  uploadedImage: { width: '100%', height: 180, borderRadius: 8, marginTop: 10, backgroundColor: '#e8efec' },
  composer: { padding: 12, gap: 10, borderTopColor: '#d8e4df', borderTopWidth: 1, backgroundColor: '#ffffff' },
  input: { backgroundColor: '#ffffff', borderColor: '#c9d7d2', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#13231f' },
  primaryButton: { backgroundColor: '#0f766e', borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  secondaryButton: { borderColor: '#0f766e', borderWidth: 1, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  secondaryButtonText: { color: '#0f766e', fontWeight: '800' },
  clearButton: { paddingVertical: 11, paddingHorizontal: 12 },
  clearButtonText: { color: '#9f1239', fontWeight: '800' },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  disabled: { opacity: 0.65 },
  card: { backgroundColor: '#ffffff', borderColor: '#d8e4df', borderWidth: 1, borderRadius: 8, padding: 14, gap: 10 },
  totalPanel: { backgroundColor: '#13231f', borderRadius: 8, padding: 16 },
  totalText: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  negative: { color: '#fecdd3' },
  amount: { color: '#0f766e', fontSize: 24, fontWeight: '900' },
  segment: { flexDirection: 'row', backgroundColor: '#e8efec', borderRadius: 8, padding: 4 },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 7 },
  segmentActive: { backgroundColor: '#ffffff' },
  segmentText: { color: '#64746e', fontWeight: '800', textTransform: 'capitalize' },
  segmentTextActive: { color: '#0f766e' },
  metrics: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, backgroundColor: '#ffffff', borderColor: '#d8e4df', borderWidth: 1, borderRadius: 8, padding: 14 },
  metricValue: { color: '#13231f', fontSize: 28, fontWeight: '900', marginTop: 6 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8efec' },
  iconButtonText: { color: '#0f766e', fontWeight: '900' },
  tabBar: { borderTopColor: '#d8e4df' },
});
