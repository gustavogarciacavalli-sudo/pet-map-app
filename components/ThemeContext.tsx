import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform, LayoutAnimation, UIManager, View } from 'react-native';
import { getThemeLocal, saveThemeLocal, getSettingsLocal } from '../localDatabase';

// Ativa animações no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ThemeType = 'light' | 'dark';

interface ThemeColors {
    background: string;
    card: string;
    border: string;
    text: string;
    subtext: string;
    primary: string;
    accent: string;
    tabBg: string;
    sky: string;
    grass: string;
}

const LightTheme: ThemeColors = {
    background: '#F7F7FA',
    card: '#FFFFFF',
    border: '#EEEDF2',
    text: '#1A1A2E',
    subtext: '#8E8E9A',
    primary: '#7C3AED',
    accent: '#E8DEF8',
    tabBg: '#FFFFFF',
    sky: '#F0EDFA',
    grass: '#E8DEF8'
};

const DarkTheme: ThemeColors = {
    background: '#121218',
    card: '#1C1C24',
    border: '#2A2A36',
    text: '#EEEDF2',
    subtext: '#6E6E7E',
    primary: '#9B6BF7',
    accent: '#2D2440',
    tabBg: '#1C1C24',
    sky: '#0E0E18',
    grass: '#1A1528'
};

function lerpColor(c1: string, c2: string, factor: number) {
    try {
        if (!c1.startsWith('#') || !c2.startsWith('#')) return c1;
        
        const r1 = parseInt(c1.substring(1, 3), 16);
        const g1 = parseInt(c1.substring(3, 5), 16);
        const b1 = parseInt(c1.substring(5, 7), 16);

        const r2 = parseInt(c2.substring(1, 3), 16);
        const g2 = parseInt(c2.substring(3, 5), 16);
        const b2 = parseInt(c2.substring(5, 7), 16);

        if (isNaN(r1) || isNaN(r2)) return c1;

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        return c1;
    }
}

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeType>('light');
    const [currentColors, setCurrentColors] = useState<ThemeColors>(LightTheme);
    const animationFrameRef = useRef<number | null>(null);
    const [batterySaver, setBatterySaver] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function loadData() {
            const savedTheme = await getThemeLocal();
            const settings = await getSettingsLocal();
            if (isMounted) {
                setTheme(savedTheme);
                setCurrentColors(savedTheme === 'light' ? LightTheme : DarkTheme);
                setBatterySaver(settings.batterySaver || false);
            }
        }
        loadData();
        return () => { isMounted = false; };
    }, []);

    const toggleTheme = async () => {
        // Recarrega o estado de bateria para garantir precisão
        const settings = await getSettingsLocal();
        const isBatterySaving = settings.batterySaver || false;
        setBatterySaver(isBatterySaving);

        const next = theme === 'light' ? 'dark' : 'light';
        const startColors = theme === 'light' ? LightTheme : DarkTheme;
        const endColors = next === 'light' ? LightTheme : DarkTheme;
        
        const duration = 250; 
        const startTime = Date.now();
        let lastFrameTime = startTime;

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Lógica de Throttling (30 FPS Simulation)
            // Se estiver em modo bateria, só atualiza se passou ~33ms do último frame
            if (isBatterySaving && (now - lastFrameTime < 33) && progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            lastFrameTime = now;
            
            const interpolated: ThemeColors = {
                background: lerpColor(startColors.background, endColors.background, progress),
                card: lerpColor(startColors.card, endColors.card, progress),
                border: lerpColor(startColors.border, endColors.border, progress),
                text: lerpColor(startColors.text, endColors.text, progress),
                subtext: lerpColor(startColors.subtext, endColors.subtext, progress),
                primary: lerpColor(startColors.primary, endColors.primary, progress),
                accent: lerpColor(startColors.accent, endColors.accent, progress),
                tabBg: lerpColor(startColors.tabBg, endColors.tabBg, progress),
                sky: lerpColor(startColors.sky, endColors.sky, progress),
                grass: lerpColor(startColors.grass, endColors.grass, progress),
            };

            setCurrentColors(interpolated);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                setTheme(next);
                saveThemeLocal(next);
                setCurrentColors(endColors);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        if (Platform.OS !== 'web') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, colors: currentColors, isDarkMode: theme === 'dark', toggleTheme }}>
            <View style={{ flex: 1, backgroundColor: currentColors.background }}>
                {children}
            </View>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}
