import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { getCoinsLocal, saveCoinsLocal, updatePetAccessoryLocal, addXPLocal, getEnergyLocal, saveEnergyLocal } from '../../localDatabase';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../components/ThemeContext';

const SHOP_ITEMS = [
    { id: 'bow', name: 'Laço Rosa', price: 50, emoji: '🎀', category: 'Acessório' },
    { id: 'hat', name: 'Cartola Luxo', price: 120, emoji: '🎩', category: 'Acessório' },
    { id: 'glasses', name: 'Óculos Nerd', price: 80, emoji: '🤓', category: 'Acessório' },
    { id: 'flower', name: 'Flor de Sakura', price: 60, emoji: '🌸', category: 'Acessório' },
    { id: 'apple', name: 'Maçã Suculenta', price: 15, emoji: '🍎', category: 'Comida' },
    { id: 'milk', name: 'Leite Morno', price: 10, emoji: '🥛', category: 'Bebida' },
];

export default function ShopScreen() {
    const { colors, isDarkMode } = useTheme();
    const [coins, setCoins] = useState(0);

    // Atualiza o saldo toda vez que a tela ganha foco
    useFocusEffect(
        React.useCallback(() => {
            async function load() {
                const amount = await getCoinsLocal();
                setCoins(amount);
            }
            load();
        }, [])
    );

    const handleBuy = async (item: typeof SHOP_ITEMS[0]) => {
        if (coins < item.price) {
            Alert.alert('Saldo Insuficiente! 🪙', 'Cumpra mais missões para ganhar PetCoins.');
            return;
        }

        const newBalance = coins - item.price;
        await saveCoinsLocal(newBalance);
        setCoins(newBalance);

        // Se for um acessório, equipa no bicho imediatamente
        if (item.category === 'Acessório') {
            await updatePetAccessoryLocal(item.id);
            const xpResult = await addXPLocal(50);
            const msg = xpResult.leveledUp ? `\n\n🚀 LEVEL UP! Seu pet subiu para o nível ${xpResult.level}!` : "";
            Alert.alert('Compra realizada! ✨', `${item.name} foi equipado no seu pet.${msg}`);
        } else {
            // Lógica de Alimentação / Energia
            const currentEnergy = await getEnergyLocal();
            const boost = item.id === 'apple' ? 30 : 20;
            const newEnergy = Math.min(100, currentEnergy + boost);
            await saveEnergyLocal(newEnergy);
            
            const xpResult = await addXPLocal(30);
            const msg = xpResult.leveledUp ? `\n\n🚀 LEVEL UP! Seu pet subiu para o nível ${xpResult.level}!` : "";
            Alert.alert('Delícia! 😋', `Seu pet consumiu ${item.name} e recuperou ${boost}% de energia!${msg}`);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Loja Wander 🛍️</Text>
                    <Text style={[styles.subtitle, { color: colors.subtext }]}>Itens raros para seu amigo!</Text>
                </View>
                <View style={[styles.coinBadge, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F9F2E8', borderColor: colors.border }]}>
                    <FontAwesome5 name="coins" size={14} color="#FFD700" />
                    <Text style={[styles.coinText, { color: colors.text }]}>{coins}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.grid}>
                    {SHOP_ITEMS.map(item => (
                        <Pressable key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleBuy(item)}>
                            <View style={[styles.itemEmojiBg, { backgroundColor: isDarkMode ? '#3D3D3D' : '#F9F9F9' }]}>
                                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                            </View>
                            <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.itemCategory, { color: colors.subtext }]}>{item.category}</Text>
                            <View style={styles.priceRow}>
                                <FontAwesome5 name="coins" size={12} color="#FFD700" />
                                <Text style={[styles.priceText, { color: colors.text }]}>{item.price}</Text>
                            </View>
                            <View style={[styles.buyBtn, { backgroundColor: colors.primary }]}>
                                <Text style={[styles.buyBtnText, { color: isDarkMode ? '#1A1A1A' : 'white' }]}>Comprar</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '600' },
    coinBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 2, gap: 6 },
    coinText: { fontSize: 14, fontWeight: '800' },
    
    scroll: { padding: 18 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    card: { width: '48%', borderRadius: 24, padding: 16, borderWidth: 2, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    itemEmojiBg: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    itemEmoji: { fontSize: 40 },
    itemName: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
    itemCategory: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginVertical: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    priceText: { fontSize: 14, fontWeight: '800' },
    buyBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 15, width: '100%', alignItems: 'center' },
    buyBtnText: { fontWeight: '900', fontSize: 12 },
});
