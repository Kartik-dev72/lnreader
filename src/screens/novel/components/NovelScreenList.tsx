import * as React from 'react';
import { FlashList } from '@shopify/flash-list';
import ChapterItem from './ChapterItem';
import NovelInfoHeader from './Info/NovelInfoHeader';
import { useRef, useState } from 'react';
import { pickCustomNovelCover } from '@database/queries/NovelQueries';
import { ChapterInfo, NovelInfo } from '@database/types';
import { useBoolean } from '@hooks/index';
import { useAppSettings, useDownload, useTheme } from '@hooks/persisted';
import {
  updateNovel,
  updateNovelPage,
} from '@services/updates/LibraryUpdateQueries';
import { getString } from '@strings/translations';
import { showToast } from '@utils/showToast';
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackSheet from './Tracker/TrackSheet';
import NovelBottomSheet from './NovelBottomSheet';
import * as Haptics from 'expo-haptics';
import { AnimatedFAB } from 'react-native-paper';
import { NovelSettings } from '@hooks/persisted/useNovel';
import { ChapterListSkeleton } from '@components/Skeleton/Skeleton';

type NovelScreenListProps = {
  routeBaseNovel: {
    name: string;
    path: string;
    pluginId: string;
    cover?: string;
  };
  navigation: any;
  openDrawer: () => void;
  headerOpacity: SharedValue<number>;
  selected: ChapterInfo[];
  setSelected: React.Dispatch<React.SetStateAction<ChapterInfo[]>>;
  chapters: ChapterInfo[];
  chaptersTeasers: ChapterInfo[];
  fetchedNovel?: NovelInfo;
  novelSettings: NovelSettings;
  loading: boolean;
  pageIndex: number;
  pages: string[];
  lastRead?: ChapterInfo;
  setNovel: React.Dispatch<React.SetStateAction<NovelInfo | undefined>>;
  getNovel: () => void;
  sortAndFilterChapters: (sort?: string, filter?: string) => Promise<void>;
  setShowChapterTitles: (v: boolean) => void;
  followNovel: () => void;
  deleteChapter: (chapter: ChapterInfo) => void;
  listRef: React.RefObject<FlashList<ChapterInfo>>;
};

const ListEmptyComponent = () => <ChapterListSkeleton />;

const NovelScreenList = ({
  routeBaseNovel,
  navigation,
  openDrawer,
  headerOpacity,
  selected,
  setSelected,
  chapters,
  chaptersTeasers,
  fetchedNovel,
  novelSettings,
  loading,
  pageIndex,
  pages,
  lastRead,
  setNovel,
  getNovel,
  sortAndFilterChapters,
  setShowChapterTitles,
  followNovel,
  deleteChapter,
  listRef,
}: NovelScreenListProps) => {
  const { pluginId } = routeBaseNovel;
  const routeNovel: Omit<NovelInfo, 'id'> & { id: 'NO_ID' } = {
    inLibrary: false,
    isLocal: false,
    totalPages: 0,
    ...routeBaseNovel,
    id: 'NO_ID',
  };
  const novel = fetchedNovel ?? routeNovel;
  const [updating, setUpdating] = useState(false);
  const {
    useFabForContinueReading,
    defaultChapterSort,
    disableHapticFeedback,
    downloadNewChapters,
    refreshNovelMetadata,
  } = useAppSettings();

  const {
    sort = defaultChapterSort,
    filter = '',
    showChapterTitles = false,
  } = novelSettings;

  const theme = useTheme();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();

  const { downloadQueue, downloadChapter } = useDownload();

  const [isFabExtended, setIsFabExtended] = useState(true);

  let novelBottomSheetRef = useRef(null);
  let trackerSheetRef = useRef(null);

  const deleteDownloadsSnackbar = useBoolean();

  const onPageScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    headerOpacity.set(y < 50 ? 0 : (y - 50) / 150);
    const currentScrollPosition = Math.floor(y) ?? 0;
    if (useFabForContinueReading && lastRead) {
      setIsFabExtended(currentScrollPosition <= 0);
    }
  };

  const onRefresh = async () => {
    if (novel.id !== 'NO_ID') {
      setUpdating(true);
      updateNovel(pluginId, novel.path, novel.id, {
        downloadNewChapters,
        refreshNovelMetadata,
      })
        .then(() => getNovel())
        .then(() =>
          showToast(
            getString('novelScreen.updatedToast', { name: novel.name }),
          ),
        )
        .catch(error => showToast('Failed updating: ' + error.message))
        .finally(() => setUpdating(false));
    }
  };

  const onRefreshPage = async (page: string) => {
    if (novel.id !== 'NO_ID') {
      setUpdating(true);
      updateNovelPage(pluginId, novel.path, novel.id, page, {
        downloadNewChapters,
      })
        .then(() => getNovel())
        .then(() => showToast(`Updated page: ${page}`))
        .catch(e => showToast('Failed updating: ' + e.message))
        .finally(() => setUpdating(false));
    }
  };

  const refreshControl = () => (
    <RefreshControl
      progressViewOffset={topInset + 32}
      onRefresh={onRefresh}
      refreshing={updating}
      colors={[theme.primary]}
      progressBackgroundColor={theme.onPrimary}
    />
  );

  const isSelected = (id: number) => {
    return selected.some(obj => obj.id === id);
  };

  const onSelectPress = (chapter: ChapterInfo) => {
    if (selected.length === 0) {
      navigateToChapter(chapter);
    } else {
      if (isSelected(chapter.id)) {
        setSelected(sel => sel.filter(it => it.id !== chapter.id));
      } else {
        setSelected(sel => [...sel, chapter]);
      }
    }
  };

  const onSelectLongPress = (chapter: ChapterInfo) => {
    if (selected.length === 0) {
      if (!disableHapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setSelected(sel => [...sel, chapter]);
    } else {
      if (selected.length === chapters.length) {
        return;
      }

      /**
       * Select custom range
       */
      const lastSelectedChapter = selected[selected.length - 1];

      if (lastSelectedChapter.id !== chapter.id) {
        if (lastSelectedChapter.id > chapter.id) {
          setSelected(sel => [
            ...sel,
            chapter,
            ...chapters.filter(
              (chap: ChapterInfo) =>
                (chap.id <= chapter.id || chap.id >= lastSelectedChapter.id) ===
                false,
            ),
          ]);
        } else {
          setSelected(sel => [
            ...sel,
            chapter,
            ...chapters.filter(
              (chap: ChapterInfo) =>
                (chap.id >= chapter.id || chap.id <= lastSelectedChapter.id) ===
                false,
            ),
          ]);
        }
      }
    }
  };

  const navigateToChapter = (chapter: ChapterInfo) => {
    navigation.navigate('Chapter', { novel, chapter });
  };

  const setCustomNovelCover = async () => {
    if (!novel || novel.id === 'NO_ID') {
      return;
    }
    const newCover = await pickCustomNovelCover(novel);
    if (newCover) {
      setNovel({
        ...novel,
        cover: newCover,
      });
    }
  };

  return (
    <>
      <FlashList
        ref={listRef}
        estimatedItemSize={64}
        data={chapters.length ? chapters : chaptersTeasers}
        extraData={[chapters.length, selected.length, novel.id, loading]}
        removeClippedSubviews={true}
        // ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={chapters.length ? undefined : ListEmptyComponent}
        renderItem={({ item, index }) => {
          if (novel.id === 'NO_ID') {
            return null;
          }
          return (
            <ChapterItem
              isDownloading={downloadQueue.some(
                c => c.task.data.chapterId === item.id,
              )}
              isBookmarked={!!item.bookmark}
              isLocal={novel.isLocal}
              theme={theme}
              chapter={item}
              showChapterTitles={showChapterTitles}
              deleteChapter={() => deleteChapter(item)}
              downloadChapter={() => downloadChapter(novel, item)}
              isSelected={isSelected(item.id)}
              onSelectPress={onSelectPress}
              onSelectLongPress={onSelectLongPress}
              navigateToChapter={navigateToChapter}
              novelName={novel.name}
              index={index}
            />
          );
        }}
        keyExtractor={item => 'chapter_' + item.id}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <NovelInfoHeader
            novel={novel}
            theme={theme}
            filter={filter}
            lastRead={lastRead}
            isLoading={loading}
            setCustomNovelCover={setCustomNovelCover}
            chapters={chapters}
            navigation={navigation}
            navigateToChapter={navigateToChapter}
            followNovel={followNovel}
            trackerSheetRef={trackerSheetRef}
            novelBottomSheetRef={novelBottomSheetRef}
            deleteDownloadsSnackbar={deleteDownloadsSnackbar}
            page={pages.length > 1 ? pages[pageIndex] : undefined}
            onRefreshPage={onRefreshPage}
            openDrawer={openDrawer}
          />
        }
        refreshControl={refreshControl()}
        onScroll={onPageScroll}
      />
      {novel.id !== 'NO_ID' && (
        <>
          <NovelBottomSheet
            bottomSheetRef={novelBottomSheetRef}
            sortAndFilterChapters={sortAndFilterChapters}
            setShowChapterTitles={setShowChapterTitles}
            sort={sort}
            theme={theme}
            filter={filter}
            showChapterTitles={showChapterTitles}
          />
          <TrackSheet
            bottomSheetRef={trackerSheetRef}
            novel={novel}
            theme={theme}
          />
          {useFabForContinueReading && (lastRead || chapters[0]) ? (
            <AnimatedFAB
              style={[
                styles.fab,
                { backgroundColor: theme.primary, marginBottom: bottomInset },
              ]}
              extended={isFabExtended}
              color={theme.onPrimary}
              uppercase={false}
              label={
                lastRead
                  ? getString('common.resume')
                  : getString('novelScreen.startReadingChapters', {
                      name: '',
                    }).trim()
              }
              icon="play"
              onPress={() => {
                navigation.navigate('Chapter', {
                  novel: novel,
                  chapter: lastRead ?? chapters[0],
                });
              }}
            />
          ) : null}
        </>
      )}
    </>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  rowBack: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
  },
});

export default React.memo(NovelScreenList);
