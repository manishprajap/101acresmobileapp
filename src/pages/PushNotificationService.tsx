import React, { useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const PushNotificationService: React.FC = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const createNotificationChannel = async () => {
      if (Capacitor.getPlatform() !== 'android') return;
      try {
        await PushNotifications.createChannel({
          id: 'default',
          name: 'Default',
          description: 'General app notifications',
          importance: 5, // MAX importance so it shows as heads-up/banner
          visibility: 1,
          vibration: true,
        });
      } catch (err) {
        console.error('Channel creation error:', err);
      }
    };

    const registerPush = async () => {
      const permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive !== 'granted') {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive !== 'granted') return;
      }
      await PushNotifications.register();
    };

    const requestLocalNotifPermission = async () => {
      const localPerm = await LocalNotifications.checkPermissions();
      if (localPerm.display !== 'granted') {
        await LocalNotifications.requestPermissions();
      }
    };

    // Downloads a remote image and returns a local file:// path Capacitor can use
    const downloadImage = async (url: string): Promise<string | null> => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();

        const base64Data: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const fileName = `notif_${Date.now()}.png`;

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        return savedFile.uri;
      } catch (err) {
        console.error('Image download error:', err);
        return null;
      }
    };

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('✅ FCM Token:', token.value);
      localStorage.setItem('fcmToken', token.value);
    });

    PushNotifications.addListener('registrationError', (err: any) => {
      console.error('❌ FCM Registration Error:', err);
    });

    // This only fires when the app is in FOREGROUND.
    // Background/killed state is now handled natively by FCM's
    // `notification` payload (see backend route.ts) + the manifest
    // meta-data tags — no JS execution needed for that case.
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('🔔 Notification received (foreground):', notification);

      try {
        const notificationId = Math.floor(Math.random() * 999999) + 1;

        const title = notification.data?.title || notification.title || 'Notification';
        const body = notification.data?.body || notification.body || '';
        const imageUrl = notification.data?.imageUrl || null;

        let attachments: { id: string; url: string }[] | undefined;

        if (imageUrl) {
          const localPath = await downloadImage(imageUrl);
          if (localPath) {
            attachments = [{ id: 'notif-image', url: localPath }];
          }
        }

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body,
              smallIcon: 'ic_stat_logo1',
              iconColor: '#1E7A46',
              channelId: 'default',
              ...(attachments ? { attachments } : {}),
              largeIcon: attachments ? attachments[0].url : undefined,
            },
          ],
        });
      } catch (err) {
        console.error('Local notification schedule error:', err);
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('👆 Notification tapped:', action);
    });

    createNotificationChannel();
    registerPush();
    requestLocalNotifPermission();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return null;
};

export default PushNotificationService;