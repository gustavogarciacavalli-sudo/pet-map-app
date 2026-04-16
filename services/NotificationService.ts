import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configuração básica do comportamento das notificações enquanto o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
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
    },

    /**
     * Obtém o token do dispositivo para notificações push
     */
    getPushTokenAsync: async () => {
        try {
            if (!Device.isDevice) return null;

            // No SDK 53/54, o Expo Go não suporta mais notificações push no Android.
            // É necessário um 'Development Build' para testar.
            if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
                console.warn('Push Notifications não são suportadas no Expo Go (Android) no SDK 54. Use um Development Build.');
                return null;
            }

            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.warn('Project ID não encontrado em app.json/Constants.');
            }

            const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            return token;
        } catch (e) {
            console.error('Erro ao gerar push token:', e);
            return null;
        }
    },

    /**
     * Configura ouvintes para notificações recebidas (foreground e background)
     */
    setupListeners: (onReceived?: (notif: Notifications.Notification) => void, onClicked?: (resp: Notifications.NotificationResponse) => void) => {
        const receivedSub = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
            console.log('Notificação Recebida:', notification);
            if (onReceived) onReceived(notification);
        });

        const responseSub = Notifications.addNotificationResponseReceivedListener((response: Notifications.NotificationResponse) => {
            console.log('Notificação Clicada:', response);
            if (onClicked) onClicked(response);
        });

        return () => {
            receivedSub.remove();
            responseSub.remove();
        };
    }
};
