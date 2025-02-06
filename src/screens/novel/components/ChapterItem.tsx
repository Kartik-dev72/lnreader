/* eslint-disable react-native/no-inline-styles */
import React, { memo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import color from 'color';
import {
  ChapterBookmarkButton,
  DownloadButton,
} from './Chapter/ChapterDownloadButtons';
import { ThemeColors } from '@theme/types';
import { ChapterInfo } from '@database/types';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { useBoolean } from '@hooks';
import Animated, { FlipInXDown } from 'react-native-reanimated';

interface ChapterItemProps {
  isDownloading?: boolean;
  isBookmarked?: boolean;
  chapter: ChapterInfo;
  theme: ThemeColors;
  showChapterTitles: boolean;
  isSelected?: (id: number) => boolean;
  downloadChapter: () => void;
  deleteChapter: () => void;
  onSelectPress?: (chapter: ChapterInfo) => void;
  onSelectLongPress?: (chapter: ChapterInfo) => void;
  navigateToChapter: (chapter: ChapterInfo) => void;
  left?: ReactNode;
  isLocal: boolean;
  isUpdateCard?: boolean;
  novelName: string;
  index?: number;
}

const ChapterItem: React.FC<ChapterItemProps> = ({
  isDownloading,
  isBookmarked,
  chapter,
  theme,
  showChapterTitles,
  downloadChapter,
  deleteChapter,
  isSelected,
  onSelectPress,
  onSelectLongPress,
  navigateToChapter,
  isLocal,
  left,
  isUpdateCard,
  novelName,
  index = -1,
}) => {
  const { id, name, unread, releaseTime, bookmark, chapterNumber, progress } =
    chapter;
  const {
    value: isMenuVisible,
    setTrue: showMenu,
    setFalse: hideMenu,
  } = useBoolean();

  isBookmarked ??= bookmark;

  return (
    <Animated.View
      entering={
        index >= 0 && index < 21
          ? FlipInXDown.delay(10 * index).duration(150)
          : undefined
      }
    >
      <Pressable
        key={'chapterItem' + id}
        style={[
          styles.chapterCardContainer,
          isSelected?.(id) && {
            backgroundColor: color(theme.primary).alpha(0.12).string(),
          },
        ]}
        onPress={() => {
          onSelectPress ? onSelectPress(chapter) : navigateToChapter(chapter);
        }}
        onLongPress={() => onSelectLongPress?.(chapter)}
        android_ripple={{ color: theme.rippleColor }}
      >
        <View style={styles.row}>
          {left}
          {isBookmarked ? <ChapterBookmarkButton theme={theme} /> : null}
          <View style={{ flex: 1 }}>
            {isUpdateCard ? (
              <Text
                style={[
                  {
                    fontSize: 14,
                    color: unread ? theme.onSurface : theme.outline,
                  },
                ]}
                numberOfLines={1}
              >
                {novelName}
              </Text>
            ) : null}
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {unread ? (
                <MaterialCommunityIcons
                  name="circle"
                  color={theme.primary}
                  size={8}
                  style={styles.unreadIcon}
                />
              ) : null}

              <Text
                style={[
                  {
                    fontSize: isUpdateCard ? 12 : 14,
                    color: !unread
                      ? theme.outline
                      : bookmark
                      ? theme.primary
                      : theme.onSurface,
                  },
                ]}
                numberOfLines={1}
              >
                {showChapterTitles
                  ? name
                  : getString('novelScreen.chapterChapnum', {
                      num: chapterNumber,
                    })}
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {releaseTime && !isUpdateCard ? (
                <Text
                  style={[
                    {
                      color: !unread
                        ? theme.outline
                        : bookmark
                        ? theme.primary
                        : theme.onSurfaceVariant,
                      marginTop: 4,
                    },
                    styles.text,
                  ]}
                  numberOfLines={1}
                >
                  {releaseTime}
                </Text>
              ) : null}
              {!isUpdateCard && progress && progress > 0 && chapter.unread ? (
                <Text
                  style={{
                    color: theme.outline,
                    marginLeft: chapter.releaseTime ? 5 : 0,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  {chapter.releaseTime ? '•  ' : null}
                  {getString('novelScreen.progress', { progress })}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
        {!isLocal ? (
          <DownloadButton
            isDownloading={isDownloading}
            isDownloaded={chapter.isDownloaded}
            chapterId={chapter.id}
            theme={theme}
            deleteChapter={deleteChapter}
            downloadChapter={downloadChapter}
            hideDeleteChapterMenu={hideMenu}
            showDeleteChapterMenu={showMenu}
            deleteChapterMenuVisible={isMenuVisible}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export default memo(ChapterItem);

const styles = StyleSheet.create({
  chapterCardContainer: {
    height: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
  },
  textRow: {
    flexDirection: 'row',
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  unreadIcon: {
    marginRight: 4,
  },
});
