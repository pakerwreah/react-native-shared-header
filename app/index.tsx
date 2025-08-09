import { StyleSheet, Text, View } from 'react-native';
import {
  SharedHeaderPager,
  useSharedHeaderContext,
} from '@/components/SharedHeaderPager';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  scrollTo,
  useSharedValue,
} from 'react-native-reanimated';
import { memo, useState } from 'react';
import { AnimatedIndex } from '@/components/AnimatedIndex';

const headerHeight = 250;

type ListItem = { id: number };

export default function Index() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const animatedIndex = useSharedValue(selectedIndex);

  return (
    <View style={styles.view}>
      <SharedHeaderPager
        header={
          <View style={styles.header}>
            <Text style={styles.headerText}>Selected: {selectedIndex}</Text>
            <AnimatedIndex style={styles.headerText}>
              {animatedIndex}
            </AnimatedIndex>
          </View>
        }
        headerHeight={headerHeight}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        animatedIndex={animatedIndex}
      >
        {Array.from({ length: 3 }, (_, i) => (
          <MyList key={i} index={i} />
        ))}
      </SharedHeaderPager>
    </View>
  );
}

const MyList = memo(function MyList({ index }: { index: number }) {
  const listRef = useAnimatedRef<Animated.FlatList<ListItem>>();

  const context = useSharedHeaderContext({
    offscreenScroll(offset) {
      'worklet';
      scrollTo(listRef, 0, offset, false);
    },
  });

  const scrollHandler = useAnimatedScrollHandler((e) => {
    context.scrollOffset.value = e.contentOffset.y;
  });

  return (
    <Animated.FlatList
      ref={listRef}
      data={data}
      contentContainerStyle={{ paddingTop: headerHeight }}
      onScroll={scrollHandler}
      renderItem={({ item }) => (
        <Text style={styles.listItem}>
          List: {index} - Item: {item.id}
        </Text>
      )}
    />
  );
});

const data: ListItem[] = Array.from({ length: 50 }, (_, i) => ({
  id: i,
}));

const styles = StyleSheet.create({
  view: {
    flex: 1,
  },
  header: {
    flex: 1,
    backgroundColor: 'darkblue',
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 32,
    margin: 'auto',
  },
  listItem: {
    margin: 8,
    backgroundColor: '#ccc',
    textAlign: 'center',
    lineHeight: 40,
  },
});
