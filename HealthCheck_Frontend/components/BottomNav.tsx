import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Explore: undefined;
  Login: undefined;
};

export default function BottomNav() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();

  const current = route.name; // lấy tên screen hiện tại

  const items = [
    { name: 'Home', icon: 'home-outline' },
    { name: 'Explore', icon: 'compass-outline' },
    { name: 'Profile', icon: 'person-circle-outline', navigateTo: 'Login' },
  ];

  return (
    <View style={styles.navBar}>
      {items.map((item) => {
        const isActive =
          current === item.name || (item.name === 'Profile' && current === 'Login');
        const color = isActive ? '#2563eb' : '#666';

        return (
          <TouchableOpacity
            key={item.name}
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.navigateTo || (item.name as any))}
          >
            <Ionicons name={item.icon as any} size={26} color={color} />
            <Text style={[styles.navLabel, { color }]}>{item.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 10,
  },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 13, marginTop: 4 },
});
