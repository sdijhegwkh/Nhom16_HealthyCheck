// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Animated,
//   Dimensions,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { AnimatedCircularProgress } from 'react-native-circular-progress';
// import { LineChart } from 'react-native-chart-kit';
// import { useNavigation } from '@react-navigation/native';
// import { DeviceMotion } from 'expo-sensors';

// const screenWidth = Dimensions.get('window').width;

// export default function StepsScreen() {
//   const navigation = useNavigation();
//   const fadeAnim = useRef(new Animated.Value(0)).current;

//   // === STATES ===
//   const [steps, setSteps] = useState(0); // số bước giả lập
//   const [goal, setGoal] = useState(10000);
//   const [editingGoal, setEditingGoal] = useState(false);
//   const [inputGoal, setInputGoal] = useState(goal.toString());
//   const [selectedTab, setSelectedTab] = useState<'week' | 'month'>('week');
//   const [shakeCount, setShakeCount] = useState(0); // số lần lắc để tăng bước

//   // === FADE-IN ANIMATION ===
//   useEffect(() => {
//     Animated.timing(fadeAnim, {
//       toValue: 1,
//       duration: 700,
//       useNativeDriver: true,
//     }).start();
//   }, []);

//   // === DEVICE MOTION: GIẢ LẬP BƯỚC ===
//     useEffect(() => {
//         let lastShake = 0;
//         const threshold = 1.2; // ngưỡng gia tốc
//         const subscription = DeviceMotion.addListener((motion) => {
//         const { acceleration } = motion;
//         if (!acceleration) return;

//         const totalAcceleration = Math.sqrt(
//             acceleration.x ** 2 + acceleration.y ** 2 + acceleration.z ** 2
//         );

//         if (totalAcceleration > threshold) {
//             const now = Date.now();
//             if (now - lastShake > 500) { // tránh tính nhiều lần liên tiếp
//             setShakeCount((prev) => prev + 1);
//             setSteps((prev) => prev + 1); // mỗi lần lắc = 1 bước
//             lastShake = now;
//             }
//         }
//         });

//         DeviceMotion.setUpdateInterval(100);
//         return () => subscription.remove();
//     }, []);

//   // === TÍNH TOÁN CHO UI ===
//   const percentage = Math.min((steps / goal) * 100, 100).toFixed(1);
//   const kcal = Math.round(steps * 0.04);
//   const distance = (steps * 0.0008).toFixed(2);
//   const minutes = Math.round(steps / 120);

//   const weeklyData = [4000, 10000, 8000, 12000, 9000, 15000, 11000];
//   const monthlyData = [8000, 10000, 12000, 15000, 9000, 13000, 17000, 16000, 14000, 12000, 18000, 20000];

//   const chartConfig = {
//     backgroundColor: '#fff',
//     backgroundGradientFrom: '#fff',
//     backgroundGradientTo: '#fff',
//     decimalPlaces: 0,
//     color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
//     labelColor: () => '#111',
//     propsForDots: {
//       r: '5',
//       strokeWidth: '2',
//       stroke: '#2563eb',
//       fill: '#93c5fd',
//     },
//     propsForBackgroundLines: {
//       strokeDasharray: '',
//       stroke: 'rgba(37,99,235,0.2)',
//     },
//   };

//   return (
//     <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
//       <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
//         {/* HEADER */}
//         <LinearGradient
//           colors={['#2563eb', '#60a5fa']}
//           style={styles.header}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 1 }}
//         >
//           <View style={styles.headerTop}>
//             <TouchableOpacity onPress={() => navigation.goBack()}>
//               <Ionicons name="chevron-back-outline" size={26} color="#fff" />
//             </TouchableOpacity>
//             <Text style={styles.headerTitle}>Steps</Text>
//             <View style={{ width: 26 }} />
//           </View>
//         </LinearGradient>

//         {/* PROGRESS TEXT */}
//         <Text style={styles.progressText}>
//           You’ve completed <Text style={{ color: '#2563eb', fontWeight: '700' }}>{percentage}%</Text> of your goal today
//         </Text>

//         {/* CIRCULAR PROGRESS */}
//         <View style={styles.progressContainer}>
//           <AnimatedCircularProgress
//             size={220}
//             width={14}
//             fill={(steps / goal) * 100}
//             tintColor="#2563eb"
//             backgroundColor="#e5e7eb"
//             rotation={0}
//             lineCap="round"
//           >
//             {() => (
//               <View style={{ alignItems: 'center' }}>
//                 <Ionicons name="walk-outline" size={36} color="#2563eb" style={{ marginBottom: 4 }} />
//                 <Text style={styles.stepsValue}>{steps.toLocaleString()}</Text>
//                 <Text style={styles.stepsGoal}>/ {goal.toLocaleString()} steps</Text>
//               </View>
//             )}
//           </AnimatedCircularProgress>

//           {/* EDIT GOAL */}
//           <TouchableOpacity style={styles.editGoalBtn} onPress={() => setEditingGoal(!editingGoal)}>
//             <Ionicons name="create-outline" size={20} color="#2563eb" />
//             <Text style={{ color: '#2563eb', marginLeft: 4 }}>Edit Goal</Text>
//           </TouchableOpacity>

//           {editingGoal && (
//             <View style={styles.goalInputContainer}>
//               <TextInput
//                 value={inputGoal}
//                 onChangeText={setInputGoal}
//                 keyboardType="numeric"
//                 style={styles.goalInput}
//               />
//               <TouchableOpacity
//                 style={styles.saveGoalBtn}
//                 onPress={() => {
//                   setGoal(Number(inputGoal));
//                   setEditingGoal(false);
//                 }}
//               >
//                 <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>

//         {/* STAT CARDS */}
//         <View style={styles.statsRow}>
//           <View style={styles.statCard}>
//             <Ionicons name="flame-outline" size={26} color="#ef4444" />
//             <Text style={styles.statValue}>{kcal} kcal</Text>
//           </View>
//           <View style={styles.statCard}>
//             <Ionicons name="location-outline" size={26} color="#10b981" />
//             <Text style={styles.statValue}>{distance} km</Text>
//           </View>
//           <View style={styles.statCard}>
//             <Ionicons name="time-outline" size={26} color="#f59e0b" />
//             <Text style={styles.statValue}>{minutes} min</Text>
//           </View>
//         </View>

//         {/* TABS */}
//         <View style={styles.tabsContainer}>
//           <TouchableOpacity
//             style={[styles.tab, selectedTab === 'week' && styles.activeTab]}
//             onPress={() => setSelectedTab('week')}
//           >
//             <Text style={[styles.tabText, selectedTab === 'week' && styles.activeTabText]}>Weekly</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.tab, selectedTab === 'month' && styles.activeTab]}
//             onPress={() => setSelectedTab('month')}
//           >
//             <Text style={[styles.tabText, selectedTab === 'month' && styles.activeTabText]}>Monthly</Text>
//           </TouchableOpacity>
//         </View>

//         {/* CHART */}
//         <View style={styles.chartContainer}>
//           {selectedTab === 'week' ? (
//             <>
//               <Text style={styles.chartTitle}>Weekly Activity</Text>
//               <LineChart
//                 data={{
//                   labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
//                   datasets: [{ data: weeklyData }],
//                 }}
//                 width={screenWidth - 40}
//                 height={220}
//                 chartConfig={chartConfig}
//                 bezier
//                 style={styles.chart}
//               />
//             </>
//           ) : (
//             <>
//               <Text style={styles.chartTitle}>Monthly Statistics</Text>
//               <LineChart
//                 data={{
//                   labels: ['1','2','3','4','5','6','7','8','9','10','11','12'],
//                   datasets: [{ data: monthlyData }],
//                 }}
//                 width={screenWidth - 40}
//                 height={220}
//                 chartConfig={chartConfig}
//                 bezier
//                 style={styles.chart}
//               />
//             </>
//           )}
//         </View>
//       </ScrollView>
//     </Animated.View>
//   );
// }

// // === STYLES ===
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
//   headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700' },
//   progressText: { fontSize: 18, fontWeight: '700', color: '#111', textAlign: 'center', marginTop: 20 },
//   progressContainer: { alignItems: 'center', marginTop: 25 },
//   stepsValue: { fontSize: 34, fontWeight: '700', color: '#111' },
//   stepsGoal: { color: '#6b7280', marginTop: 4 },
//   editGoalBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
//   goalInputContainer: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
//   goalInput: { borderWidth: 1, borderColor: '#ccc', padding: 6, borderRadius: 6, width: 100, textAlign: 'center' },
//   saveGoalBtn: { backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, marginLeft: 8 },
//   statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 },
//   statCard: { alignItems: 'center' },
//   statValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
//   tabsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, backgroundColor: '#f1f5f9', borderRadius: 25, marginHorizontal: 40 },
//   tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 25 },
//   activeTab: { backgroundColor: '#2563eb' },
//   tabText: { color: '#2563eb', fontWeight: '600' },
//   activeTabText: { color: '#fff' },
//   chartContainer: { marginTop: 25, alignItems: 'center' },
//   chartTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 },
//   chart: { borderRadius: 16 },
// });
