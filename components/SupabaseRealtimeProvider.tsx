import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUserLocal, getPetLocal, LocalUser, LocalPet } from '../localDatabase';
import * as Location from 'expo-location';

interface UserLocation {
    latitude: number;
    longitude: number;
    heading: number;
    timestamp: number;
}

interface RemoteUser {
    id: string;
    name: string;
    pet: LocalPet | null;
    location: UserLocation | null;
    imageUri?: string | null;
    isOnline: boolean;
}

interface SupabaseRealtimeContextType {
    remoteUsers: Record<string, RemoteUser>;
    broadcastLocation: (location: UserLocation) => void;
    broadcastSOS: (location: UserLocation, message?: string) => void;
    broadcastSyncInvite: (location: UserLocation) => void;
    broadcastSyncAccept: (targetUserId: string) => void;
    onSyncInvite?: (payload: any) => void;
    onSyncAccept?: (payload: any) => void;
    setOnSyncInvite: (cb: (payload: any) => void) => void;
    setOnSyncAccept: (cb: (payload: any) => void) => void;
}

const SupabaseRealtimeContext = createContext<SupabaseRealtimeContextType | undefined>(undefined);

export const useSupabaseRealtime = () => {
    const context = useContext(SupabaseRealtimeContext);
    if (!context) throw new Error('useSupabaseRealtime must be used within a SupabaseRealtimeProvider');
    return context;
};

export const SupabaseRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [remoteUsers, setRemoteUsers] = useState<Record<string, RemoteUser>>({});
    const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
    const [currentPet, setCurrentPet] = useState<LocalPet | null>(null);
    const channelRef = useRef<any>(null);
    const onSyncInviteRef = useRef<((payload: any) => void) | null>(null);
    const onSyncAcceptRef = useRef<((payload: any) => void) | null>(null);

    useEffect(() => {
        const init = async () => {
            const user = await getCurrentUserLocal();
            const pet = await getPetLocal();
            setCurrentUser(user);
            setCurrentPet(pet);

            // Obter localização real (ou fallback Curitiba/SP) para colocar os bots ao redor
            let baseLat = -25.4330;
            let baseLon = -49.2810;
            try {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
                if (loc) {
                    baseLat = loc.coords.latitude;
                    baseLon = loc.coords.longitude;
                }
            } catch (e) {
                // Ignore fallback
            }

            // Injetar bots para testes de mapa
            const mockBots: Record<string, RemoteUser> = {
                'bot-1': { id: 'bot-1', name: 'Gus', pet: { species: 'puppy' } as any, location: { latitude: baseLat + 0.0015, longitude: baseLon + 0.001, heading: 45, timestamp: Date.now() }, imageUri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop', isOnline: true },
                'bot-2': { id: 'bot-2', name: 'Aline', pet: { species: 'cat' } as any, location: { latitude: baseLat - 0.001, longitude: baseLon - 0.0025, heading: 120, timestamp: Date.now() }, imageUri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isOnline: true },
                'bot-3': { id: 'bot-3', name: 'Marcos', pet: { species: 'bunny' } as any, location: { latitude: baseLat + 0.003, longitude: baseLon - 0.002, heading: 250, timestamp: Date.now() }, imageUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', isOnline: true },
                'bot-4': { id: 'bot-4', name: 'Bia', pet: { species: 'fox' } as any, location: { latitude: baseLat - 0.002, longitude: baseLon + 0.003, heading: 180, timestamp: Date.now() }, imageUri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', isOnline: true },
            };
            setRemoteUsers(mockBots);

            if (user) {
                // Configura o canal de Realtime
                const channel = supabase.channel('world-map', {
                    config: {
                        presence: { key: user.id },
                        broadcast: { self: false }
                    }
                });

                channel
                    .on('presence', { event: 'sync' }, () => {
                        const state = channel.presenceState();
                        // Mapeia o estado de presença para o nosso formato de usuários remotos
                        const users: Record<string, RemoteUser> = {};
                        Object.keys(state).forEach(id => {
                            if (id === user.id) return; // Ignora o próprio usuário
                            const presenceInfo = state[id][0] as any;
                            users[id] = {
                                id,
                                name: presenceInfo.name || 'Explorador',
                                pet: presenceInfo.pet || null,
                                location: presenceInfo.location || null,
                                imageUri: presenceInfo.imageUri || null,
                                isOnline: true
                            };
                        });
                        setRemoteUsers(prev => ({ ...prev, ...users }));
                    })
                    .on('broadcast', { event: 'location' }, ({ payload }) => {
                        // Atualiza a localização de um usuário específico via broadcast
                        setRemoteUsers(prev => {
                            if (!prev[payload.userId]) return prev;
                            return {
                                ...prev,
                                [payload.userId]: {
                                    ...prev[payload.userId],
                                    location: payload.location,
                                    imageUri: payload.imageUri || prev[payload.userId].imageUri,
                                    isOnline: true
                                }
                            };
                        });
                    })
                    .on('broadcast', { event: 'SYNC_INVITE' }, ({ payload }) => {
                        if (onSyncInviteRef.current) onSyncInviteRef.current(payload);
                    })
                    .on('broadcast', { event: 'SYNC_ACCEPT' }, ({ payload }) => {
                        if (onSyncAcceptRef.current && payload.targetUserId === user.id) {
                            onSyncAcceptRef.current(payload);
                        }
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            await channel.track({
                                id: user.id,
                                name: user.name || user.email,
                                pet: pet,
                                imageUri: user.avatar_url || user.imageUri || (user as any).avatar || null,
                                online_at: new Date().toISOString(),
                            });
                        }
                    });

                channelRef.current = channel;
            }
        };

        init();

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
            }
        };
    }, []);

    const broadcastLocation = (location: UserLocation) => {
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'location',
                payload: {
                    userId: currentUser.id,
                    location: location,
                    imageUri: currentUser.avatar_url || currentUser.imageUri || (currentUser as any).avatar || null
                }
            });
        }
    };

    const broadcastSOS = (location: UserLocation, message: string = "Preciso de ajuda!") => {
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'SOS_ALERT',
                payload: {
                    userId: currentUser.id,
                    name: currentUser.name || currentUser.email,
                    location: location,
                    message: message,
                    timestamp: Date.now()
                }
            });
        }
    };

    const broadcastSyncInvite = (location: UserLocation) => {
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'SYNC_INVITE',
                payload: {
                    userId: currentUser.id,
                    name: currentUser.name || currentUser.email,
                    location: location,
                    timestamp: Date.now()
                }
            });
        }
    };

    const broadcastSyncAccept = (targetUserId: string) => {
        if (channelRef.current && currentUser) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'SYNC_ACCEPT',
                payload: {
                    userId: currentUser.id,
                    targetUserId: targetUserId,
                    timestamp: Date.now()
                }
            });
        }
    };

    const setOnSyncInvite = (cb: (payload: any) => void) => { onSyncInviteRef.current = cb; };
    const setOnSyncAccept = (cb: (payload: any) => void) => { onSyncAcceptRef.current = cb; };

    return (
        <SupabaseRealtimeContext.Provider value={{ 
            remoteUsers, 
            broadcastLocation, 
            broadcastSOS,
            broadcastSyncInvite,
            broadcastSyncAccept,
            setOnSyncInvite,
            setOnSyncAccept
        }}>
            {children}
        </SupabaseRealtimeContext.Provider>
    );
};
