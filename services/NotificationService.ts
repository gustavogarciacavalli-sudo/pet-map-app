import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';

// Configuração básica do comportamento das notificações enquanto o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const NotificationService = {
    /**
     * Solicita permissão para notificações push
     * Retorna { granted: boolean, status: string }
     */
    requestPermissions: async () => {
        try {
            if (!Device.isDevice) {
                console.warn('Notificações não funcionam em emuladores.');
                return { granted: true, status: 'emulator' }; // Permitimos em emulador para não travar a UI
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                return { granted: false, status: finalStatus };
            }

            // No Android, precisamos de um canal de notificação
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#7C3AED',
                });
            }

            return { granted: true, status: finalStatus };
        } catch (error) {
            console.error('Erro ao solicitar permissões de notificação:', error);
            // Retorna falso no erro para que a UI possa lidar com a falha
            return { granted: false, status: 'error' };
        }
    },

    /**
     * Verifica o estado atual da permissão
     */
    checkPermissions: async () => {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            return false;
        }
    }
};
