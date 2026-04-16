import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

interface ToastOptions {
    message: string;
    type?: 'success' | 'error' | 'info';
    icon?: keyof typeof Ionicons.glyphMap;
}

interface ToastContextType {
    showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { colors, isDarkMode } = useTheme();
    const [options, setOptions] = useState<ToastOptions>({ message: '', type: 'info' });
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const hideTimeout = useRef<any>(null);

    const showToast = useCallback((newOptions: ToastOptions) => {
        // Cancela timeout anterior se existir
        if (hideTimeout.current) clearTimeout(hideTimeout.current);

        setOptions(newOptions);

        // Animação de Entrada
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(slideAnim, { 
                toValue: Platform.OS === 'ios' ? 60 : 30, 
                friction: 7, 
                tension: 40, 
                useNativeDriver: true 
            }),
        ]).start();

        // Auto-hide após 3.5 segundos
        hideTimeout.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: -120, duration: 400, useNativeDriver: true }),
            ]).start();
        }, 3500);
    }, [fadeAnim, slideAnim]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            <View style={{ flex: 1 }}>
                {children}
                
                {/* Overlay de Alerta SEMPRE MONTADO para evitar perda de sincronia visual */}
                <Animated.View 
                    pointerEvents="none"
                    style={[
                        styles.pillContainer,
                        { 
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: isDarkMode ? '#2A2A36' : '#FFFFFF',
                            borderColor: colors.border,
                            zIndex: 99999, // Z-Index altíssimo
                        }
                    ]}
                >
                    <View style={styles.content}>
                        <Ionicons 
                            name={options.icon || (options.type === 'error' ? 'alert-circle' : 'notifications')} 
                            size={20} 
                            color={options.type === 'error' ? '#FF5252' : colors.primary} 
                        />
                        <Text style={[styles.message, { color: colors.text }]}>{options.message}</Text>
                    </View>
                </Animated.View>
            </View>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}

const styles = StyleSheet.create({
    pillContainer: {
        position: 'absolute',
        top: 0,
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 30,
        borderWidth: 1.5,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        minWidth: '70%',
        maxWidth: '92%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    message: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    }
});
