# WanderPet 🐾 - Social Pet Adventure

WanderPet é um aplicativo de aventura social onde você explora o mundo real com seu pet, descobre outros exploradores e se une a clãs!

## 🚀 Status do Projeto
O sistema foi recentemente migrado para o **Supabase** (Backend-as-a-Service), garantindo persistência na nuvem e recursos em tempo real.

---

## 🏗️ Configuração do Banco de Dados (Supabase)

Para o pleno funcionamento das abas Sociais, Clãs e Mensagens, execute o seguinte esquema SQL no seu Editor SQL do Supabase:

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
  recipient_id UUID REFERENCES public.profiles (Opcional se for grupo),
  group_id UUID REFERENCES public.groups ON DELETE CASCADE (Opcional se for DM),
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.social_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  target_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  UNIQUE(user_id, target_id)
);
```

---

## 📋 Lista de Tarefas (TODO)

Abaixo estão os pontos identificados para as próximas iterações:

- [ ] **Visuais**: Verificar renderização inconsistente das imagens de alguns bots em dispositivos específicos.
- [ ] **Clãs**: Melhorar a atualização automática da lista "Meus Clãs" sem necessidade de reload manual.
- [ ] **Mensagens**: Implementar sistema de notificações (Push) para novas mensagens.
- [ ] **Like**: Adicionar efeito visual de 'Coração' ao curtir alguém na tela principal.
- [ ] **Performance**: Corrigir erro intermitente de `Uncaught error` ao navegar rapidamente pela aba Recomendados.
- [ ] **UX**: Refinar o layout do Card de Perfil para evitar cortes em telas pequenas.

---

## 🛠️ Tecnologias
- **Frontend**: React Native / Expo
- **Linguagem**: TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Design**: Vanilla CSS-in-JS (Premium Aesthetics)

## 👩‍💻 Como Rodar
1. `npm install`
2. Configure as variáveis do Supabase no `services/supabaseConfig.ts`
3. `npm run dev` ou `npx expo start`
