import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

export default function SplashScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
      Animated.delay(1500),
      Animated.timing(fadeAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start(() => navigation.replace('Login'));
  }, []);

  return (
    <LinearGradient colors={['#2563eb', '#60a5fa']} style={styles.container}>
      <Animated.Image
        source={require('../assets/logoxoanen1.png')}
        style={[styles.logo, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      />
      <Animated.Text style={[styles.brand, { opacity: fadeAnim }]}>KayTi</Animated.Text>
      <Animated.Text style={[styles.subtitle, { opacity: fadeAnim }]}>
        Stay fit. Stay strong.
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#e0f2fe',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});