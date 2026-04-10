// app/index.tsx
import { Redirect } from 'expo-router';

export default function StartPage() {
  // Esse é o nosso guarda de trânsito: joga quem abrir o app direto pro Login!
  return <Redirect href="/login" />;
}