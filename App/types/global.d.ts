// Type declarations for modules without built-in TypeScript support

declare module '@expo/vector-icons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: any;
    size?: number;
    color?: string;
  }

  export class Ionicons extends Component<IconProps> {}
  export class MaterialIcons extends Component<IconProps> {}
  export class FontAwesome extends Component<IconProps> {}
  export class MaterialCommunityIcons extends Component<IconProps> {}
  export class Entypo extends Component<IconProps> {}
  export class AntDesign extends Component<IconProps> {}
  export class Feather extends Component<IconProps> {}
}

declare module 'expo-linear-gradient' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    locations?: number[];
  }

  export class LinearGradient extends Component<LinearGradientProps> {}
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}

// NetworkManager is now a TypeScript file - types are exported directly from it

// Footer component types
declare module '../Components/Footer' {
  import { FC } from 'react';
  
  interface FooterProps {
    activeTab: string;
    navigation: any;
  }
  
  const Footer: FC<FooterProps>;
  export default Footer;
}

// API URL
declare module '../api' {
  const apiurl: string;
  export default apiurl;
}

// React Native Toast Message
declare module 'react-native-toast-message' {
  export interface ToastShowParams {
    type: 'success' | 'error' | 'info';
    text1?: string;
    text2?: string;
    position?: 'top' | 'bottom';
    visibilityTime?: number;
  }

  const Toast: {
    show(params: ToastShowParams): void;
  };

  export default Toast;
}

// SyncIndicator component
declare module '../Components/SyncIndicator' {
  import { FC } from 'react';
  
  interface SyncIndicatorProps {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
  }
  
  const SyncIndicator: FC<SyncIndicatorProps>;
  export default SyncIndicator;
}
