import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingScreen4Props {
  navigation: any;
}

export default function OnboardingScreen4({ navigation }: OnboardingScreen4Props): React.JSX.Element {
  const [showBrandLogo, setShowBrandLogo] = useState<boolean>(true);
  const [showGSTUIN, setShowGSTUIN] = useState<boolean>(true);
  const [showQRCode, setShowQRCode] = useState<boolean>(true);
  const [selectedLayout, setSelectedLayout] = useState<string>('Modern');

  const handleNext = () => {
    navigation.navigate('Home');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name={("arrow-back" as any)} size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Invoice Customization</Text>
          <Text style={styles.subtitle}>Real-Time Preview</Text>
          
          {/* Invoice Preview */}
          <View style={styles.invoicePreview}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>

          {/* Layout Style */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Layout Style</Text>
            <View style={styles.layoutOptions}>
              <TouchableOpacity 
                style={[styles.layoutButton, selectedLayout === 'Classic' && styles.layoutButtonInactive]}
                onPress={() => setSelectedLayout('Classic')}
              >
                <Text style={[styles.layoutText, selectedLayout === 'Classic' && styles.layoutTextInactive]}>Classic</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.layoutButton, selectedLayout === 'Modern' && styles.layoutButtonActive]}
                onPress={() => setSelectedLayout('Modern')}
              >
                <Text style={[styles.layoutText, selectedLayout === 'Modern' && styles.layoutTextActive]}>Modern</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.layoutButton, selectedLayout === 'Compact' && styles.layoutButtonInactive]}
                onPress={() => setSelectedLayout('Compact')}
              >
                <Text style={[styles.layoutText, selectedLayout === 'Compact' && styles.layoutTextInactive]}>Compact</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Toggle Options */}
          <View style={styles.toggleSection}>
            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Ionicons name={("image-outline" as any)} size={20} color="#666" />
                <Text style={styles.toggleText}>Show Brand Logo</Text>
              </View>
              <Switch
                value={showBrandLogo}
                onValueChange={setShowBrandLogo}
                trackColor={{ false: '#E0E0E0', true: '#D0D0D0' }}
                thumbColor={showBrandLogo ? '#FFF' : '#FFF'}
              />
            </View>

            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Ionicons name={("document-text-outline" as any)} size={20} color="#666" />
                <Text style={styles.toggleText}>Show GST/UIN</Text>
              </View>
              <Switch
                value={showGSTUIN}
                onValueChange={setShowGSTUIN}
                trackColor={{ false: '#E0E0E0', true: '#D0D0D0' }}
                thumbColor={showGSTUIN ? '#FFF' : '#FFF'}
              />
            </View>

            <View style={styles.toggleItem}>
              <View style={styles.toggleLeft}>
                <Ionicons name={("qr-code-outline" as any)} size={20} color="#666" />
                <Text style={styles.toggleText}>Show QR Code</Text>
              </View>
              <Switch
                value={showQRCode}
                onValueChange={setShowQRCode}
                trackColor={{ false: '#E0E0E0', true: '#D0D0D0' }}
                thumbColor={showQRCode ? '#FFF' : '#FFF'}
              />
            </View>
          </View>

          {/* Color Palette */}
          <View style={styles.colorSection}>
            <View style={styles.colorPalette}>
              <TouchableOpacity style={[styles.colorDot, { backgroundColor: '#5B8DEF' }]} />
              <TouchableOpacity style={[styles.colorDot, { backgroundColor: '#FF8A50' }]} />
              <TouchableOpacity style={[styles.colorDot, { backgroundColor: '#8B7FD9' }]} />
              <TouchableOpacity style={[styles.colorDot, { backgroundColor: '#E85D7C' }]} />
              <TouchableOpacity style={styles.editIcon}>
                <Ionicons name={("create-outline" as any)} size={18} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <TouchableOpacity style={styles.changeImageButton}>
              <Ionicons name={("cloud-upload-outline" as any)} size={20} color="#5B8DEF" />
              <Text style={styles.changeImageText}>Change Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteIcon}>
              <Ionicons name={("trash-outline" as any)} size={20} color="#E85D7C" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.uploadDescription}>
            Supported formats: PNG, JPG, Max size 2MB.{'\n'}
            transparent background recommended
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
        <Text style={styles.branding}>✓ viveha.ai</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  backButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 25,
    paddingBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  invoicePreview: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  layoutOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  layoutButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  layoutButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  layoutButtonInactive: {
    backgroundColor: '#fff',
    borderColor: '#E0E0E0',
  },
  layoutText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  layoutTextActive: {
    color: '#fff',
  },
  layoutTextInactive: {
    color: '#999',
  },
  toggleSection: {
    marginBottom: 20,
  },
  toggleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  colorSection: {
    marginBottom: 20,
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  editIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  uploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  changeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeImageText: {
    fontSize: 14,
    color: '#5B8DEF',
    fontWeight: '500',
  },
  deleteIcon: {
    padding: 5,
  },
  uploadDescription: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 25,
  },
  footer: {
    paddingHorizontal: 25,
    paddingBottom: 50,
    paddingTop: 15,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  button: {
    backgroundColor: '#FF8A65',
    paddingVertical: 16,
    width: '100%',
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  branding: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '500',
  },
});
