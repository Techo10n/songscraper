import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useClipboardReel } from '../hooks/useClipboardReel';
import { ReelImportBanner } from '../components/ReelImportBanner';
import { ReelImportModal } from '../components/ReelImportModal';
import { colors } from '../lib/theme';

function RootLayoutNav() {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();
  const reelUiReady = !!session && !!user && !loading;

  const { pendingUrl, pendingSource, dismiss } = useClipboardReel(user?.id ?? null, reelUiReady);
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  const handleFindSong = () => {
    if (!pendingUrl) return;
    setModalUrl(pendingUrl);
    dismiss();
  };

  const handleModalClose = () => setModalUrl(null);

  useEffect(() => {
    if (!navState?.key || loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [navState?.key, session, loading, segments, router]);

  useEffect(() => {
    if (!pendingUrl || pendingSource !== 'link' || modalUrl) return;
    setModalUrl(pendingUrl);
    dismiss();
  }, [pendingUrl, pendingSource, modalUrl, dismiss]);

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      />
      {reelUiReady && (
        <ReelImportBanner url={pendingUrl} onFindSong={handleFindSong} onDismiss={dismiss} />
      )}
      {reelUiReady && <ReelImportModal reelUrl={modalUrl} onClose={handleModalClose} />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
