import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ProfilePictureScreen({ navigation, route }) {
  const [profileImage, setProfileImage] = useState(null);

  const handleImagePick = async () => {
    Alert.alert(
      'Add Picture',
      'Choose an option',
      [
        { 
          text: 'Take Photo', 
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera permission is required to take photos');
              return;
            }
            
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            
            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        { 
          text: 'Choose from Gallery', 
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Gallery permission is required to select photos');
              return;
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            
            if (!result.canceled) {
              setProfileImage(result.assets[0].uri);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleAddPicture = () => {
    // Save profile data and navigate to Success or Home
    const profileData = {
      ...route.params,
      profileImage,
      isRegistration: true // New user registration
    };
    navigation.navigate('Success', profileData);
  };

  const handleSkip = () => {
    navigation.navigate('Success', { ...route.params, isRegistration: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Add a profile picture</Text>
        
        <Text style={styles.subtitle}>
          Add a profile picture so your bills will display your shop logo when printing invoice bills.
        </Text>

        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={handleImagePick}
          activeOpacity={0.7}
        >
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="person" size={80} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleAddPicture}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Add picture</Text>
        </TouchableOpacity>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <Image 
            source={require('../assets/logo.png')} 
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerText}>viveha.ai</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  skipButton: {
    padding: 4,
  },
  skipText: {
    fontSize: 15,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  subtitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 40,
    lineHeight: 20,
    alignSelf: 'flex-start',
  },
  imageContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    marginBottom: 40,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    backgroundColor: '#D5C5C5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  footerLogo: {
    width: 18,
    height: 18,
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
});
