import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

const BARS = [2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 1, 2, 1, 3, 2]

export default function VinBarcodeMark({
  color,
  busy = false,
}: {
  color: string
  busy?: boolean
}) {
  const sweep = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!busy) {
      sweep.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [busy, sweep])

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 220],
  })

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.bars}>
        {BARS.map((w, i) => (
          <View
            key={i}
            style={{
              width: w,
              height: i % 9 === 0 ? 52 : 44,
              backgroundColor: color,
              opacity: 0.92,
            }}
          />
        ))}
      </View>
      {busy ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sweep,
            { transform: [{ translateX }] },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 1.5,
    height: 52,
  },
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: 'rgba(185, 28, 28, 0.55)',
  },
})
