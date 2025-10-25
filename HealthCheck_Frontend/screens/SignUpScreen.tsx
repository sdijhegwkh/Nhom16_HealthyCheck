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

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  // ✅ Hàm đăng ký
  async function handleSignUp() {
    if (!name || !email || !password || !age || !gender) {
      alert("Please fill all fields");
      return;
    }

    try {
      const response = await fetch("https://health-check-deploy.onrender.com/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, age, gender }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Sign Up successful! Welcome, ${name}!`);
        navigation.navigate("Login");
      } else {
        alert(data.error || "Sign Up failed");
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#2563eb', '#60a5fa']} style={styles.container}>
        {/* Logo + Tên thương hiệu */}
        <View style={styles.header}>
          <Image source={require('../assets/logoxoanen1.png')} style={styles.logo} />
          <Text style={styles.brand}>KayTi</Text>
        </View>

        {/* Card trắng */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>Create your account ✨</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter age"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />

          <TextInput
            style={styles.input}
            placeholder="Enter gender"
            placeholderTextColor="#aaa"
            value={gender}
            onChangeText={setGender}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { backgroundColor: '#1e3a8a' },
            ]}
            onPress={handleSignUp}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </Pressable>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
              Sign in
            </Text>
          </Text>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flex: 0.35,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  logo: { width: 100, height: 100 },
  brand: {
    fontSize: 40,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 30,
  },
  input: {
    width: '85%',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 14,
    color: '#000',
    marginBottom: 18,
    fontSize: 16,
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
