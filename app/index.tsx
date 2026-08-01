import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isReelUrl } from '../lib/reelParser';
import { ReelImportModal } from '../components/ReelImportModal';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/theme';

export default function Index() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [reelText, setReelText] = useState('');
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!isReelUrl(reelText)) {
      setError("That doesn't look like an Instagram reel URL.");
      return;
    }
    setError(null);
    setModalUrl(reelText.trim());
  };

  const handleClose = () => {
    setModalUrl(null);
    setReelText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Text style={styles.title}>SongScraper</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/history')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="time-outline" size={22} color={colors.fg3} />
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="log-out-outline" size={22} color={colors.fg3} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.subtitle}>Paste an Instagram reel link to find the song.</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="https://www.instagram.com/reel/..."
          placeholderTextColor={colors.fg4}
          value={reelText}
          onChangeText={(text) => {
            setReelText(text);
            if (error) setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Find Song</Text>
        </TouchableOpacity>
      </View>

      <ReelImportModal reelUrl={modalUrl} onClose={handleClose} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.fg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    color: colors.fg3,
    marginBottom: 12,
    textAlign: 'center',
  },
  error: {
    color: colors.coral,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    color: colors.fg,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.line,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: colors.primaryInk,
    fontSize: 16,
    fontWeight: '700',
  },
});
