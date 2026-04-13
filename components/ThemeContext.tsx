import React, { createContext, useContext, useState, useEffect } from 'react';
import { getThemeLocal, saveThemeLocal } from '../localDatabase';

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

interface ThemeContextType {
    theme: ThemeType;
    colors: ThemeColors;
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeType>('light');

    useEffect(() => {
        async function loadTheme() {
            const saved = await getThemeLocal();
            setTheme(saved);
        }
        loadTheme();
    }, []);

    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        saveThemeLocal(next);
    };

    const colors = theme === 'light' ? LightTheme : DarkTheme;

    return (
        <ThemeContext.Provider value={{ theme, colors, isDarkMode: theme === 'dark', toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}
