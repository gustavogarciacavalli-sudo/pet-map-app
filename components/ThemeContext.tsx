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
    background: '#FFFDF7',
    card: '#FFFFFF',
    border: '#F0E5D8',
    text: '#5C4033',
    subtext: '#9B7B6A',
    primary: '#7DBF72',
    accent: '#FFD700',
    tabBg: '#FFFDF7',
    sky: '#D4ECFF',
    grass: '#7DBF72'
};

const DarkTheme: ThemeColors = {
    background: '#1A1A1A',
    card: '#2D2D2D',
    border: '#3D3D3D',
    text: '#F5F5F5',
    subtext: '#A0A0A0',
    primary: '#95D58B',
    accent: '#FFD700',
    tabBg: '#1A1A1A',
    sky: '#0B132B',
    grass: '#2D3A1F'
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
