-- SCRIPT DE CONFIGURAÇÃO DO WANDERPET (SUPABASE)
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em 'RUN'.

-- 1. Tabela de Expedições (Histórico de Caminhadas)
CREATE TABLE IF NOT EXISTS public.expeditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    distance FLOAT NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    path JSONB DEFAULT '[]'::jsonb,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indice para buscas por data
CREATE INDEX IF NOT EXISTS idx_expeditions_user_date ON public.expeditions(user_id, date);

-- 2. Tabela de Localizações (Mapa em Tempo Real)
CREATE TABLE IF NOT EXISTS public.locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    ghost_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Likes Sociais
CREATE TABLE IF NOT EXISTS public.social_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- 4. Tabela de Mensagens (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR REALTIME (Opcional, mas recomendado para o mapa e chat)
-- Execute estas linhas se quiser habilitar o broadcast nativo nessas tabelas
-- ALTER PUBLICATION supabase_realtime ADD TABLE locations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 5. Atualização da Tabela de Perfis (Campos Adicionais)
-- Execute estas linhas para garantir que os campos de configuração existam
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_saver BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
