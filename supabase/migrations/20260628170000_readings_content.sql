-- Leituras — extracção de conteúdo (leitor integrado, estilo Instapaper).
--
-- Guarda o conteúdo legível extraído (Readability) e os metadados derivados do
-- artigo, para que o leitor não tenha de fazer fetch da página a cada abertura.
-- Todas as colunas são nullable e aditivas — leituras sem URL (capturas a
-- partir de respostas de IA) e linhas existentes mantêm-se válidas.

alter table public.readings add column if not exists content           text;
alter table public.readings add column if not exists excerpt           text;
alter table public.readings add column if not exists thumbnail          text;
alter table public.readings add column if not exists read_time_minutes  integer;
alter table public.readings add column if not exists author             text;
alter table public.readings add column if not exists site_name          text;
