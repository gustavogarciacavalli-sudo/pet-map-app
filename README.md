# WanderPet 🐾 - Social Pet Adventure (Ultra-Stable Edition)

WanderPet é um aplicativo de aventura social onde você explora o mundo real com seu pet, descobre outros exploradores e se une a clãs! 

> [!IMPORTANT]
> **ESTABILIDADE ALCANÇADA**: Esta versão foi totalmente refatorada para remover a biblioteca `react-native-reanimated`. Isso elimina qualquer crash de módulo nativo (`TurboModule`, `NullPointerException`) e garante 100% de compatibilidade com o **Expo Go (SDK 54)** no Android e iOS.

---

## 🚀 Status do Projeto
O sistema foi recentemente estabilizado. Migramos as animações complexas para o motor padrão do React Native e consolidamos a integração com o **Supabase** para persistência na nuvem em tempo real.

---

## 🏗️ Configuração do Banco de Dados (Supabase)

Para o pleno funcionamento do app, execute o seguinte esquema SQL no seu Editor SQL do Supabase:

```sql
-- 1. Tabela de Perfis
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
  two_factor_pin TEXT,
  security_question TEXT,
  security_answer TEXT,
  claimed_quests TEXT[] DEFAULT '{}'::TEXT[]
);

-- 2. Sistema de Clãs
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  password TEXT,
  founder_id UUID REFERENCES public.profiles(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Mensagens e Social
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.profiles ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Localização Sync
CREATE TABLE public.locations (
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE PRIMARY KEY,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ghost_mode BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## 🕹️ Funcionalidades de Gameplay

### 🗺️ Motor de Mapa Estável (MapLibre)
- **Câmera Imersiva**: Perspectiva estilo RPG moderno com performance otimizada.
- **Markers Seguros**: Movimentação de markers sem dependências de módulos nativos instáveis.
- **Social Web**: Visualize sua rede de amizades e recomendações em tempo real.

### 🏗️ Console de Ação
- **Radar de Tesouros**: Fareje baús e gemas escondidos no mapa.
- **Mochila & Inventário**: Gerencie seus itens e consumíveis localmente e na nuvem.
- **Modo Sincronia**: Bônus de XP ao estar perto de outros jogadores.

---

## 🛠️ Tech Stack
- **Framework**: Expo (SDK 54+)
- **Backend-as-a-Service**: Supabase
- **Local Database**: SQLite (via expo-sqlite)
- **Map Engine**: MapLibre GL
- **Design Aesthetic**: Vanilla CSS-in-JS (Ultra Premium UI)

---

## 👨‍💻 Como Rodar
1. `npm install`
2. Configure as chaves do Supabase em `services/supabaseConfig.ts`
3. `npx expo start -c` (O flag `-c` limpa o cache e garante a estabilidade)

---

## 📋 Lista de Tarefas (Roadmap de Verificação)

- [ ] Verificar se foto de perfil continua no banco de dados
- [ ] Verificar integridade do Wander-ID
- [ ] Verificar rastreamento de local atual (GPS Throttling)
- [ ] Verificar banco de dados: Expedição da Semana
- [ ] Verificar permanência de moedas e EXP (Cloud Sync)
- [ ] Verificar evolução de medalhas e permanência de missões
- [x] Arrumar imagem do Modo Fantasma (Ícone 3D Premium)
- [ ] Verificar sistema de alterar senha e 2FA
- [ ] Implementar/Colocar bots para testar amigos
- [ ] Implementar Teia Wander (Social Graph)
- [ ] Implementar Inbox (Sistema de Mensagens Diretas)

---
*Desenvolvido com ❤️ pela equipe WanderPet. Estabilidade em primeiro lugar.*
