# Plano de Implementação: Agentes de IA na Verificação de URLs Maliciosas

## 1. Arquitetura e Escolha do Modelo
Para este projeto, recomenda-se a utilização de um modelo de linguagem mais leve e menos complexo (como uma arquitetura de **20B parâmetros**). O foco principal da solução deve ser a **eficiência computacional e a velocidade de resposta** na classificação de dados, dispensando a necessidade de geração de textos longos ou buscas externas de fontes para responder a perguntas abertas.

## 2. Fluxo de Acionamento e Identificação de Padrões
* **Acionamento Sob Demanda:** A análise por Inteligência Artificial não ficará ativa continuamente em segundo plano. A interface contará com um botão específico para que o usuário solicite a leitura das URLs apenas quando julgar necessário.
* **Aprendizado de Padrões (Whitelist/Blacklist):** Ao processar as URLs, a IA terá como objetivo identificar padrões estruturais e semânticos. Isso permitirá que análises futuras (inclusive em outros domínios) ignorem automaticamente URLs que já foram confirmadas como não pertencentes ou não relevantes ao Estado de Mato Grosso do Sul (MS), otimizando o processamento.

## 3. Tratamento de Falsos Positivos (Tabela "Malicioso")
É necessário avaliar criteriosamente o envio da tabela `malicioso` para a análise do agente de IA, devido ao alto risco de **falsos positivos**. 

* **O Problema:** Termos isolados frequentemente associados a conteúdos maliciosos podem aparecer em publicações legítimas do próprio governo. *Exemplo:* Uma notícia oficial sobre a apreensão de um caminhão carregado de entorpecentes pode conter a palavra "drogas" e acabar sendo classificada erroneamente como maliciosa.
* **A Solução:** Refinar os critérios de filtragem definindo termos ou expressões que o Governo do MS jamais utilizaria ou citaria em seus canais oficiais (como referências a sites sensacionalistas específicos, a exemplo do "Portal Zacarias"), garantindo que a IA foque apenas em desvios reais de contexto.

## 4. Base Tecnológica e Aproveitamento de Código
A estrutura de integração com o agente de IA será construída utilizando o projeto **`poc-llm`** como referência principal:

* **Contexto via Documentação:** Para acelerar o desenvolvimento sem a necessidade de auditar todo o código-fonte, serão utilizados prioritariamente os arquivos `.md` (documentação) do `poc-llm` como base de contexto.
* **Escopo de Reaproveitamento:** Apenas a estrutura de *backend* será aproveitada. Não haverá necessidade de implementar uma base de conhecimento complexa (como RAG); a adaptação consistirá basicamente na atualização dos prompts e dos termos identificados como padrões de URLs maliciosas.

* **Caminho para poc-llm:** C:\Users\apecin\poc-llm\poc-llm
