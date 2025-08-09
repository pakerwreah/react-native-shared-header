import { TextProps } from 'react-native';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { memo, useState } from 'react';

export const AnimatedIndex = memo(function AnimatedIndex({
  children: animatedIndex,
  ...props
}: Omit<TextProps, 'children'> & {
  children: SharedValue<number>;
}) {
  const [index, setIndex] = useState('-');

  useAnimatedReaction(
    () => animatedIndex.value,
    (value) => {
      runOnJS(setIndex)(value.toFixed(2));
    },
  );

  return <Animated.Text {...props}>Animated: {index}</Animated.Text>;
});
