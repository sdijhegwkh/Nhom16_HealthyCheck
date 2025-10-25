import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(''); // 🔹 thêm state lỗi
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // ✅ Gọi API login
  async function handleLogin() {
    setErrorMsg(''); // reset lỗi cũ
    if (!email || !password) {
      setErrorMsg('Please enter email and password');
      return;
    }

    try {
      const response = await fetch('https://health-check-deploy.onrender.com/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {};
      }

      if (response.ok && data.user) {
        setErrorMsg('');
        navigation.navigate('Home');
      } else {
        console.log('❌ Login failed:', data);
        setErrorMsg(data.error || 'Invalid email or password'); // 🔹 hiện lỗi
      }
    } catch (err) {
      console.error('⚠️ Fetch error:', err);
      setErrorMsg('Cannot connect to server');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#2563eb', '#60a5fa']} style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../assets/logoxoanen1.png')} style={styles.logo} />
          <Text style={styles.brand}>KayTi</Text>
        </View>

        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>Welcome back 👋</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* 🔹 Thêm hiển thị lỗi */}
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && { backgroundColor: '#1e3a8a' }]}
            onPress={handleLogin}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>

          <Text style={styles.footerText}>
            Don’t have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
              Sign up
            </Text>
          </Text>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flex: 0.35, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 20 },
  logo: { width: 100, height: 100 },
  brand: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  card: {
    flex: 0.65,
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: 'center',
    paddingVertical: 40,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 8,
    elevation: 12,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2563eb', marginBottom: 30 },
  input: {
    width: '85%',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    color: '#000',
    marginBottom: 12,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    width: '85%',
    backgroundColor: '#2563eb',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  footerText: { color: '#333', marginTop: 25, fontSize: 15 },
  link: { fontWeight: '700', color: '#2563eb' },
});
