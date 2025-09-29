import {
  createContext,
  memo,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  clamp,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  scrollTo,
  withDelay,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type Props = {
  children: ReactNode[];
  header: ReactElement;
  headerHeight: number;
  selectedIndex: number;
  animatedIndex?: SharedValue<number>;
  disableIntervalMomentum?: boolean;
  onSelect(index: number): void;
};

type PagerContextType = {
  scrollOffset: SharedValue<number>;
  _offscreenScroll: SharedValue<number | null>;
};

const SharedHeaderContext = createContext<PagerContextType>(null as any);

export const useSharedHeaderContext = ({
  offscreenScroll,
}: {
  offscreenScroll(offset: number): void;
}): Omit<PagerContextType, '_offscreenScroll'> => {
  const context = useContext(SharedHeaderContext);
  useAnimatedReaction(
    () => context._offscreenScroll.value,
    (offset) => {
      if (offset !== null) {
        offscreenScroll(offset);
        context._offscreenScroll.value = null;
      }
    },
  );
  return context;
};

export const SharedHeaderPager = memo(function SharedHeaderPager({
  children,
  header,
  headerHeight,
  selectedIndex: _selectedIndex,
  animatedIndex,
  disableIntervalMomentum = true,
  onSelect,
}: Props) {
  const selectedIndex = useSharedValue(0);
  const currentPageOffset = useSharedValue(0);

  useEffect(() => {
    selectedIndex.value = _selectedIndex;
  }, [_selectedIndex, selectedIndex]);

  const headerOffset = useDerivedValue(() =>
    clamp(currentPageOffset.value, 0, headerHeight),
  );

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: headerHeight,
      transform: [{ translateY: -headerOffset.value }],
    };
  });

  const pagerScrollView = useAnimatedRef<Animated.ScrollView>();
  const pagerScrollOffset = useSharedValue(0);
  const isPagerScrolling = useSharedValue(false);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll(e) {
      'worklet';
      isPagerScrolling.value = true;
      const offset = e.contentOffset.x;
      pagerScrollOffset.value = offset;
      if (animatedIndex) {
        animatedIndex.value = offset / width;
      }
    },
    onMomentumEnd() {
      'worklet';
      const index = Math.round(pagerScrollOffset.value / width);
      const clamped = clamp(index, 0, children.length - 1);
      isPagerScrolling.value = false;
      runOnJS(onSelect)(clamped);
    },
  });

  useAnimatedReaction(
    () => selectedIndex.value * width,
    (offset) => {
      if (isPagerScrolling.value) {
        return;
      }
      scrollTo(pagerScrollView, offset, 0, true);
    },
  );

  const contents = useMemo(
    () =>
      children.map((child, i) => (
        <ChildWrapper
          key={i}
          index={i}
          selectedIndex={selectedIndex}
          currentPageOffset={currentPageOffset}
          headerOffset={headerOffset}
        >
          {child}
        </ChildWrapper>
      )),
    [children, selectedIndex, currentPageOffset, headerOffset],
  );

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.pager}
        ref={pagerScrollView}
        horizontal
        snapToInterval={width}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        disableIntervalMomentum={disableIntervalMomentum}
        onScroll={scrollHandler}
      >
        {contents}
      </Animated.ScrollView>
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        {header}
      </Animated.View>
    </View>
  );
});

type ChildProps = {
  index: number;
  selectedIndex: SharedValue<number>;
  currentPageOffset: SharedValue<number>;
  headerOffset: SharedValue<number>;
  children: ReactNode;
};

const ChildWrapper = memo(function ChildWrapper({
  index,
  selectedIndex,
  currentPageOffset,
  headerOffset,
  children,
}: ChildProps) {
  const isVisible = useDerivedValue(() => index === selectedIndex.value);
  const scrollAdjust = useSharedValue<number | null>(null);

  const context = useMemo<PagerContextType>(
    () => ({
      scrollOffset: currentPageOffset,
      _offscreenScroll: scrollAdjust,
    }),
    [currentPageOffset, scrollAdjust],
  );

  const debouncedAdjust = useSharedValue(0);

  // adjust offscreen page scroll
  useAnimatedReaction(
    () => headerOffset.value,
    (targetOffset) => {
      if (isVisible.value) {
        return;
      }
      debouncedAdjust.value = withDelay(
        32,
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 0 }, (finished) => {
            if (finished) {
              scrollAdjust.value = targetOffset;
            }
          }),
        ),
      );
    },
  );

  // update visible page scroll
  useAnimatedReaction(
    () => context.scrollOffset.value,
    (offset) => {
      if (isVisible.value) {
        currentPageOffset.value = offset;
      }
    },
  );

  return (
    <SharedHeaderContext.Provider value={context}>
      <View style={styles.content}>{children}</View>
    </SharedHeaderContext.Provider>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    inset: 0,
    borderColor: 'red',
    borderWidth: 2,
  },
  content: {
    flex: 1,
    height: '100%',
    width,
    maxWidth: width,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
});
