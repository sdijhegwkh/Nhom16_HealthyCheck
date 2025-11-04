import React, { useState, useEffect, useRef } from "react";
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
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../App";

type SignUpScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "SignUp"
>;

interface Props {
  navigation: SignUpScreenNavigationProp;
}

export default function SignUpScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  async function handleSignUp() {
    if (!name || !email || !password || !age || !gender || !height || !weight) {
      alert("Please fill all fields");
      return;
    }

    if (!validateEmail(email)) {
      alert("Invalid email format");
      return;
    }

    const ageNum = Number(age);
    const heightNum = Number(height);
    const weightNum = Number(weight);

    if (isNaN(ageNum) || isNaN(heightNum) || isNaN(weightNum)) {
      alert("Age, height, and weight must be numbers");
      return;
    }

    const bmi = (weightNum / Math.pow(heightNum / 100, 2)).toFixed(1);

    try {
      const response = await fetch("http://192.168.1.4:5000/users/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          age: ageNum,
          gender,
          height: heightNum,
          weight: weightNum,
          bmi: parseFloat(bmi),
        }),
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <LinearGradient colors={["#2563eb", "#60a5fa"]} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={require("../assets/logoxoanen1.png")} style={styles.logo} />
          <Text style={styles.brand}>KayTi</Text>
        </View>

        {/* Scrollable Form */}
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.title}>Create your account</Text>

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
              autoCapitalize="none"
              keyboardType="email-address"
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

            {/* Gender Radio */}
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Gender:</Text>
              {["Male", "Female"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={styles.radioOption}
                  onPress={() => setGender(g as "Male" | "Female")}
                >
                  <View
                    style={[
                      styles.radioCircle,
                      gender === g && styles.radioSelected,
                    ]}
                  />
                  <Text style={styles.radioText}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter height (cm)"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />

            <TextInput
              style={styles.input}
              placeholder="Enter weight (kg)"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && { backgroundColor: "#1e3a8a" },
              ]}
              onPress={handleSignUp}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </Pressable>

            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
                Sign in
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flex: 0.35,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 20,
  },
  logo: { width: 100, height: 100 },
  brand: { fontSize: 40, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  card: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 8,
    elevation: 12,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#2563eb", marginBottom: 20 },
  input: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 14,
    color: "#000",
    marginBottom: 14,
    fontSize: 16,
  },
  genderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    width: "100%",
    justifyContent: "space-around",
  },
  genderLabel: { fontSize: 16, color: "#2563eb", fontWeight: "bold" },
  radioOption: { flexDirection: "row", alignItems: "center" },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#2563eb",
    marginRight: 6,
  },
  radioSelected: { backgroundColor: "#2563eb" },
  radioText: { fontSize: 16, color: "#333" },
  button: {
    width: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  footerText: { color: "#333", marginTop: 25, fontSize: 15 },
  link: { fontWeight: "700", color: "#2563eb" },
});