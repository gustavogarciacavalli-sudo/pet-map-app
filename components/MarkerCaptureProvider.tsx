import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';

interface CaptureItem {
  id: string;
  component: React.ReactNode;
  options?: { width: number; height: number };
}

interface MarkerCaptureContextType {
  registerMarker: (id: string, component: React.ReactNode, options?: { width: number; height: number }) => Promise<string | null>;
  unregisterMarker: (id: string) => void;
}

const MarkerCaptureContext = createContext<MarkerCaptureContextType | null>(null);

export const useMarkerCapture = () => {
  const context = useContext(MarkerCaptureContext);
  if (!context) throw new Error('useMarkerCapture must be used within a MarkerCaptureProvider');
  return context;
};

const globalImageCache: Record<string, string> = {};

export const MarkerCaptureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [captureQueue, setCaptureQueue] = useState<CaptureItem[]>([]);
  const viewShotRefs = useRef<Record<string, ViewShot | null>>({});
  const captureCallbacks = useRef<Record<string, (uri: string) => void>>({});

  const registerMarker = useCallback((id: string, component: React.ReactNode, options?: { width: number; height: number }) => {
    return new Promise<string | null>((resolve) => {
      if (globalImageCache[id]) {
        resolve(globalImageCache[id]);
        return;
      }

      captureCallbacks.current[id] = (uri) => {
        globalImageCache[id] = uri;
        setCaptureQueue(prev => prev.filter(item => item.id !== id));
        resolve(uri);
      };

      setCaptureQueue(prev => [...prev, { id, component, options }]);
    });
  }, []);

  const unregisterMarker = useCallback((id: string) => {
    setCaptureQueue(prev => prev.filter(item => item.id !== id));
    delete captureCallbacks.current[id];
  }, []);

  const onCapture = (id: string, uri: string) => {
    if (captureCallbacks.current[id]) {
      captureCallbacks.current[id](uri);
      delete captureCallbacks.current[id];
    }
  };

  // Efeito para disparar a captura manual após um delay (para carregar imagens)
  useEffect(() => {
    captureQueue.forEach(item => {
      const timer = setTimeout(async () => {
        const ref = viewShotRefs.current[item.id];
        if (ref && ref.capture) {
          try {
            const uri = await ref.capture();
            onCapture(item.id, uri);
          } catch (e) {
            console.error('Capture failed for', item.id, e);
          }
        }
      }, 800); // 800ms de folga para carregar imagens remotas
      return () => clearTimeout(timer);
    });
  }, [captureQueue]);

  return (
    <MarkerCaptureContext.Provider value={{ registerMarker, unregisterMarker }}>
      {children}
      <View style={styles.hiddenArea} pointerEvents="none">
        {captureQueue.map(item => (
          <View 
            key={item.id} 
            style={[
              styles.captureContainer, 
              item.options ? { width: item.options.width, height: item.options.height } : null
            ]}
          >
            <ViewShot
              ref={ref => { viewShotRefs.current[item.id] = ref; }}
              options={{ format: 'png', quality: 1.0 }}
            >
              {item.component}
            </ViewShot>
          </View>
        ))}
      </View>
    </MarkerCaptureContext.Provider>
  );
};

const styles = StyleSheet.create({
  hiddenArea: {
    position: 'absolute',
    top: -2000,
    left: -2000,
    opacity: 0,
  },
  captureContainer: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
});
