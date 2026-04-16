import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image, Text, Pressable } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEB_SIZE = SCREEN_WIDTH * 0.85;
const CENTER = WEB_SIZE / 2;

interface Explorer {
    id: string;
    name: string;
    avatar?: string;
    level?: number;
    species?: string;
    location?: string;
    xp?: number;
}

interface Link {
    from: string;
    to: string;
}

interface NearbyWebProps {
    explorers: Explorer[];
    links?: Link[];
    onSelectExplorer: (explorer: Explorer) => void;
    userAvatar?: string;
    userColor: string;
    userId: string;
}

export const NearbyWeb: React.FC<NearbyWebProps> = ({ 
    explorers, 
    links = [],
    onSelectExplorer, 
    userAvatar,
    userColor,
    userId
}) => {
    // Gera posições orbitais fixas para os exploradores
    const positionsMap = useMemo(() => {
        const map = new Map<string, { x: number, y: number }>();
        
        // Centro (Usuário logado)
        map.set(userId, { x: CENTER, y: CENTER });

        explorers.forEach((ex, index) => {
            const angle = (index / explorers.length) * 2 * Math.PI;
            const radius = (WEB_SIZE / 2) * 0.7; // 70% do raio total
            map.set(ex.id, {
                x: CENTER + radius * Math.cos(angle),
                y: CENTER + radius * Math.sin(angle)
            });
        });
        return map;
    }, [explorers, userId]);

    return (
        <View style={styles.container}>
            <View style={[styles.canvas, { width: WEB_SIZE, height: WEB_SIZE }]}>
                
                {/* SVG para as linhas da teia */}
                <Svg width={WEB_SIZE} height={WEB_SIZE} style={StyleSheet.absoluteFill}>
                    {/* Linhas do Centro para todos (Padrão) */}
                    {explorers.map((ex, i) => {
                        const pos = positionsMap.get(ex.id)!;
                        return (
                            <Line 
                                key={`center-line-${ex.id}`} 
                                x1={CENTER} 
                                y1={CENTER} 
                                x2={pos.x} 
                                y2={pos.y} 
                                stroke={userColor}
                                strokeWidth={1}
                                opacity={0.3}
                            />
                        );
                    })}

                    {/* Linhas de Recomendação (A Teia Social) */}
                    {links.map((link, i) => {
                        const start = positionsMap.get(link.from);
                        const end = positionsMap.get(link.to);
                        if (!start || !end) return null;

                        return (
                            <Line 
                                key={`link-line-${i}`} 
                                x1={start.x} 
                                y1={start.y} 
                                x2={end.x} 
                                y2={end.y} 
                                stroke={userColor}
                                strokeWidth={1}
                                opacity={0.15}
                                strokeDasharray="4 4"
                            />
                        );
                    })}
                </Svg>

                {/* Exploradores (Nós Orbitais) */}
                {explorers.map((explorer, i) => (
                    <ExplorerNode 
                        key={explorer.id}
                        explorer={explorer}
                        pos={positionsMap.get(explorer.id)!}
                        onPress={() => onSelectExplorer(explorer)}
                    />
                ))}

                {/* Centro (Usuário) */}
                <View style={[styles.centerNode, { borderColor: userColor }]}>
                    {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={styles.avatarImg} />
                    ) : (
                        <Ionicons name="person" size={30} color={userColor} />
                    )}
                </View>

            </View>
            
            <View style={styles.footer}>
                <Ionicons name="pulse" size={16} color={userColor} />
                <Text style={styles.footerText}>Visualizando a teia social de confiança...</Text>
            </View>
        </View>
    );
};

// Componente secundário para o Nó
const ExplorerNode = ({ explorer, pos, onPress }: any) => {
    return (
        <View style={[
            styles.nodeContainer, 
            { left: pos.x - 30, top: pos.y - 30 }
        ]}>
            <Pressable onPress={onPress}>
                <View style={styles.nodeWrapper}>
                    <View style={styles.nodeBadge}>
                        <Text style={styles.badgeText}>Lv {explorer.level || 1}</Text>
                    </View>
                    <View style={styles.nodeAvatar}>
                        {explorer.avatar ? (
                            <Image source={{ uri: explorer.avatar }} style={styles.nodeImg} />
                        ) : (
                            <Text style={styles.initialText}>{(explorer.name || '?')[0]}</Text>
                        )}
                    </View>
                    <View style={styles.nodeLabel}>
                        <Text style={styles.nodeName} numberOfLines={1}>{explorer.name}</Text>
                    </View>
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    canvas: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerNode: {
        width: 85,
        height: 85,
        borderRadius: 43,
        backgroundColor: '#FFF',
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10,
    },
    avatarImg: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    nodeContainer: {
        position: 'absolute',
        zIndex: 5,
    },
    nodeWrapper: {
        alignItems: 'center',
    },
    nodeAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F0FF',
        borderWidth: 3,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    nodeImg: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    initialText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6366F1',
    },
    nodeBadge: {
        position: 'absolute',
        top: -10,
        right: -5,
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#5C4033',
    },
    nodeLabel: {
        marginTop: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    nodeName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#5C4033',
    },
    footerStatus: {
        marginTop: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 12,
        color: '#9B7B6A',
        fontStyle: 'italic',
    },
    footer: {
        marginTop: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    }
});
