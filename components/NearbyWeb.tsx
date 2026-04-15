import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image, Text, Pressable } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    withDelay,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
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

const AnimatedLine = Animated.createAnimatedComponent(Line);

export const NearbyWeb: React.FC<NearbyWebProps> = ({ 
    explorers, 
    links = [],
    onSelectExplorer, 
    userAvatar,
    userColor,
    userId
}) => {
    const pulse = useSharedValue(0);

    useEffect(() => {
        pulse.value = withRepeat(
            withTiming(1, { duration: 3000 }),
            -1,
            true
        );
    }, []);

    // Gera posições orbitais fixas para os exploradores
    const positionsMap = useMemo(() => {
        const map = new Map<string, { x: number, y: number, delay: number }>();
        
        // Centro (Usuário logado)
        map.set(userId, { x: CENTER, y: CENTER, delay: 0 });

        explorers.forEach((ex, index) => {
            const angle = (index / explorers.length) * 2 * Math.PI;
            const radius = (WEB_SIZE / 2) * 0.7; // 70% do raio total
            map.set(ex.id, {
                x: CENTER + radius * Math.cos(angle),
                y: CENTER + radius * Math.sin(angle),
                delay: (index + 1) * 200
            });
        });
        return map;
    }, [explorers, userId]);

    const explorerPositions = explorers.map(ex => positionsMap.get(ex.id)!);

    return (
        <View style={styles.container}>
            <View style={[styles.canvas, { width: WEB_SIZE, height: WEB_SIZE }]}>
                
                {/* SVG para as linhas da teia */}
                <Svg width={WEB_SIZE} height={WEB_SIZE} style={StyleSheet.absoluteFill}>
                    {/* Linhas do Centro para todos (Padrão) */}
                    {explorers.map((ex, i) => {
                        const pos = positionsMap.get(ex.id)!;
                        return (
                            <WebLine 
                                key={`center-line-${ex.id}`} 
                                startX={CENTER} 
                                startY={CENTER} 
                                endX={pos.x} 
                                endY={pos.y} 
                                pulse={pulse}
                                delay={pos.delay}
                                color={userColor}
                            />
                        );
                    })}

                    {/* Linhas de Recomendação (A Teia Social) */}
                    {links.map((link, i) => {
                        const start = positionsMap.get(link.from);
                        const end = positionsMap.get(link.to);
                        if (!start || !end) return null;

                        return (
                            <WebLine 
                                key={`link-line-${i}`} 
                                startX={start.x} 
                                startY={start.y} 
                                endX={end.x} 
                                endY={end.y} 
                                pulse={pulse}
                                delay={0}
                                color={userColor}
                                isSecondary
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

// Componente secundário para a Linha Animada
const WebLine = ({ startX, startY, endX, endY, pulse, delay, color, isSecondary }: any) => {
    const animatedProps = useAnimatedStyle(() => ({
        opacity: interpolate(pulse.value, [0, 1], isSecondary ? [0.05, 0.2] : [0.1, 0.4]),
        strokeWidth: interpolate(pulse.value, [0, 1], isSecondary ? [1, 1.5] : [1, 2]),
    }));

    return (
        <AnimatedLine 
            x1={startX} 
            y1={startY} 
            x2={endX} 
            y2={endY} 
            stroke={color}
            strokeDasharray={isSecondary ? "4 4" : undefined}
            animatedProps={animatedProps as any}
        />
    );
};

// Componente secundário para o Nó Animado
const ExplorerNode = ({ explorer, pos, onPress }: any) => {
    const float = useSharedValue(0);

    useEffect(() => {
        float.value = withDelay(
            pos.delay,
            withRepeat(
                withTiming(1, { duration: 2500 }),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(float.value, [0, 1], [-8, 8]) },
            { scale: interpolate(float.value, [0, 1], [1, 1.1]) }
        ],
        opacity: interpolate(float.value, [0, 0.2], [0, 1], Extrapolate.CLAMP)
    }));

    return (
        <Animated.View style={[
            styles.nodeContainer, 
            { left: pos.x - 30, top: pos.y - 30 },
            animatedStyle
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
        </Animated.View>
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
