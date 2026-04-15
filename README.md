# WanderPet 🐾 - Social Pet Adventure

WanderPet é um aplicativo de aventura social onde você explora o mundo real com seu pet, descobre outros exploradores e se une a clãs! Agora com **Motor 3D imersivo e Sincronização em Tempo Real via Supabase!** 🔥

---

## 🚀 Status do Projeto
O sistema foi recentemente migrado para o **Supabase** (Backend-as-a-Service), garantindo persistência na nuvem e recursos em tempo real para as abas Sociais, Clãs, Mensagens e o novo **Console de Ação**.

---

## 🏗️ Configuração do Banco de Dados (Supabase)

Para o pleno funcionamento do app, execute o seguinte esquema SQL no seu Editor SQL do Supabase:

```sql
-- 1. Tabela de Perfis (Extensão de Auth.Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  wander_id TEXT UNIQUE,
  avatar TEXT,
  species TEXT DEFAULT 'bunny',
  coins INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  claimed_quests TEXT[] DEFAULT '{}'::TEXT[]
);

-- 2. Sistema de Clãs (Grupos)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  password TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  UNIQUE(group_id, user_id)
);

-- 3. Sistema Social (Amizades e Mensagens)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id1 UUID REFERENCES public.profiles ON DELETE CASCADE,
  user_id2 UUID REFERENCES public.profiles ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' ou 'accepted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles,
  group_id UUID REFERENCES public.groups ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.social_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  target_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  UNIQUE(user_id, target_id)
);

-- 4. Localização e Infra 3D
CREATE TABLE public.locations (
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE PRIMARY KEY,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ghost_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.expeditions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  distance DOUBLE PRECISION,
  path JSONB,
  duration_minutes INTEGER,
  date DATE DEFAULT timezone('utc'::text, now())::date
);
```

---

## 🕹️ Funcionalidades de Gameplay

### 🗺️ Motor 3D (MapLibre + MapTiler)
- **Câmera Inclinada**: Perspectiva 3D imersiva (pitch 60°) estilo RPG moderno.
- **Interpolação Suave**: Marcadores se movem de forma fluida via Reanimated 3.
- **Heading Sync**: O mapa rotaciona dinamicamente com a orientação do dispositivo.

### 🏗️ Console de Ação (Ações Ativas)
A gaveta inferior oferece ferramentas essenciais para sua jornada:
- **Modo Sincronia**: Ganhe +50% de bônus em XP/Moedas ao sincronizar com amigos próximos (raio de 1km).
- **Mochila**: Consumo de itens (Maçãs, Poções, Carne) para bônus de energia, XP ou felicidade.
- **Radar de Tesouros**: Fareje baús e gemas escondidos no mapa (cooldown de 10 min).

### 📡 Sincronização Real-time
- **Broadcast**: Sua posição é transmitida instantaneamente para seu círculo social.
- **Interação**: Veja amigos no mapa, aceite convites de sincronia e envie SOS.

---

## 🚀 Atalhos de Dev
- **Acesso Dev**: Na tela de Login, use o botão "Acesso Dev Rapidão 🚀" para pular autenticações durante testes.
- **Seeding**: Botão dinâmico para povoar o mapa com Bots de teste (Luna, Rex, Miau).

---

## 🛠️ Tech Stack
- **Framework**: Expo (SDK 54+)
- **Backend**: Supabase (Postgres + Realtime)
- **Mapas**: MapLibre GL
- **Animações**: React Native Reanimated 3
- **Design**: Vanilla CSS-in-JS (Premium Aesthetics)

## 👩‍💻 Como Rodar
1. `npm install`
2. Configure as chaves do Supabase no arquivo `services/supabaseConfig.ts`
3. `npx expo start`

---
*Desenvolvido com ❤️ pela equipe WanderPet.*
