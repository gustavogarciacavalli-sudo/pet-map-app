# WanderPet 🐾 - Social Pet Adventure

WanderPet é uma plataforma de aventura gamificada onde o mundo real se torna um tabuleiro interativo. Explore o mapa, capture tesouros, entre em clãs e interaja com outros exploradores em tempo real com uma interface **Ultra Premium** inspirada nos melhores apps de geolocalização do mundo.

---

## 🌟 Visão do Projeto
O foco absoluto do WanderPet é a **estabilidade extrema** aliada a uma experiência visual de tirar o fôlego. Implementamos mecânicas de "Liquid Map Animation" (estilo Zenly/WhatsApp) e um ecossistema social centralizado no mapa para garantir imersão total.

> [!IMPORTANT]
> **PERFORMANCE & ESTABILIDADE**: O app foi otimizado para rodar a 60 FPS estáveis no **Expo Go (SDK 54)**, utilizando renderização nativa e gerenciamento inteligente de memória para evitar crashes em dispositivos de entrada.

---

## 🚀 Funcionalidades Premium

### 🗺️ Ecossistema de Mapa Vivo
- **Liquid Markers**: Animações orgânicas de "pop-in" e "merge" para marcadores de usuários e pets.
- **Phantom Rendering**: Estabilização de renderização de bitmaps no Android, evitando cortes de interface.
- **HUD Social Integrado**: Chat, Perfis e Likes acessíveis diretamente via gaveta (Drawer) no mapa, sem trocas de tela desnecessárias.

### 🎮 Gamificação Realtime
- **Sistema de Quests**: Missões dinâmicas que recompensam a exploração física.
- **Progressão de RPG**: Ganhe XP, suba de nível e colete moedas para personalizar seu pet.
- **Itens & Mochila**: Gerenciamento de inventário com interface moderna e feedback tátil (Haptics).

### 🤝 Conexão Social
- **Teia Wander**: Gráfico social de recomendações para encontrar novos amigos próximos.
- **Clãs (Grupos)**: Crie ou junte-se a grupos com proteção por senha e chat exclusivo.
- **Inbox Centralizado**: Sistema de mensagens diretas rápido e confiável via Supabase Realtime.

---

## 🏗️ Arquitetura Tecnológica

### 🎨 Frontend (React Native + Expo)
- **Engine**: Expo SDK 54 com suporte a React Fabric.
- **Mapa**: `react-native-maps` (Google Maps Engine) com patches de estabilização para Android.
- **Estilização**: Vanilla CSS-in-JS para máxima flexibilidade e performance visual.
- **Animações**: Interpoladores de coordenadas nativos para movimentos fluidos.

### ☁️ Backend (Supabase)
- **Auth**: Autenticação segura com suporte a verificação em duas etapas (2FA).
- **Realtime DB**: PostgreSQL + Realtime para sincronização instantânea de posições GPS e mensagens.
- **Storage**: Armazenamento em nuvem para avatares de usuários e fotos de perfil.
- **Edge Functions**: Lógica de backend escalável e segura.

---

## 🛠️ Guia de Instalação (Rápido)

### 1. Clonar e Instalar
```bash
git clone https://github.com/gustavogarciacavalli-sudo/pet-map-app.git
cd pet-map-app
npm install
```

### 2. Configuração
1. Configure as credenciais do Supabase em `services/supabaseConfig.ts`.
2. Execute o script `supabase_setup.sql` no SQL Editor do seu dashboard Supabase.

### 3. Executar
```bash
# Iniciar com Expo Go (Recomendado)
npx expo start -c

# Iniciar Android Nativo
npx react-native run-android
```

---

## 🌿 Workflow de Colaboração (Git Flow)

Seguimos um padrão rigoroso para garantir a integridade do código:

- **Branch de Desenvolvimento**: `develop` (Base para todas as novas features).
- **Branch de Feature**: `feature/nome-da-tarefa` (Sempre criada a partir da `develop`).
- **Commits Semânticos**: Ex: `feat: add liquid markers`, `fix: android map clipping`.

### Ciclo de Contribuição:
1. `git checkout develop` && `git pull`
2. `git checkout -b feature/sua-feature`
3. Codifique e realize commits granulares.
4. `git push origin feature/sua-feature`
5. Abra um **Pull Request** para a `develop`.

---

## 📋 Roadmap de Verificação (Status Atual)

- [x] **Integração Social no Mapa**: Chat e Perfis unificados no HUD.
- [x] **Estabilização Phantom**: Correção de clipping de marcadores no Android.
- [x] **Animações Liquid**: Efeito de "merge" orgânico nos markers.
- [ ] **Teia Wander**: Expansão do algoritmo de recomendações.
- [ ] **Inbox 2.0**: Refinamento da persistência de mensagens offline.
- [ ] **Sistema de Notificações**: Implementação final dos push tokens.

---

## ⚙️ Esquema de Banco de Dados (Resumo)

O WanderPet utiliza um esquema relacional robusto. Para ver o script completo, acesse [supabase_setup.sql](./supabase_setup.sql).

```sql
-- Exemplo: Estrutura de Perfis
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  wander_id TEXT UNIQUE,
  avatar TEXT,
  coins INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0
);
```

---
*Desenvolvido com ❤️ pela equipe WanderPet. Transformando cada passo em uma nova aventura.*

