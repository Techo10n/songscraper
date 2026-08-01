import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { deleteReelList, getSavedReelLists, SavedReelList } from '../lib/reelLists';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/theme';

export default function History() {
  const { user } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<SavedReelList[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setLists(await getSavedReelLists(user.id));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = async (listId: string) => {
    if (!user) return;
    await deleteReelList(user.id, listId);
    setLists((prev) => prev.filter((list) => list.id !== listId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.fg2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.fg3} />
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={44} color={colors.fg4} />
          <Text style={styles.emptyText}>No saved reels yet.</Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{item.title}</Text>
                {item.songs.slice(0, 3).map((song, i) => (
                  <View key={i} style={styles.songRow}>
                    {song.coverUrl ? (
                      <Image source={{ uri: song.coverUrl }} style={styles.cover} />
                    ) : (
                      <View style={styles.coverPlaceholder}>
                        <Ionicons name="musical-note" size={14} color={colors.fg4} />
                      </View>
                    )}
                    <Text style={styles.songText} numberOfLines={1}>
                      {song.title} — {song.artist}
                    </Text>
                  </View>
                ))}
                {item.songs.length > 3 && (
                  <Text style={styles.moreText}>+{item.songs.length - 3} more</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.fg3} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { color: colors.fg, fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.fg3, fontSize: 14 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  listTitle: { color: colors.fg, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  songRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cover: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.bgCard },
  coverPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songText: { color: colors.fg2, fontSize: 12, flex: 1 },
  moreText: { color: colors.fg4, fontSize: 11, marginLeft: 28 },
});
